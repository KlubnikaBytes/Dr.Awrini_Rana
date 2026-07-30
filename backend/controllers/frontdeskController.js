const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Bill = require('../models/Bill');
const TestResult = require('../models/TestResult');
const Attachment = require('../models/Attachment');

exports.getAppointments = async (req, res) => {
  try {
    const { date, status, doctorName, patientId } = req.query;
    let query = { userId: req.user._id };
    
    if (patientId) {
      const patient = await Patient.findOne({ patientId, userId: req.user._id });
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

    const appointments = await Appointment.find(query).populate('patient').sort({ date: 1, time: 1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointments', error: error.message });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const { patientName, doctorName, service, status, time, duration, date, skipBilling, billingDetails } = req.body;

    // Create or find patient
    // For simplicity, we create a new one each time if we don't have an ID, but we should search by name
    let patient = await Patient.findOne({ name: patientName, userId: req.user._id });
    if (!patient) {
      const patientId = 'ASR' + Math.floor(1000 + Math.random() * 9000);
      patient = await Patient.create({
        userId: req.user._id,
        patientId,
        name: patientName,
        age: 30, // Mock age since it's not in the form
        gender: 'Other'
      });
    }

    const appointment = await Appointment.create({
      userId: req.user._id,
      patient: patient._id,
      doctorName,
      service,
      status,
      date: new Date(date),
      time,
      duration
    });

    if (!skipBilling && billingDetails) {
      await Bill.create({
        userId: req.user._id,
        appointment: appointment._id,
        patient: patient._id,
        items: [{
          serviceName: service,
          qty: billingDetails.qty || 1,
          unitPrice: billingDetails.unitPrice || 0,
          discount: billingDetails.discount || 0,
          totalPrice: billingDetails.netPrice || 0
        }],
        totalBilledAmount: billingDetails.unitPrice * (billingDetails.qty || 1),
        totalDiscount: billingDetails.discount || 0,
        finalAmount: billingDetails.netPrice || 0,
        totalBalance: billingDetails.netPrice || 0
      });
      appointment.billingStatus = 'UNPAID';
      await appointment.save();
    }

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Error creating appointment', error: error.message });
  }
};

exports.getBills = async (req, res) => {
  try {
    const { appointmentId, patientId } = req.query;
    let query = { userId: req.user._id };
    if (appointmentId) query.appointment = appointmentId;
    if (patientId) {
      const patient = await Patient.findOne({ patientId, userId: req.user._id });
      if (patient) query.patient = patient._id;
    }
    const bills = await Bill.find(query).populate('patient');
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bills', error: error.message });
  }
};

exports.payBill = async (req, res) => {
  try {
    const { billId } = req.params;
    const { amount, paymentMode } = req.body;
    
    const bill = await Bill.findOne({ _id: billId, userId: req.user._id });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    bill.receivedAmount += amount;
    bill.totalBalance = bill.finalAmount - bill.receivedAmount;
    bill.paymentMode = paymentMode || bill.paymentMode;
    await bill.save();

    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Error paying bill', error: error.message });
  }
};

exports.updateVitals = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { vitals } = req.body;
    
    const appointment = await Appointment.findOne({ _id: appointmentId, userId: req.user._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    appointment.vitals = vitals;
    await appointment.save();

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Error saving vitals', error: error.message });
  }
};

exports.saveTestResults = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { tests } = req.body;
    
    const appointment = await Appointment.findOne({ _id: appointmentId, userId: req.user._id });
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
    const appointment = await Appointment.findOne({ _id: appointmentId, userId: req.user._id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const attachment = new Attachment({
      userId: req.user._id,
      appointment: appointmentId,
      patient: appointment.patient,
      fileName: req.file.originalname,
      fileUrl: fileUrl
    });
    
    await attachment.save();
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
