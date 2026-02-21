const mongoose = require('mongoose');

const ManualPaymentRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  amount: { type: Number, required: true },
  utrNumber: { type: String, required: true },
  screenshotUrl: { type: String, required: true },
  screenshotFilename: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
    index: true,
  },
  couponCode: { type: String, default: null },
  discountPercent: { type: Number, default: 0 },
  originalAmount: { type: Number, default: null },
  adminNote: { type: String, default: '' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  verifiedAt: { type: Date },
}, { timestamps: true });

ManualPaymentRequestSchema.index({ userId: 1, courseId: 1 });
ManualPaymentRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.ManualPaymentRequest || mongoose.model('ManualPaymentRequest', ManualPaymentRequestSchema);
