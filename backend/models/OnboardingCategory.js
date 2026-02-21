const mongoose = require('mongoose');

const onboardingCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    exams: [
      {
        name: { type: String, required: true, trim: true },
        displayOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('OnboardingCategory', onboardingCategorySchema);
