const mongoose = require('mongoose');

const UpiSettingsSchema = new mongoose.Schema({
  upiId: { type: String, default: '' },
  qrCodeImage: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
}, { timestamps: true });

module.exports = mongoose.models.UpiSettings || mongoose.model('UpiSettings', UpiSettingsSchema);
