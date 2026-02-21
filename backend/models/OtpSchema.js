 const mongoose=require("mongoose")

const otpSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
      },
    phoneNumber: {
        type: String,
        required: false,
      },
    otpCode: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300,
    },
  });
  
  module.exports = mongoose.model('OTP', otpSchema);
  