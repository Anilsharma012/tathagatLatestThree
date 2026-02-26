const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
    },
    oldPrice: {
      type: Number,
      default: null,
    },
    studyMaterialPrice: {
      type: Number,
      default: 0,
    },
    tuitionFeesPrice: {
      type: Number,
      default: 0,
    },
    thumbnail: {
      type: String,
      default: "",
    },
    published: {
  type: Boolean,
  default: false,
},
    
    isActive: {
      type: Boolean,
      default: true,
    },

    // ✅ NEW: Lock/unlock support (default locked)
    locked: {
      type: Boolean,
      default: true,
    },

    // ✅ NEW: Created by admin or subadmin
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // or "Admin" based on your schema
      required: true,
    },

    // ✅ NEW: Course Type (Full Course, Recorded Classes, Mock Tests)
    courseType: {
      type: String,
      enum: ['full_course', 'recorded_classes', 'mock_tests'],
      default: 'full_course',
    },

    // Batch subject rotation support
    startSubject: { type: String, enum: ['A','B','C','D'], default: 'A' },
    subjects: { type: [String], default: ['A','B','C','D'] },
    validityMonths: { type: Number, default: 12 },

    // Course scheduling - Start and End dates
    startDate: {
      type: Date,
      default: null,  // If null, content is accessible immediately after publish
    },
    endDate: {
      type: Date,
      default: null,  // If null, course never expires
    },
    // Whether to keep content accessible after endDate
    keepAccessAfterEnd: {
      type: Boolean,
      default: true,  // By default, keep content accessible after end date
    },

    overview: {
      description: { type: String, default: "" },
      about: { type: String, default: "" },
      materialIncludes: { type: [String], default: [] },
      requirements: { type: [String], default: [] },
      videoUrl: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
