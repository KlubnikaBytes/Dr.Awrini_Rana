const DayCare = require('../models/DayCare');
const Bill    = require('../models/Bill');
const Counter = require('../models/Counter');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { findOrCreatePatient } = require('../utils/patientUtils');
const { broadcast } = require('../websocket');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `daycare_${Date.now()}_${file.originalname}`)
});
exports.uploadMiddleware = multer({ storage }).single('file');

exports.getAll = async (req, res) => {
  try {
    const records = await DayCare.find({ clinicId: req.clinicId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const r = await DayCare.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ message: 'Not found' });
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const body = { ...req.body, clinicId: req.clinicId, userId: req.user._id };
    
    // Unify patient ID (uhid)
    if (!body.uhid) {
      body.uhid = await findOrCreatePatient(req, {
        name: body.patientName,
        phone: body.patientPhone,
        age: body.patientAge,
        gender: body.patientGender,
        email: body.patientEmail,
        address: body.patientAddress
      });
    }

    const r = new DayCare(body);
    await r.save();
    broadcast('DAYCARE_UPDATED', { action: 'created', id: r._id });
    res.status(201).json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const r = await DayCare.findOneAndUpdate({ _id: req.params.id, clinicId: req.clinicId }, req.body, { new: true });
    if (!r) return res.status(404).json({ message: 'Not found' });
    broadcast('DAYCARE_UPDATED', { action: 'updated', id: r._id });
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    await DayCare.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    broadcast('DAYCARE_UPDATED', { action: 'deleted', id: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.uploadDocument = async (req, res) => {
  try {
    const r = await DayCare.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    r.documents.push({ fileName: req.file.originalname, fileUrl });
    await r.save();
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.deleteDocument = async (req, res) => {
  try {
    const r = await DayCare.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ message: 'Not found' });
    r.documents = r.documents.filter(d => d._id.toString() !== req.params.docId);
    await r.save();
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/* ── Billing ────────────────────────────────────────────────────── */

exports.getBills = async (req, res) => {
  try {
    const { dayCareId } = req.query;
    const query = { clinicId: req.clinicId, sourceType: 'DayCare' };
    if (dayCareId) query.dayCare = dayCareId;
    const bills = await Bill.find(query).sort({ createdAt: -1 });
    res.json(bills);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.createBill = async (req, res) => {
  try {
    const { dayCareId, items, billDate, depositAmount, discountType, discountValue, patientName } = req.body;
    const rec = await DayCare.findOne({ _id: dayCareId, clinicId: req.clinicId });
    if (!rec) return res.status(404).json({ message: 'Day Care record not found' });

    let totalBilledAmount = 0, totalDiscount = 0, totalTax = 0;
    const processedItems = (items || []).map(item => {
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const qty       = parseInt(item.qty)          || 1;
      const gst       = parseFloat(item.gstPercent) || 0;
      const discAmt   = parseFloat(item.discount)   || 0;
      const lineTotal = unitPrice * qty;
      const taxAmt    = parseFloat(((lineTotal - discAmt) * gst / 100).toFixed(2));
      const total     = parseFloat((lineTotal - discAmt + taxAmt).toFixed(2));
      totalBilledAmount += lineTotal;
      totalDiscount     += discAmt;
      totalTax          += taxAmt;
      return { ...item, unitPrice, qty, gstPercent: gst, discount: discAmt, totalPrice: total };
    });

    let extraDiscount = 0;
    if (discountType === 'percent') extraDiscount = parseFloat(((totalBilledAmount - totalDiscount) * parseFloat(discountValue || 0) / 100).toFixed(2));
    else if (discountType === 'flat') extraDiscount = parseFloat(discountValue || 0);
    totalDiscount += extraDiscount;

    const finalAmount  = parseFloat(Math.max(0, totalBilledAmount - totalDiscount + totalTax).toFixed(2));
    const totalBalance = parseFloat(Math.max(0, finalAmount - parseFloat(depositAmount || 0)).toFixed(2));

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
      userId:           req.user._id,
      clinicId:         req.clinicId,
      dayCare:          dayCareId,
      sourceType:       'DayCare',
      patientName:      patientName || rec.patientName,
      billedBy:         req.user.name || req.user.email || 'Staff',
      billDate:         billDate ? new Date(billDate) : new Date(),
      items:            processedItems,
      payments,
      depositAmount:    deposit,
      totalBilledAmount, totalDiscount, totalTax,
      finalAmount,      totalBalance,
      receivedAmount:   deposit,
    });

    res.status(201).json(bill);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.updateBill = async (req, res) => {
  try {
    const { billId } = req.params;
    const { items, billDate, depositAmount, discountType, discountValue } = req.body;
    const bill = await Bill.findOne({ _id: billId, clinicId: req.clinicId });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    let totalBilledAmount = 0, totalDiscount = 0, totalTax = 0;
    bill.items = (items || []).map(item => {
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const qty       = parseInt(item.qty)          || 1;
      const gst       = parseFloat(item.gstPercent) || 0;
      const discAmt   = parseFloat(item.discount)   || 0;
      const lineTotal = unitPrice * qty;
      const taxAmt    = parseFloat(((lineTotal - discAmt) * gst / 100).toFixed(2));
      const total     = parseFloat((lineTotal - discAmt + taxAmt).toFixed(2));
      totalBilledAmount += lineTotal;
      totalDiscount     += discAmt;
      totalTax          += taxAmt;
      return { ...item, unitPrice, qty, gstPercent: gst, discount: discAmt, totalPrice: total };
    });

    let extraDiscount = 0;
    if (discountType === 'percent') extraDiscount = parseFloat(((totalBilledAmount - totalDiscount) * parseFloat(discountValue || 0) / 100).toFixed(2));
    else if (discountType === 'flat') extraDiscount = parseFloat(discountValue || 0);
    totalDiscount += extraDiscount;

    bill.billDate          = billDate ? new Date(billDate) : bill.billDate;
    bill.depositAmount     = parseFloat(depositAmount || 0);
    bill.totalBilledAmount = totalBilledAmount;
    bill.totalDiscount     = totalDiscount;
    bill.totalTax          = totalTax;
    bill.finalAmount       = parseFloat(Math.max(0, totalBilledAmount - totalDiscount + totalTax).toFixed(2));
    bill.totalBalance      = parseFloat(Math.max(0, bill.finalAmount - bill.receivedAmount).toFixed(2));
    await bill.save();
    res.json(bill);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.payBill = async (req, res) => {
  try {
    const { billId } = req.params;
    const { amount, paymentMode, purpose } = req.body;
    const bill = await Bill.findOne({ _id: billId, clinicId: req.clinicId });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    bill.payments = bill.payments || [];
    bill.payments.push({
      amount: Number(amount),
      paymentMode: paymentMode || 'CASH',
      purpose: purpose || '',
      paidAt: new Date()
    });
    bill.receivedAmount = bill.payments.reduce((s, p) => s + Number(p.amount), 0);
    bill.totalBalance   = parseFloat(Math.max(0, bill.finalAmount - bill.receivedAmount).toFixed(2));
    bill.paymentMode    = paymentMode || bill.paymentMode;
    await bill.save();
    
    broadcast('DAYCARE_UPDATED', { action: 'payment', id: bill.dayCare });
    res.json(bill);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

