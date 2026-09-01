const HomeCare = require('../models/HomeCare');
const Bill     = require('../models/Bill');
const Counter = require('../models/Counter');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { broadcast } = require('../websocket');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `homecare_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

exports.uploadMiddleware = upload.single('file');

// GET all home care records for this clinic
exports.getHomeCareRecords = async (req, res) => {
  try {
    const records = await HomeCare.find({ clinicId: req.clinicId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching home care records', error: error.message });
  }
};

// GET single record
exports.getHomeCareRecord = async (req, res) => {
  try {
    const record = await HomeCare.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching record', error: error.message });
  }
};

// POST create new record
exports.createHomeCareRecord = async (req, res) => {
  try {
    const body = { ...req.body, clinicId: req.clinicId, userId: req.user._id };
    // Auto-assign uhid if not provided (walk-in homecare patient)
    if (!body.uhid) {
      body.uhid = await Counter.nextId();
    }
    const record = new HomeCare(body);
    await record.save();
    broadcast('HOMECARE_UPDATED', { action: 'created', id: record._id });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error creating home care record', error: error.message });
  }
};

// PUT update record
exports.updateHomeCareRecord = async (req, res) => {
  try {
    const record = await HomeCare.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.clinicId },
      req.body,
      { new: true }
    );
    if (!record) return res.status(404).json({ message: 'Record not found' });
    broadcast('HOMECARE_UPDATED', { action: 'updated', id: req.params.id });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error updating record', error: error.message });
  }
};

// DELETE record
exports.deleteHomeCareRecord = async (req, res) => {
  try {
    const record = await HomeCare.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    broadcast('HOMECARE_UPDATED', { action: 'deleted', id: req.params.id });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting record', error: error.message });
  }
};

// POST upload document to a home care record
exports.uploadDocument = async (req, res) => {
  try {
    const record = await HomeCare.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    record.documents.push({ fileName: req.file.originalname, fileUrl });
    await record.save();
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error uploading document', error: error.message });
  }
};

// DELETE a document from a record
exports.deleteDocument = async (req, res) => {
  try {
    const record = await HomeCare.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    record.documents = record.documents.filter(d => d._id.toString() !== req.params.docId);
    await record.save();
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error deleting document', error: error.message });
  }
};

/* ── Billing ────────────────────────────────────────────────────── */

exports.getBills = async (req, res) => {
  try {
    const { homeCareId } = req.query;
    const query = { clinicId: req.clinicId, sourceType: 'HomeCare' };
    if (homeCareId) query.homeCare = homeCareId;
    const bills = await Bill.find(query).sort({ createdAt: -1 });
    res.json(bills);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.createBill = async (req, res) => {
  try {
    const { homeCareId, items, billDate, depositAmount, discountType, discountValue, patientName } = req.body;
    const rec = await HomeCare.findOne({ _id: homeCareId, clinicId: req.clinicId });
    if (!rec) return res.status(404).json({ message: 'Home Care record not found' });

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
      homeCare:         homeCareId,
      sourceType:       'HomeCare',
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
    
    broadcast('HOMECARE_UPDATED', { action: 'payment', id: bill.homeCare });
    res.json(bill);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

