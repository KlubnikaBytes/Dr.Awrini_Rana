const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Bill = require('../models/Bill');
const TestResult = require('../models/TestResult');
const Attachment = require('../models/Attachment');
const Counter = require('../models/Counter');
const LabOrder = require('../models/LabOrder');
const DayCare = require('../models/DayCare');
const HomeCare = require('../models/HomeCare');
const { findOrCreatePatient } = require('../utils/patientUtils');
const { broadcast } = require('../websocket');

// ── Patient Search ─────────────────────────────────────────────────
exports.searchPatients = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json([]);

    const query  = q.trim();
    const mongoose = require('mongoose');
    const clinicId = req.clinicId;

    // Only add clinicId to filter if it's a valid ObjectId string
    const clinicFilter = clinicId && mongoose.isValidObjectId(clinicId)
      ? { clinicId }
      : {};

    const isPhone = /^\d{2,}$/.test(query);

    // Escape special regex chars
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let patients = [];

    if (isPhone) {
      patients = await Patient.find({
        ...clinicFilter,
        phone: new RegExp(escaped)          // native RegExp — no cast issues
      }).limit(15).lean();
    } else {
      patients = await Patient.find({
        ...clinicFilter,
        $or: [
          { name:      new RegExp(escaped, 'i') },
          { patientId: new RegExp(`^${escaped}`, 'i') }
        ]
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
        latestAppointment: latestAppt || null
      };
    }));

    res.json(results);
  } catch (error) {
    console.error('[searchPatients]', error.message);
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
    
    // Broadcast so UI refreshes the patient data
    broadcast('PATIENT_UPDATED', patient);
    
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Error updating patient', error: error.message });
  }
};

exports.uploadPatientPhoto = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const fs = require('fs');
    const path = require('path');

    // Ensure the upload directory exists
    const uploadDir = path.join(__dirname, '..', 'uploads', 'patient-photos');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    // Write the buffer to disk
    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = `${patientId}-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    const relativePath = `uploads/patient-photos/${filename}`;

    const patient = await Patient.findByIdAndUpdate(patientId, { photo: relativePath }, { new: true });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    broadcast('PATIENT_UPDATED', patient);
    res.json({ photo: relativePath, patient });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading photo', error: error.message });
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
    
    if (appointments.length === 0) {
      return res.json([]);
    }

    const patientIds = [...new Set(appointments.filter(a => a.patient).map(a => a.patient._id.toString()))];
    const uhids = [...new Set(appointments.filter(a => a.patient && a.patient.patientId).map(a => a.patient.patientId))];

    // Batch fetch past visits
    const allPastVisits = await Appointment.find({
      patient: { $in: patientIds },
      clinicId: req.clinicId
    }).sort({ createdAt: -1 }).select('patient date createdAt').lean();

    const pastVisitsByPatient = {};
    allPastVisits.forEach(v => {
      const pId = v.patient.toString();
      if (!pastVisitsByPatient[pId]) pastVisitsByPatient[pId] = [];
      pastVisitsByPatient[pId].push(v);
    });

    // Batch fetch bills
    const allBills = await Bill.find({
      patient: { $in: patientIds },
      clinicId: req.clinicId
    }).lean();

    const billsByPatient = {};
    allBills.forEach(b => {
      const pId = b.patient.toString();
      if (!billsByPatient[pId]) billsByPatient[pId] = [];
      billsByPatient[pId].push(b);
    });

    // Calculate min/max dates for standalone orders
    let minDate = new Date();
    let maxDate = new Date(0);
    appointments.forEach(app => {
      if (app.date) {
        const d = new Date(app.date);
        const dStart = new Date(d.setHours(0,0,0,0));
        const dEnd = new Date(d.setHours(23,59,59,999));
        if (dStart < minDate) minDate = dStart;
        if (dEnd > maxDate) maxDate = dEnd;
      }
    });

    let allLabOrders = [];
    let allDayCares = [];
    let allHomeCares = [];

    if (uhids.length > 0) {
      allLabOrders = await LabOrder.find({
        uhid: { $in: uhids },
        orderedDate: { $gte: minDate, $lte: maxDate },
        clinicId: req.clinicId
      }).lean();

      allDayCares = await DayCare.find({
        uhid: { $in: uhids },
        admissionDate: { $gte: minDate, $lte: maxDate },
        clinicId: req.clinicId
      }).lean();

      allHomeCares = await HomeCare.find({
        uhid: { $in: uhids },
        startDate: { $gte: minDate, $lte: maxDate },
        clinicId: req.clinicId
      }).lean();
    }

    const appointmentsWithStats = appointments.map(app => {
      if (!app.patient) return { ...app, pastVisitsCount: 0, recentVisitDate: null, billSummary: null };
      
      const pId = app.patient._id.toString();
      const patientPastVisits = (pastVisitsByPatient[pId] || []).filter(v => new Date(v.createdAt) < new Date(app.createdAt));
      
      const patientBills = billsByPatient[pId] || [];
      let billSummary = null;
      if (patientBills.length > 0) {
        let apptConsultAmount = 0;
        let apptLabTestsCount = 0;
        let apptLabTestsAmount = 0;
        let apptDayCareAmount = 0;
        let apptHomeCareAmount = 0;
        
        const appDateStr = new Date(app.date).toISOString().split('T')[0];
        const sameDayBills = patientBills.filter(b => {
           if (b.appointment && b.appointment.toString() === app._id.toString()) return true;
           if (!b.appointment && b.billDate && new Date(b.billDate).toISOString().split('T')[0] === appDateStr) return true;
           if (!b.appointment && !b.billDate && new Date(b.createdAt).toISOString().split('T')[0] === appDateStr) return true;
           return false;
        });

        sameDayBills.forEach(apptBill => {
           if (apptBill.items) {
              apptBill.items.forEach(item => {
                 if (item.serviceType === 'Lab') { 
                   apptLabTestsCount += item.qty || 1; 
                   apptLabTestsAmount += item.totalPrice || 0; 
                 }
                 else if (item.serviceType === 'Day Care') { 
                   apptDayCareAmount += item.totalPrice || 0; 
                 }
                 else if (item.serviceType === 'Home Care') { 
                   apptHomeCareAmount += item.totalPrice || 0; 
                 }
                 else if (item.serviceType === 'Consultation' || !item.serviceType) {
                   apptConsultAmount += item.totalPrice || 0;
                 }
              });
           }
        });

        if (app.patient.patientId && app.date) {
          const appDateStart = new Date(app.date);
          appDateStart.setHours(0, 0, 0, 0);
          const appDateEnd = new Date(app.date);
          appDateEnd.setHours(23, 59, 59, 999);
        }

        const totalFinal    = sameDayBills.reduce((s, b) => s + (b.finalAmount || 0), 0);
        const totalReceived = sameDayBills.reduce((s, b) => s + (b.receivedAmount || 0), 0);
        const totalBalance  = sameDayBills.reduce((s, b) => s + (b.totalBalance || 0), 0);
        
        const pastDue = patientBills.reduce((s, b) => {
            if (!sameDayBills.includes(b)) {
                return s + (b.totalBalance || 0);
            }
            return s;
        }, 0);

        billSummary = {
          finalAmount: totalFinal,
          receivedAmount: totalReceived,
          totalBalance: totalBalance,
          pastDue: pastDue,
          billStatus: totalFinal === 0 ? 'No Bill' : (totalBalance <= 0 ? 'Paid' : totalReceived > 0 ? 'Partial' : 'Unpaid'),
          apptLabTestsCount,
          apptLabTestsAmount,
          apptDayCareAmount,
          apptHomeCareAmount,
          apptConsultAmount
        };
      }

      return {
        ...app,
        pastVisitsCount: patientPastVisits.length,
        recentVisitDate: patientPastVisits.length > 0 ? patientPastVisits[0].date : null,
        billSummary
      };
    });

    res.json(appointmentsWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointments', error: error.message });
  }
};

const spawnDepartmentRecords = async (req, clinicId, userId, patient, items, billStatus = 'Unbilled', billId = null) => {
  try {
    // Lab Order
    const labItems = items.filter(i => i.serviceType === 'Lab');
    if (labItems.length > 0) {
      await LabOrder.create({
        userId,
        clinicId,
        patientName: patient.name,
        patientAge: patient.age || '',
        patientGender: patient.gender || 'Other',
        patientPhone: patient.phone || '',
        patientEmail: patient.email || '',
        uhid: patient.patientId,
        orderedDate: new Date(),
        tests: labItems.map(item => ({
          category: 'Lab',
          name: item.serviceName,
          unitPrice: item.unitPrice || 0,
          qty: item.qty || 1,
          discount: item.discount || 0,
          tax: item.gstPercent || 0,
          totalPrice: item.totalPrice || 0
        })),
        status: 'Registered',
        totalBilledAmount: labItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0),
        finalAmount: labItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0),
        billStatus: billStatus
      });
      broadcast('LAB_ORDER_UPDATED', { clinicId });
    }

    // Day Care
    const dayCareItems = items.filter(i => i.serviceType === 'Day Care');
    for (const item of dayCareItems) {
      const dc = await DayCare.create({
        userId,
        clinicId,
        patientName: patient.name,
        patientAge: patient.age || '',
        patientGender: patient.gender || 'Other',
        patientPhone: patient.phone || '',
        patientEmail: patient.email || '',
        uhid: patient.patientId,
        admissionDate: new Date(),
        status: 'Admitted',
        totalBilledAmount: item.totalPrice || 0,
        finalAmount: item.totalPrice || 0,
        billStatus: billStatus,
        procedures: [{ name: item.serviceName, description: 'Billed via FrontDesk', performedAt: new Date(), performedBy: item.performedBy || '' }]
      });
      if (billId) await Bill.findByIdAndUpdate(billId, { dayCare: dc._id });
      broadcast('DAYCARE_UPDATED', { clinicId });
    }

    // Home Care
    const homeCareItems = items.filter(i => i.serviceType === 'Home Care');
    for (const item of homeCareItems) {
      const hc = await HomeCare.create({
        userId,
        clinicId,
        patientName: patient.name,
        patientAge: patient.age || '',
        patientGender: patient.gender || 'Other',
        patientPhone: patient.phone || '',
        patientEmail: patient.email || '',
        uhid: patient.patientId,
        serviceType: item.serviceName,
        startDate: new Date(),
        performerName: item.performedBy || 'Unassigned',
        status: 'Scheduled',
        totalBilledAmount: item.totalPrice || 0,
        finalAmount: item.totalPrice || 0,
        billStatus: billStatus
      });
      if (billId) await Bill.findByIdAndUpdate(billId, { homeCare: hc._id });
      broadcast('HOMECARE_UPDATED', { clinicId });
    }
  } catch (error) {
    console.error('Error spawning department records:', error);
  }
};


exports.createAppointment = async (req, res) => {
  try {
    const { 
      patientId, patientName, doctorName, serviceType, service, status, date, time, duration, skipBilling, billingDetails, queueNumber,
      designation, age, gender, phone, email, address, city, pin, dob, bloodGroup, referredByDoctor
    } = req.body;

    // ── Find or create patient ───────────────────────────────────────
    let patient = null;
    
    // 1. If explicit patientId was passed (e.g. selected from search)
    if (patientId) {
      patient = await Patient.findOne({ patientId, clinicId: req.clinicId });
    }

    if (!patient) {
      const pId = await findOrCreatePatient(req, { 
        phone, 
        name: patientName, 
        designation, 
        age, 
        gender, 
        bloodGroup, 
        email, 
        address, 
        city, 
        pin, 
        dob,
        referredByDoctor
      });
      patient = await Patient.findOne({ patientId: pId, clinicId: req.clinicId });
    }

    // ── Determine Queue Number ──
    const appointmentDate = new Date(date);
    const startOfDay = new Date(appointmentDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(appointmentDate); endOfDay.setHours(23, 59, 59, 999);

    let finalQueueNumber;
    let isPriority = false;

    if (queueNumber !== undefined && queueNumber !== null && queueNumber !== '') {
      finalQueueNumber = Number(queueNumber);
      isPriority = true;
    } else {
      const maxAppt = await Appointment.findOne({
        doctorName,
        clinicId: req.clinicId,
        date: { $gte: startOfDay, $lte: endOfDay }
      }).sort('-queueNumber');
      finalQueueNumber = maxAppt && maxAppt.queueNumber ? maxAppt.queueNumber + 1 : 1;
    }

    const appointment = await Appointment.create({
      userId: req.user._id,
      clinicId: req.clinicId,
      patient: patient._id,
      uhid: patient.patientId,   // carry the patient's ASR ID on the appointment
      doctorName,
      service,
      status,
      date: appointmentDate,
      time,
      duration,
      queueNumber: finalQueueNumber,
      isPriority
    });

    let spawnedItems = [];
    let billStatus = 'Unbilled';

    let createdBillId = null;
    if (!skipBilling && billingDetails) {
      const uPrice = billingDetails.unitPrice || 0;
      const qty = billingDetails.qty || 1;
      const baseAmt = uPrice * qty;
      const discPct = billingDetails.discount || 0;
      const taxPct = billingDetails.tax || 0;
      const discAmt = (baseAmt * discPct) / 100;
      const taxAmt = ((baseAmt - discAmt) * taxPct) / 100;
      
      const item = {
        serviceName: service,
        serviceType: serviceType || 'Other',
        qty: qty,
        unitPrice: uPrice,
        gstPercent: taxPct,
        discount: discAmt,
        totalPrice: billingDetails.netPrice || 0
      };

      spawnedItems = [item];
      billStatus = 'Unpaid';

      const createdBill = await Bill.create({
        userId: req.user._id,
        clinicId: req.clinicId,
        appointment: appointment._id,
        patient: patient._id,
        items: [item],
        totalBilledAmount: baseAmt,
        totalDiscount: discAmt,
        totalTax: taxAmt,
        finalAmount: billingDetails.netPrice || 0,
        totalBalance: billingDetails.netPrice || 0
      });
      createdBillId = createdBill._id;
      appointment.billingStatus = 'UNPAID';
      await appointment.save();
    } else {
      spawnedItems = [{
        serviceName: service,
        serviceType: serviceType || 'Other',
        qty: 1, unitPrice: 0, gstPercent: 0, discount: 0, totalPrice: 0
      }];
    }

    await spawnDepartmentRecords(req, req.clinicId, req.user._id, patient, spawnedItems, billStatus, createdBillId);


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

    const deposit = parseFloat(depositAmount || 0);
    const payments = [];
    if (deposit > 0) {
      payments.push({
        amount: deposit,
        paymentMode: 'CASH',
        purpose: 'Initial Deposit',
        paidAt: new Date()
      });
    }

    const bill = await Bill.create({
      userId: req.user._id,
      clinicId: req.clinicId,
      patient: patient._id,
      billDate: billDate ? new Date(billDate) : new Date(),
      items: processedItems,
      payments,
      depositAmount: deposit,
      totalBilledAmount, totalDiscount, totalTax,
      finalAmount, totalBalance,
      receivedAmount: deposit,
    });

    const createdBill = await Bill.findById(bill._id).populate('patient');
    
    // Spawn department registrations based on bill items
    const billStatus = totalBalance <= 0 ? 'Paid' : 'Partial';
    await spawnDepartmentRecords(req, req.clinicId, req.user._id, patient, processedItems, billStatus, bill._id);

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

    // Spawn records for newly added items
    const newItemsForSpawn = (items || []).filter(i => !i._id);
    if (newItemsForSpawn.length > 0) {
      const patient = await Patient.findById(bill.patient);
      if (patient) {
        const billStatus = bill.totalBalance <= 0 ? 'Paid' : 'Partial';
        await spawnDepartmentRecords(req, req.clinicId, req.user._id, patient, newItemsForSpawn, billStatus, bill._id);
      }
    }

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
    const validAmount = Number(amount) || 0;
    bill.payments.push({ amount: validAmount, paymentMode: paymentMode || 'CASH', purpose: purpose || '', paidAt: new Date() });
    bill.receivedAmount = bill.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const fAmount = Number(bill.finalAmount) || 0;
    bill.totalBalance = parseFloat(Math.max(0, fAmount - bill.receivedAmount).toFixed(2));
    bill.paymentMode = paymentMode || bill.paymentMode;
    await bill.save();

    const paidBill = await Bill.findById(bill._id).populate('patient');
    broadcast('BILL_UPDATED', { billId });
    res.json(paidBill);
  } catch (error) {
    res.status(500).json({ message: 'Error paying bill', error: error.message, stack: error.stack });
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
    const { doctorName, service, status, time, duration, date, queueNumber, patientName, age, gender, phone, email, bloodGroup, address, city, pin, dob } = req.body;

    const appointment = await Appointment.findOne({ _id: appointmentId, clinicId: req.clinicId }).populate('patient');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (doctorName !== undefined) appointment.doctorName = doctorName;
    if (service    !== undefined) appointment.service    = service;
    if (status     !== undefined) appointment.status     = status;
    if (time       !== undefined) appointment.time       = time;
    if (duration   !== undefined) appointment.duration   = duration;
    if (date       !== undefined) appointment.date       = new Date(date);
    if (queueNumber !== undefined) appointment.queueNumber = queueNumber;

    await appointment.save();

    if (appointment.patient) {
      const patient = appointment.patient;
      if (patientName !== undefined) patient.name = patientName;
      if (age !== undefined) patient.age = age;
      if (gender !== undefined) patient.gender = gender;
      if (phone !== undefined) patient.phone = phone;
      if (email !== undefined) patient.email = email;
      if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;
      if (address !== undefined) patient.address = address;
      if (city !== undefined) patient.city = city;
      if (pin !== undefined) patient.pin = pin;
      if (dob !== undefined) patient.dob = dob;
      await patient.save();
    }

    const populated = await Appointment.findById(appointment._id).populate('patient').lean();
    broadcast('APPOINTMENT_UPDATED', populated);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating appointment', error: error.message });
  }
};

exports.getUpcomingNotifications = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    threeDaysLater.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      clinicId: req.clinicId,
      service: 'Followup',
      date: { $gte: today, $lte: threeDaysLater },
      status: 'BOOKED'
    }).populate('patient').sort({ date: 1 }).lean();

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching upcoming notifications', error: error.message });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.billId, clinicId: req.clinicId });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    await Bill.findByIdAndDelete(bill._id);
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting bill', error: error.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.billId, clinicId: req.clinicId });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    const originalPaymentsLength = bill.payments.length;
    bill.payments = bill.payments.filter(p => p._id.toString() !== req.params.paymentId);
    if (bill.payments.length === originalPaymentsLength) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0) + (bill.depositAmount || 0);
    bill.receivedAmount = totalPaid;
    bill.totalBalance = Math.max(0, bill.finalAmount - totalPaid);
    await bill.save();
    res.json({ message: 'Payment deleted successfully', bill });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting payment', error: error.message });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findOne({ _id: appointmentId, clinicId: req.clinicId });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    
    const patientId = appointment.patient;
    
    // Delete appointment
    await Appointment.deleteOne({ _id: appointmentId });
    
    // Find and delete associated bills
    const bills = await Bill.find({ appointment: appointmentId });
    await Bill.deleteMany({ appointment: appointmentId });

    // Fetch patient early so we have uhid
    const patient = await Patient.findById(patientId);
    if (patient) {
        // Delete spawned department records matching the bills
        for (const bill of bills) {
            const dStart = new Date(bill.createdAt); dStart.setHours(0,0,0,0);
            const dEnd = new Date(bill.createdAt); dEnd.setHours(23,59,59,999);
            await LabOrder.deleteMany({ uhid: patient.patientId, orderedDate: { $gte: dStart, $lte: dEnd } });
            await DayCare.deleteMany({ uhid: patient.patientId, admissionDate: { $gte: dStart, $lte: dEnd } });
            await HomeCare.deleteMany({ uhid: patient.patientId, startDate: { $gte: dStart, $lte: dEnd } });
        }
    }

    // Check if patient has other appointments
    const otherAppointments = await Appointment.countDocuments({ patient: patientId });
    if (otherAppointments === 0) {
      // It was their only appointment, try to clean up patient
      const billsCount = await Bill.countDocuments({ patient: patientId });
      const labCount = await LabOrder.countDocuments({ patient: patientId });
      if (billsCount === 0 && labCount === 0) {
         await Patient.deleteOne({ _id: patientId });
           
           // Adjust counter if this was the very last patient created
           const patIdStr = patient.patientId || '';
           const match = patIdStr.match(/^([A-Z]+)0*(\d+)$/i);
           if (match) {
             const prefix = match[1].toLowerCase();
             const seqNum = parseInt(match[2], 10);
             const counterId = `global_${prefix}`;
             
             // Check if this seqNum is the current max
             const counter = await Counter.findById(counterId);
             if (counter && counter.seq === seqNum) {
               // Safely decrement
               counter.seq -= 1;
               await counter.save();
             }
           }
        }
      }
    
    // Also delete any bills linked specifically to this appointment
    await Bill.deleteMany({ appointment: appointmentId });
    
    broadcast('APPOINTMENT_UPDATED', { appointmentId, status: 'DELETED' });
    res.json({ message: 'Appointment and related data deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Error deleting appointment', error: error.message });
  }
};
