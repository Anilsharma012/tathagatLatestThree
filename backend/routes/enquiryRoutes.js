const express = require("express");
const router = express.Router();
const Enquiry = require("../models/Enquiry");
const { authMiddleware, checkPermission } = require("../middleware/authMiddleware");

// Public route to submit enquiry
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, address, message } = req.body;
    if (!name || !email || !phone || !address || !message) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    const newEnquiry = new Enquiry({ name, email, phone, address, message });
    await newEnquiry.save();
    res.status(201).json({ success: true, message: "Enquiry submitted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Admin route to get all enquiries
router.get("/", authMiddleware, async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.json({ success: true, enquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Admin route to update enquiry status/remarks
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const update = {};
    if (status) update.status = status;
    if (remarks !== undefined) update.remarks = remarks;
    
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }
    res.json({ success: true, enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
