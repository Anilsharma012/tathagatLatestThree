const express = require('express');
const router = express.Router();
const { authMiddleware, adminAuth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const UpiSettings = require('../models/UpiSettings');
const ManualPaymentRequest = require('../models/ManualPaymentRequest');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const Course = require('../models/course/Course');

router.get('/upi-settings', async (req, res) => {
  try {
    let settings = await UpiSettings.findOne({ isActive: true }).lean();
    if (!settings) {
      settings = { upiId: '', qrCodeImage: '', isActive: false };
    }
    res.json({ success: true, settings });
  } catch (err) {
    console.error('GET upi-settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch UPI settings' });
  }
});

router.post('/upi-settings', adminAuth, upload.single('qrCodeImage'), async (req, res) => {
  try {
    const { upiId } = req.body;
    let settings = await UpiSettings.findOne();

    const updateData = {};
    if (upiId !== undefined) updateData.upiId = upiId;
    if (req.file) updateData.qrCodeImage = `/uploads/${req.file.filename}`;
    updateData.isActive = true;

    if (settings) {
      Object.assign(settings, updateData);
      await settings.save();
    } else {
      settings = await UpiSettings.create(updateData);
    }

    res.json({ success: true, settings });
  } catch (err) {
    console.error('POST upi-settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to save UPI settings' });
  }
});

router.get('/upi-settings/admin', adminAuth, async (req, res) => {
  try {
    let settings = await UpiSettings.findOne().lean();
    if (!settings) {
      settings = { upiId: '', qrCodeImage: '', isActive: false };
    }
    res.json({ success: true, settings });
  } catch (err) {
    console.error('GET upi-settings/admin error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch UPI settings' });
  }
});

router.post('/submit', authMiddleware, upload.single('screenshot'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, utrNumber, amount, couponCode, discountPercent, originalAmount } = req.body;

    if (!courseId || !utrNumber) {
      return res.status(400).json({ success: false, message: 'Course ID and UTR number are required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Payment screenshot is required' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const existing = await ManualPaymentRequest.findOne({
      userId,
      courseId,
      status: 'pending',
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending payment request for this course. Please wait for admin verification.' });
    }

    const request = await ManualPaymentRequest.create({
      userId,
      courseId,
      amount: Number(amount) || course.price || 0,
      utrNumber: utrNumber.trim(),
      screenshotUrl: `/uploads/${req.file.filename}`,
      screenshotFilename: req.file.filename,
      couponCode: couponCode || null,
      discountPercent: Number(discountPercent) || 0,
      originalAmount: Number(originalAmount) || null,
    });

    res.status(201).json({ success: true, message: 'Payment submitted for verification', request });
  } catch (err) {
    console.error('POST submit error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit payment request' });
  }
});

router.get('/requests', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    let requests = await ManualPaymentRequest.find(filter)
      .populate('userId', 'name phone email')
      .populate('courseId', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      requests = requests.filter(r =>
        r.utrNumber?.toLowerCase().includes(s) ||
        r.userId?.name?.toLowerCase().includes(s) ||
        r.userId?.phone?.includes(s) ||
        r.courseId?.name?.toLowerCase().includes(s)
      );
    }

    const total = await ManualPaymentRequest.countDocuments(filter);

    res.json({ success: true, requests, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('GET requests error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payment requests' });
  }
});

router.put('/verify/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNote } = req.body;

    if (!['verified', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be verified or rejected' });
    }

    const request = await ManualPaymentRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Payment request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}` });
    }

    request.status = action;
    request.adminNote = adminNote || '';
    request.verifiedAt = new Date();
    await request.save();

    if (action === 'verified') {
      const course = await Course.findById(request.courseId);
      const validityDays = course?.validityPeriod || 365;
      const now = new Date();

      await Enrollment.findOneAndUpdate(
        { userId: request.userId, courseId: request.courseId },
        {
          userId: request.userId,
          courseId: request.courseId,
          joinedAt: now,
          validTill: new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000),
          status: 'active',
        },
        { upsert: true, new: true }
      );

      await Payment.create({
        userId: request.userId,
        courseId: request.courseId,
        razorpay_order_id: `manual_upi_${request._id}`,
        amount: request.amount * 100,
        currency: 'INR',
        status: 'paid',
        paymentMethod: 'manual',
        originalAmount: request.originalAmount ? request.originalAmount * 100 : null,
        discountAmount: request.discountPercent > 0 ? Math.round(request.amount * request.discountPercent) : 0,
        couponCode: request.couponCode,
        notes: `UPI Manual Payment | UTR: ${request.utrNumber}`,
      });
    }

    res.json({ success: true, message: `Payment ${action} successfully`, request });
  } catch (err) {
    console.error('PUT verify error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
});

module.exports = router;
