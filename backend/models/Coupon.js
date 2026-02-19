const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  discountPercent: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
  },
  applicableTo: {
    type: String,
    enum: ['all', 'specific'],
    default: 'all',
  },
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  maxUses: {
    type: Number,
    default: 0,
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  maxUsesPerUser: {
    type: Number,
    default: 1,
  },
  usedBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usedAt: { type: Date, default: Date.now },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  }],
  expiryDate: {
    type: Date,
    default: null,
  },
  description: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
