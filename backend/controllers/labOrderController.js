const LabOrder = require('../models/LabOrder');
const Counter = require('../models/Counter');
const LabCatalog = require('../models/LabCatalog');
const { broadcast } = require('../websocket');

exports.getCatalog = async (req, res) => {
  try {
    const catalog = await LabCatalog.find({ clinicId: req.clinicId }).sort({ category: 1 });
    res.json(catalog);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getAll = async (req, res) => {
  try {
    const records = await LabOrder.find({ clinicId: req.clinicId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const r = await LabOrder.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!r) return res.status(404).json({ message: 'Not found' });
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.create = async (req, res) => {
  try {
    // If no uhid provided, generate one (new walk-in lab patient)
    const body = { ...req.body, clinicId: req.clinicId, userId: req.user._id };
    if (!body.uhid) {
      body.uhid = await Counter.nextId();
    }
    const r = new LabOrder(body);
    await r.save();
    broadcast('LABORDER_UPDATED', { action: 'created', id: r._id });
    res.status(201).json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const r = await LabOrder.findOneAndUpdate({ _id: req.params.id, clinicId: req.clinicId }, req.body, { new: true });
    if (!r) return res.status(404).json({ message: 'Not found' });
    broadcast('LABORDER_UPDATED', { action: 'updated', id: r._id });
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.updateStatus = async (req, res) => {
  try {
    const r = await LabOrder.findOneAndUpdate({ _id: req.params.id, clinicId: req.clinicId }, { status: req.body.status }, { new: true });
    if (!r) return res.status(404).json({ message: 'Not found' });
    broadcast('LABORDER_UPDATED', { action: 'status_updated', id: r._id });
    res.json(r);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    await LabOrder.findOneAndDelete({ _id: req.params.id, clinicId: req.clinicId });
    broadcast('LABORDER_UPDATED', { action: 'deleted', id: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ─── BILLING ────────────────────────────────────────────────────────────────

/**
 * Save / update billing for a lab order.
 * Body: { items: [{name, unitPrice, qty, discount, tax}], discountType, discountValue, billDate }
 */
exports.saveBilling = async (req, res) => {
  try {
    const order = await LabOrder.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const { items, discountType, discountValue, billDate } = req.body;

    let totalBilledAmount = 0, totalDiscount = 0, totalTax = 0;

    const processedItems = (items || []).map(item => {
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const qty       = parseInt(item.qty) || 1;
      const discAmt   = parseFloat(item.discount) || 0;
      const gstPct    = parseFloat(item.tax) || 0;
      const lineTotal = unitPrice * qty;
      const taxAmt    = parseFloat(((lineTotal - discAmt) * gstPct / 100).toFixed(2));
      const total     = parseFloat((lineTotal - discAmt + taxAmt).toFixed(2));
      totalBilledAmount += lineTotal;
      totalDiscount     += discAmt;
      totalTax          += taxAmt;
      return { ...item, unitPrice, qty, discount: discAmt, tax: gstPct, totalPrice: total };
    });

    // Extra order-level discount
    let extraDiscount = 0;
    if (discountType === 'percent')
      extraDiscount = parseFloat(((totalBilledAmount - totalDiscount) * parseFloat(discountValue || 0) / 100).toFixed(2));
    else if (discountType === 'flat')
      extraDiscount = parseFloat(discountValue || 0);
    totalDiscount += extraDiscount;

    const finalAmount   = parseFloat(Math.max(0, totalBilledAmount - totalDiscount + totalTax).toFixed(2));
    const balanceAmount = parseFloat(Math.max(0, finalAmount - (order.receivedAmount || 0)).toFixed(2));

    // Update billing-related test item prices
    order.tests = order.tests.map(t => {
      const match = processedItems.find(pi => pi.name === t.name);
      return match ? { ...t.toObject(), unitPrice: match.unitPrice, qty: match.qty, discount: match.discount, tax: match.tax, totalPrice: match.totalPrice } : t;
    });

    order.totalBilledAmount = totalBilledAmount;
    order.totalDiscount     = totalDiscount;
    order.totalTax          = totalTax;
    order.finalAmount       = finalAmount;
    order.balanceAmount     = balanceAmount;
    order.billDate          = billDate ? new Date(billDate) : (order.billDate || new Date());
    order.billStatus        = balanceAmount <= 0 && finalAmount > 0 ? 'Paid' : (order.receivedAmount > 0 ? 'Partial' : 'Unbilled');
    if (req.body.tieUpOrganization !== undefined) {
      order.tieUpOrganization = req.body.tieUpOrganization;
    }

    await order.save();
    broadcast('LABORDER_UPDATED', { action: 'billed', id: order._id });
    res.json(order);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/**
 * Record a payment against a lab order.
 * Body: { amount, paymentMode, note }
 */
exports.addPayment = async (req, res) => {
  try {
    const order = await LabOrder.findOne({ _id: req.params.id, clinicId: req.clinicId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const { amount, paymentMode, note } = req.body;
    const paid = parseFloat(amount) || 0;
    if (paid <= 0) return res.status(400).json({ message: 'Amount must be > 0' });

    order.payments.push({ amount: paid, paymentMode: paymentMode || 'CASH', note: note || '', paidAt: new Date() });
    order.receivedAmount = parseFloat((order.receivedAmount + paid).toFixed(2));
    order.balanceAmount  = parseFloat(Math.max(0, order.finalAmount - order.receivedAmount).toFixed(2));
    order.billStatus     = order.balanceAmount <= 0 ? 'Paid' : 'Partial';

    await order.save();
    broadcast('LABORDER_UPDATED', { action: 'payment', id: order._id });
    res.json(order);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

