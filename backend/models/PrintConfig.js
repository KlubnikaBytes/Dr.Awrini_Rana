const mongoose = require('mongoose');

const printConfigSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Template name
  templateName: { type: String, default: 'Default Print Template' },

  // ── Print Page Margins (px) ──────────────────────────────────────────────
  printMarginLeft:         { type: Number, default: 50 },
  printMarginRight:        { type: Number, default: 50 },
  printMarginHeaderHeight: { type: Number, default: 275 },
  printMarginFooterHeight: { type: Number, default: 60 },
  printMarginPageHeight:   { type: Number, default: 1300 },

  // ── WhatsApp / SMS / Email Margins ──────────────────────────────────────
  whatsappMarginLeft:         { type: Number, default: 50 },
  whatsappMarginRight:        { type: Number, default: 50 },
  whatsappMarginHeaderHeight: { type: Number, default: 275 },
  whatsappMarginFooterHeight: { type: Number, default: 60 },

  // ── Forms Print Margins ──────────────────────────────────────────────────
  formsMarginLeft:         { type: Number, default: 15 },
  formsMarginRight:        { type: Number, default: 15 },
  formsMarginHeaderHeight: { type: Number, default: 75 },
  formsMarginFooterHeight: { type: Number, default: 50 },

  // ── Default Font Setting ─────────────────────────────────────────────────
  fontFamily:           { type: String, default: 'Times' },
  fontSize:             { type: Number, default: 12 },
  fontSizeCompensation: { type: Number, default: 2 },

  // ── Patient Image Size ───────────────────────────────────────────────────
  patientImageHeight: { type: Number, default: 80 },
  patientImageWidth:  { type: Number, default: 150 },

  // ── Header & Footer Images ───────────────────────────────────────────────
  headerImage:             { type: String, default: null }, // base64 data URL or URL path
  footerImage:             { type: String, default: null },
  useOwnLetterhead:        { type: Boolean, default: false },
  printHeaderFirstPageOnly:{ type: Boolean, default: true },

  // ── Doctor Details ───────────────────────────────────────────────────────
  printSignatureImage: { type: Boolean, default: false },
  signatureHeightCm:   { type: Number, default: 45 },
  printSignatureText:  { type: Boolean, default: true },
  signatureText:       { type: String, default: '' }, // override name shown below signature

  // ── Rx Settings ─────────────────────────────────────────────────────────
  printGenericName: { type: Boolean, default: true },
  tabularPrint:     { type: Boolean, default: false },

  // ── Patient Detail Toggles ───────────────────────────────────────────────
  showPatientPhone:    { type: Boolean, default: false },
  showPatientAddress:  { type: Boolean, default: true },
  showReferredBy:      { type: Boolean, default: false },
  showChannelThrough:  { type: Boolean, default: false },
  showDepartment:      { type: Boolean, default: false },
  showDoctorName:      { type: Boolean, default: false },
  showVisitNumber:     { type: Boolean, default: false },
  showPrintTime:       { type: Boolean, default: false },
  showValidTill:       { type: Boolean, default: false },
  showAbhaNumber:      { type: Boolean, default: false },

  // Patient detail format
  patientDetailFormat:  { type: String, default: 'single' }, // 'single' | 'multi'
  capitalizePatientName:{ type: Boolean, default: true },

  // ── Other Details ────────────────────────────────────────────────────────
  showPrintPreview:          { type: Boolean, default: true },
  enableLanguageTranslation: { type: Boolean, default: true },
  enableBackgroundGraphics:  { type: Boolean, default: false },
  enableMedicineDetails:     { type: Boolean, default: false },
  printQRCode:               { type: Boolean, default: false },

  // ── Language & Default ───────────────────────────────────────────────────
  defaultPrintLanguage: { type: String, default: 'English' },
  isDefault:            { type: Boolean, default: true },

}, { timestamps: true });

// Each doctor can have multiple templates but not duplicate names
printConfigSchema.index({ userId: 1, templateName: 1 }, { unique: true });
printConfigSchema.index({ userId: 1 }); // fast lookups by user

module.exports = mongoose.model('PrintConfig', printConfigSchema);
