const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Bill = require('../models/Bill');
const TestResult = require('../models/TestResult');
const Attachment = require('../models/Attachment');
const Counter = require('../models/Counter');
const { broadcast } = require('../websocket');

// ── Patient Search ─────────────────────────────────────────────────
exports.searchPatients = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json([]);

    const query = q.trim();
    const clinicId = req.clinicId;

    // Detect search type
    const isPhone  = /^\d{2,}$/.test(query);            // 2+ pure digits → treat as phone
    const isId     = /^[A-Za-z]{2,}\d+$/i.test(query);  // letters then digits → patientId

    let patients = [];

    if (isPhone) {
      // Phone: contains match — even 2 digits will find matching patients
      patients = await Patient.find({ phone: { $regex: query }, clinicId }).limit(15).lean();
    } else if (isId) {
      // Patient ID: prefix match
      patients = await Patient.find({
        patientId: { $regex: `^${query}`, $options: 'i' },
        clinicId
      }).limit(10).lean();
    } else {
      // Name: fuzzy contains match
      patients = await Patient.find({
        name: { $regex: query, $options: 'i' },
        clinicId
      }).limit(15).lean();
    }

    // Attach latest appointment info for each patient
    const results = await Promise.all(patients.map(async (p) => {
      const latestAppt = await Appointment.findOne({ patient: p._id, clinicId })
        .sort({ date: -1 })
        .select('date status doctorName service')
        .lean();
      return {
        ...p,
        latestAppointment: latestAppt || null,
        matchType: isPhone ? 'phone' : isId ? 'id' : 'name'
      };
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error searching patients', error: error.message });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    if (req.body.dob === '') {
      req.body.dob = null;
    }

    const patient = await Patient.findByIdAndUpdate(patientId, req.body, { new: true });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Error updating patient', error: error.message });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const { date, status, doctorName, patientId } = req.query;
    let query = { clinicId: req.clinicId };
    
    if (patientId) {
      const patient = await Patient.findOne({ patientId, clinicId: req.clinicId });
      if (patient) query.patient = patient._id;
    }
    
    if (date) {
      // Basic date matching (ignoring time)
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }
    if (status && status !== 'ALL') query.status = status;
    if (doctorName) query.doctorName = doctorName;

    const appointments = await Appointment.find(query).populate('patient').sort({ date: 1, time: 1 }).lean();
    
    // Attach past visit stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointmentsWithStats = await Promise.all(appointments.map(async (app) => {
      if (!app.patient) return { ...app, pastVisitsCount: 0, recentVisitDate: null, billSummary: null };
      
      const pastVisits = await Appointment.find({ 
        patient: app.patient._id, 
        createdAt: { $lt: app.createdAt },
        clinicId: req.clinicId 
      }).sort({ createdAt: -1 }).select('date createdAt').lean();

      // Attach bill summary for this appointment's patient
      const patientBills = await Bill.find({ patient: app.patient._id, clinicId: req.clinicId }).lean();
      let billSummary = null;
      if (patientBills.length > 0) {
        const totalFinal    = patientBills.reduce((s, b) => s + (b.finalAmount || 0), 0);
        const totalReceived = patientBills.reduce((s, b) => s + (b.receivedAmount || 0), 0);
        const totalBalance  = patientBills.reduce((s, b) => s + (b.totalBalance || 0), 0);
        billSummary = {
          finalAmount: totalFinal,
          receivedAmount: totalReceived,
          totalBalance: totalBalance,
          billStatus: totalBalance <= 0 ? 'Paid' : totalReceived > 0 ? 'Partial' : 'Unpaid'
        };
      }

      return {
        ...app,
        pastVisitsCount: pastVisits.length,
        recentVisitDate: pastVisits.length > 0 ? pastVisits[0].date : null,
        billSummary
      };
    }));

    res.json(appointmentsWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointments', error: error.message });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const { 
      patientName, doctorName, service, status, time, duration, date, skipBilling, billingDetails,
      designation, age, gender, phone, address, city, pin, dob, bloodGroup
    } = req.body;

    // ── Find or create patient ───────────────────────────────────────
    // Match by phone first (most reliable), then fall back to name
    let patient = phone
      ? await Patient.findOne({ phone, clinicId: req.clinicId })
      : await Patient.findOne({ name: patientName, clinicId: req.clinicId });

    if (!patient) {
      // Generate the next sequential ASR ID
      const newId = await Counter.nextId();
      patient = await Patient.create({
        userId: req.user._id,
        clinicId: req.clinicId,
        patientId: newId,
        designation: designation || 'Mr',
        name: patientName,
        age: age ? Number(age) : 30,
        gender: gender || 'Other',
        bloodGroup: bloodGroup || '',
        phone: phone || '',
        address: address || '',
        city: city || '',
        pin: pin || '',
        dob: dob || null
      });
    }

    // ── Guard: prevent duplicate appointment for same patient at same date+time ──
    const appointmentDate = new Date(date);
    const startOfDay = new Date(appointmentDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(appointmentDate); endOfDay.setHours(23, 59, 59, 999);
    const existing = await Appointment.findOne({
      patient: patient._id,
      clinicId: req.clinicId,
      date: { $gte: startOfDay, $lte: endOfDay },
      time,
    });
    if (existing) {
      return res.status(409).json({ message: `This patient already has an appointment at ${time} on this date.` });
    }

    const appointment = await Appointment.create({
      userId: req.user._id,
      clinicId: req.clinicId,
      patient: patient._id,
      uhid: patient.patientId,   // carry the patient's ASR ID on the appointment
      doctorName,
      service,
      status,
      date: new Date(date),
      time,
      duration
    });

    if (!skipBilling && billingDetails) {
      const uPrice = billingDetails.unitPrice || 0;
      const qty = billingDetails.qty || 1;
      const baseAmt = uPrice * qty;
      const discPct = billingDetails.discount || 0;
      const taxPct = billingDetails.tax || 0;
      const discAmt = (baseAmt * discPct) / 100;
      const taxAmt = ((baseAmt - discAmt) * taxPct) / 100;
      
      await Bill.create({
        userId: req.user._id,
        clinicId: req.clinicId,
        appointment: appointment._id,
        patient: patient._id,
        items: [{
          serviceName: service,
          qty: qty,
          unitPrice: uPrice,
          gstPercent: taxPct,
          discount: discAmt,
          totalPrice: billingDetails.netPrice || 0
        }],
        totalBilledAmount: baseAmt,
        totalDiscount: discAmt,
        totalTax: taxAmt,
        finalAmount: billingDetails.netPrice || 0,
        totalBalance: billingDetails.netPrice || 0
      });
      appointment.billingStatus = 'UNPAID';
      await appointment.save();
    }

    const populated = await Appointment.findById(appointment._id).populate('patient').lean();
    broadcast('APPOINTMENT_CREATED', populated);
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Error creating appointment', error: error.message });
  }
};

exports.getBills = async (req, res) => {
  try {
    const { appointmentId, patientId } = req.query;
    let query = { clinicId: req.clinicId };
    if (appointmentId) query.appointment = appointmentId;
    if (patientId) {
      const patient = await Patient.findOne({ patientId, clinicId: req.clinicId });
      if (patient) query.patient = patient._id;
    }
    const bills = await Bill.find(query).populate('patient').sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bills', error: error.message });
  }
};

exports.createBill = async (req, res) => {
  try {
    const { patientId, items, billDate, depositAmount, notes, discountType, discountValue } = req.body;
    const patient = await Patient.findOne({ patientId, clinicId: req.clinicId });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Calculate totals
    let totalBilledAmount = 0;
    let totalDiscount    = 0;
    let totalTax         = 0;
    const processedItems = (items || []).map(item => {
      const unitPrice   = parseFloat(item.unitPrice) || 0;
      const qty         = parseInt(item.qty)          || 1;
      const gst         = parseFloat(item.gstPercent) || 0;
      const discAmt     = parseFloat(item.discount)   || 0;
      const lineTotal   = unitPrice * qty;
      const taxAmt      = parseFloat(((lineTotal - discAmt) * gst / 100).toFixed(2));
      const total       = parseFloat((lineTotal - discAmt + taxAmt).toFixed(2));
      totalBilledAmount += lineTotal;
      totalDiscount     += discAmt;
      totalTax          += taxAmt;
      return { ...item, unitPrice, qty, gstPercent: gst, discount: discAmt, totalPrice: total };
    });

    // Apply overall discount
    let extraDiscount = 0;
    if (discountType === 'percent') extraDiscount = parseFloat(((totalBilledAmount - totalDiscount) * parseFloat(discountValue||0) / 100).toFixed(2));
    else if (discountType === 'flat')    extraDiscount = parseFloat(discountValue||0);
    totalDiscount += extraDiscount;

    const finalAmount  = parseFloat(Math.max(0, totalBilledAmount - totalDiscount + totalTax).toFixed(2));
    const totalBalance = parseFloat(Math.max(0, finalAmount - parseFloat(depositAmount||0)).toFixed(2));

    const bill = await Bill.create({
      userId: req.user._id,
      clinicId: req.clinicId,
      patient: patient._id,
      billDate: billDate ? new Date(billDate) : new Date(),
      items: processedItems,
      depositAmount: parseFloat(depositAmount||0),
      totalBilledAmount, totalDiscount, totalTax,
      finalAmount, totalBalance,
      receivedAmount: parseFloat(depositAmount||0),
    });

    const createdBill = await Bill.findById(bill._id).populate('patient');
    broadcast('BILL_CREATED', { patientId });
    res.status(201).json(createdBill);
  } catch (error) {
    res.status(500).json({ message: 'Error creating bill', error: error.message });
  }
};

exports.updateBill = async (req, res) => {
  try {
    const { billId } = req.params;
    const { items, billDate, depositAmount, discountType, discountValue } = req.body;
    const bill = await Bill.findOne({ _id: billId, clinicId: req.clinicId });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    let totalBilledAmount = 0, totalDiscount = 0, totalTax = 0;
    bill.items = (items || []).map(item => {
      const unitPrice = parseFloat(item.unitPrice)||0;
      const qty       = parseInt(item.qty)||1;
      const gst       = parseFloat(item.gstPercent)||0;
      const discAmt   = parseFloat(item.discount)||0;
      const lineTotal = unitPrice * qty;
      const taxAmt    = parseFloat(((lineTotal-discAmt)*gst/100).toFixed(2));
      const total     = parseFloat((lineTotal-discAmt+taxAmt).toFixed(2));
      totalBilledAmount += lineTotal;
      totalDiscount     += discAmt;
      totalTax          += taxAmt;
      return { ...item, unitPrice, qty, gstPercent: gst, discount: discAmt, totalPrice: total };
    });

    let extraDiscount = 0;
    if (discountType==='percent') extraDiscount = parseFloat(((totalBilledAmount-totalDiscount)*parseFloat(discountValue||0)/100).toFixed(2));
    else if (discountType==='flat') extraDiscount = parseFloat(discountValue||0);
    totalDiscount += extraDiscount;

    bill.billDate           = billDate ? new Date(billDate) : bill.billDate;
    bill.depositAmount      = parseFloat(depositAmount||0);
    bill.totalBilledAmount  = totalBilledAmount;
    bill.totalDiscount      = totalDiscount;
    bill.totalTax           = totalTax;
    bill.finalAmount        = parseFloat(Math.max(0,totalBilledAmount-totalDiscount+totalTax).toFixed(2));
    bill.totalBalance       = parseFloat(Math.max(0,bill.finalAmount-bill.receivedAmount).toFixed(2));
    await bill.save();
    const updatedBill = await Bill.findById(bill._id).populate('patient');
    broadcast('BILL_UPDATED', { billId });
    res.json(updatedBill);
  } catch (error) {
    res.status(500).json({ message: 'Error updating bill', error: error.message });
  }
};

exports.payBill = async (req, res) => {
  try {
    const { billId } = req.params;
    const { amount, paymentMode, purpose } = req.body;
    
    const bill = await Bill.findOne({ _id: billId, clinicId: req.clinicId });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    // Record this payment entry in history
    bill.payments = bill.payments || [];
    bill.payments.push({ amount, paymentMode: paymentMode || 'CASH', purpose: purpose || '', paidAt: new Date() });
    bill.receivedAmount = bill.payments.reduce((s, p) => s + p.amount, 0);
    bill.totalBalance = parseFloat(Math.max(0, bill.finalAmount - bill.receivedAmount).toFixed(2));
    bill.paymentMode = paymentMode || bill.paymentMode;
    await bill.save();

    const paidBill = await Bill.findById(bill._id).populate('patient');
    broadcast('BILL_UPDATED', { billId });
    res.json(paidBill);
  } catch (error) {
    res.status(500).json({ message: 'Error paying bill', error: error.message });
  }
};

exports.updateVitals = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { vitals } = req.body;
    
    const appointment = await Appointment.findOne({ _id: appointmentId, clinicId: req.clinicId });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    appointment.vitals = vitals;
    await appointment.save();

    broadcast('VITALS_UPDATED', { appointmentId, vitals });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Error saving vitals', error: error.message });
  }
};

exports.saveTestResults = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { tests } = req.body;
    
    const appointment = await Appointment.findOne({ _id: appointmentId, clinicId: req.clinicId });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    let testResult = await TestResult.findOne({ appointment: appointmentId, userId: req.user._id });
    if (!testResult) {
      testResult = new TestResult({
        userId: req.user._id,
        appointment: appointmentId,
        patient: appointment.patient,
        tests: tests
      });
    } else {
      // Merge new tests with existing tests or replace?
      // Replacing the whole list for simplicity of editing
      testResult.tests = tests;
    }
    await testResult.save();

    broadcast('TEST_RESULTS_SAVED', { appointmentId });
    res.json(testResult);
  } catch (error) {
    res.status(500).json({ message: 'Error saving test results', error: error.message });
  }
};

exports.getTestResults = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const testResult = await TestResult.findOne({ appointment: appointmentId, userId: req.user._id });
    res.json(testResult || { tests: [] });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching test results', error: error.message });
  }
};

exports.uploadAttachment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findOne({ _id: appointmentId, clinicId: req.clinicId });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Convert buffer to base64 data URL (works on all deployments — no disk required)
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'application/octet-stream';
    const fileUrl = `data:${mimeType};base64,${base64}`;

    const attachment = new Attachment({
      userId: req.user._id,
      appointment: appointmentId,
      patient: appointment.patient,
      fileName: req.file.originalname,
      fileUrl: fileUrl
    });
    
    await attachment.save();
    broadcast('ATTACHMENT_UPLOADED', { appointmentId });
    res.status(201).json(attachment);
  } catch (error) {
    res.status(500).json({ message: 'Error uploading attachment', error: error.message });
  }
};

exports.getAttachments = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const attachments = await Attachment.find({ appointment: appointmentId, userId: req.user._id }).sort({ uploadedAt: -1 });
    res.json(attachments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attachments', error: error.message });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;
    
    const appointment = await Appointment.findOne({ _id: appointmentId, clinicId: req.clinicId });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    appointment.status = status;
    await appointment.save();

    broadcast('APPOINTMENT_STATUS_CHANGED', { appointmentId, status });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Error updating status', error: error.message });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { doctorName, service, status, time, duration, date } = req.body;

    const appointment = await Appointment.findOne({ _id: appointmentId, clinicId: req.clinicId });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (doctorName !== undefined) appointment.doctorName = doctorName;
    if (service    !== undefined) appointment.service    = service;
    if (status     !== undefined) appointment.status     = status;
    if (time       !== undefined) appointment.time       = time;
    if (duration   !== undefined) appointment.duration   = duration;
    if (date       !== undefined) appointment.date       = new Date(date);

    await appointment.save();

    const populated = await Appointment.findById(appointment._id).populate('patient').lean();
    broadcast('APPOINTMENT_UPDATED', populated);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating appointment', error: error.message });
  }
};

