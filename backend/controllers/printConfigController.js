const PrintConfig = require('../models/PrintConfig');

const ALLOWED_FIELDS = [
  'templateName',
  'printMarginLeft', 'printMarginRight', 'printMarginHeaderHeight', 'printMarginFooterHeight', 'printMarginPageHeight',
  'whatsappMarginLeft', 'whatsappMarginRight', 'whatsappMarginHeaderHeight', 'whatsappMarginFooterHeight',
  'formsMarginLeft', 'formsMarginRight', 'formsMarginHeaderHeight', 'formsMarginFooterHeight',
  'fontFamily', 'fontSize', 'fontSizeCompensation',
  'patientImageHeight', 'patientImageWidth',
  'headerImage', 'footerImage', 'useOwnLetterhead', 'printHeaderFirstPageOnly',
  'printSignatureImage', 'signatureHeightCm', 'printSignatureText', 'signatureText',
  'printGenericName', 'tabularPrint',
  'showPatientPhone', 'showPatientAddress', 'showReferredBy', 'showChannelThrough',
  'showDepartment', 'showDoctorName', 'showVisitNumber', 'showPrintTime',
  'showValidTill', 'showAbhaNumber',
  'patientDetailFormat', 'capitalizePatientName',
  'showPrintPreview', 'enableLanguageTranslation', 'enableBackgroundGraphics',
  'enableMedicineDetails', 'printQRCode',
  'defaultPrintLanguage', 'isDefault'
];

// ── GET all templates list for the logged-in doctor ──────────────────────────
exports.getAllTemplates = async (req, res) => {
  try {
    const templates = await PrintConfig.find({ userId: req.user._id })
      .select('_id templateName isDefault createdAt')
      .sort({ createdAt: 1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
};

// ── GET a single template (or the default one) ───────────────────────────────
exports.getPrintConfig = async (req, res) => {
  try {
    const { id } = req.params;
    let config;

    if (id) {
      config = await PrintConfig.findOne({ _id: id, userId: req.user._id });
      if (!config) return res.status(404).json({ message: 'Template not found' });
    } else {
      // Return default template (or first one, or schema defaults)
      config = await PrintConfig.findOne({ userId: req.user._id, isDefault: true })
        || await PrintConfig.findOne({ userId: req.user._id }).sort({ createdAt: 1 });
    }

    if (!config) {
      // Return schema defaults as a virtual (do NOT save — create happens on first save)
      config = new PrintConfig({ userId: req.user._id });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching print config', error: error.message });
  }
};

// ── POST — create a brand-new named template ─────────────────────────────────
exports.createTemplate = async (req, res) => {
  try {
    const { templateName } = req.body;
    if (!templateName || !templateName.trim()) {
      return res.status(400).json({ message: 'Template name is required' });
    }

    // Check for duplicate name
    const existing = await PrintConfig.findOne({ userId: req.user._id, templateName: templateName.trim() });
    if (existing) return res.status(400).json({ message: 'A template with this name already exists' });

    // If "copyFrom" id provided, clone that template; otherwise use defaults
    let sourceData = {};
    if (req.body.copyFrom) {
      const source = await PrintConfig.findOne({ _id: req.body.copyFrom, userId: req.user._id });
      if (source) {
        const obj = source.toObject();
        delete obj._id; delete obj.userId; delete obj.createdAt; delete obj.updatedAt; delete obj.__v;
        sourceData = obj;
      }
    }

    const config = await PrintConfig.create({
      userId: req.user._id,
      ...sourceData,
      templateName: templateName.trim(),
      isDefault: false
    });

    res.status(201).json(config);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Template name already exists' });
    res.status(500).json({ message: 'Error creating template', error: error.message });
  }
};

// ── PUT — save/update a specific template ────────────────────────────────────
exports.savePrintConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    let config;
    if (id) {
      // Update specific template
      config = await PrintConfig.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { $set: updateData },
        { new: true, runValidators: true }
      );
      if (!config) return res.status(404).json({ message: 'Template not found' });
    } else {
      // Upsert default template (legacy fallback)
      config = await PrintConfig.findOneAndUpdate(
        { userId: req.user._id, isDefault: true },
        { $set: updateData },
        { new: true, upsert: true, runValidators: true }
      );
    }

    // If isDefault is being set to true, clear it from other templates
    if (updateData.isDefault === true) {
      await PrintConfig.updateMany(
        { userId: req.user._id, _id: { $ne: config._id } },
        { $set: { isDefault: false } }
      );
    }

    res.json(config);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Template name already exists' });
    res.status(500).json({ message: 'Error saving print config', error: error.message });
  }
};

// ── DELETE — remove a template ───────────────────────────────────────────────
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await PrintConfig.findOne({ _id: id, userId: req.user._id });
    if (!config) return res.status(404).json({ message: 'Template not found' });

    if (config.isDefault) {
      return res.status(400).json({ message: 'Cannot delete the default template. Set another template as default first.' });
    }

    await PrintConfig.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting template', error: error.message });
  }
};

// ── POST /upload-header — store header image as base64 ───────────────────────
exports.uploadHeaderImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const base64  = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    const query  = id ? { _id: id, userId: req.user._id } : { userId: req.user._id, isDefault: true };
    const config = await PrintConfig.findOneAndUpdate(query, { $set: { headerImage: dataUrl } }, { new: true, upsert: !id });
    res.json({ headerImage: config.headerImage, _id: config._id });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading header image', error: error.message });
  }
};

// ── POST /upload-footer — store footer image as base64 ───────────────────────
exports.uploadFooterImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const base64  = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    const query  = id ? { _id: id, userId: req.user._id } : { userId: req.user._id, isDefault: true };
    const config = await PrintConfig.findOneAndUpdate(query, { $set: { footerImage: dataUrl } }, { new: true, upsert: !id });
    res.json({ footerImage: config.footerImage, _id: config._id });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading footer image', error: error.message });
  }
};

// ── DELETE /image/:type/:id — clear header or footer ─────────────────────────
exports.clearImage = async (req, res) => {
  try {
    const { type, id } = req.params;
    const field  = type === 'header' ? 'headerImage' : 'footerImage';
    const query  = id ? { _id: id, userId: req.user._id } : { userId: req.user._id, isDefault: true };
    await PrintConfig.findOneAndUpdate(query, { $set: { [field]: null } }, { upsert: !id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing image', error: error.message });
  }
};
