const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  message: { type: String, required: true },
  status: { 
    type: String, 
    enum: ["pending", "contacted", "hot_lead", "cold_lead", "response_pending", "follow_up", "not_interested", "converted", "closed"], 
    default: "pending" 
  },
  remarks: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.models.Enquiry || mongoose.model("Enquiry", enquirySchema);
