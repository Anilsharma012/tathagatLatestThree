const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/authMiddleware');
const User = require('../models/UserSchema');
const Course = require('../models/course/Course');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const Coupon = require('../models/Coupon');
const BillingSettings = require('../models/BillingSettings');
const { prepareInvoiceData, generateInvoiceHtml, generateSequentialInvoiceNumber } = require('../services/invoicePdfService');

router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      name, phone, email, city, state, gender, dob,
      courseId,
      paymentMethod, amount, referenceNumber, paymentNote,
      couponCode
    } = req.body;

    if (!name || !phone || !courseId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, course, amount and payment method are required'
      });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number (10 digits required)' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    let user = await User.findOne({ phoneNumber: phone });
    let isNewUser = false;

    if (user) {
      if (name && !user.name) user.name = name;
      if (email && !user.email) user.email = email;
      if (city && !user.city) user.city = city;
      if (state && !user.state) user.state = state;
      if (gender && !user.gender) user.gender = gender;
      if (dob && !user.dob) user.dob = dob;
      await user.save();
    } else {
      isNewUser = true;
      user = await User.create({
        name,
        phoneNumber: phone,
        email: email || undefined,
        city: city || undefined,
        state: state || undefined,
        gender: gender || undefined,
        dob: dob || undefined,
        isPhoneVerified: true,
        isOnboardingComplete: true,
        role: 'student'
      });
    }

    const amountNum = Number(amount);
    let originalAmount = course.price || amountNum;
    let discountPercent = 0;
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
      if (!coupon) {
        return res.status(400).json({ success: false, message: 'Invalid coupon code' });
      }
      if (!coupon.isActive) {
        return res.status(400).json({ success: false, message: 'This coupon is no longer active' });
      }
      if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
        return res.status(400).json({ success: false, message: 'This coupon has expired' });
      }
      if (coupon.maxUses > 0 && (coupon.usedCount || 0) >= coupon.maxUses) {
        return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
      }
      if (coupon.applicableTo === 'specific') {
        const courseIds = coupon.courses.map(c => c.toString());
        if (!courseIds.includes(courseId.toString())) {
          return res.status(400).json({ success: false, message: 'Coupon not applicable for this course' });
        }
      }
      discountPercent = coupon.discountPercent;
      appliedCoupon = coupon;
    }

    if (appliedCoupon) {
      discountAmount = Math.round(originalAmount * discountPercent / 100);
    }

    const validityDays = course.validityMonths ? course.validityMonths * 30 : 365;
    const now = new Date();

    const enrollment = await Enrollment.findOneAndUpdate(
      { userId: user._id, courseId },
      {
        userId: user._id,
        courseId,
        joinedAt: now,
        validTill: new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000),
        status: 'active',
      },
      { upsert: true, new: true }
    );

    const existingEntry = user.enrolledCourses?.find(c => String(c.courseId) === String(courseId));
    if (!existingEntry) {
      user.enrolledCourses = user.enrolledCourses || [];
      user.enrolledCourses.push({ courseId, status: 'unlocked', enrolledAt: now });
      await user.save();
    } else if (existingEntry.status !== 'unlocked') {
      existingEntry.status = 'unlocked';
      existingEntry.enrolledAt = now;
      await user.save();
    }

    const prefix = (await BillingSettings.findOne({ isActive: true }))?.invoicePrefix || 'STX';
    const { counter } = await generateSequentialInvoiceNumber(prefix, BillingSettings);

    const payment = await Payment.create({
      userId: user._id,
      courseId,
      razorpay_order_id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      amount: amountNum * 100,
      currency: 'INR',
      status: 'paid',
      paymentMethod: 'offline',
      originalAmount: originalAmount * 100,
      discountAmount: discountAmount * 100,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      invoiceNumber: counter,
      notes: `Offline Admission | Method: ${paymentMethod}${referenceNumber ? ' | Ref: ' + referenceNumber : ''}${paymentNote ? ' | Note: ' + paymentNote : ''}`,
      validityPeriod: validityDays,
      validityStartDate: now,
      uploadedByRole: 'admin'
    });

    if (appliedCoupon) {
      appliedCoupon.usedBy.push({ userId: user._id, usedAt: now });
      appliedCoupon.usedCount = (appliedCoupon.usedCount || 0) + 1;
      await appliedCoupon.save();
    }

    const previousPayments = await Payment.find({
      userId: user._id,
      courseId,
      status: 'paid',
      _id: { $ne: payment._id }
    }).lean();
    const previousPaid = previousPayments.reduce((sum, p) => sum + (p.amount >= 100 ? p.amount / 100 : p.amount), 0);
    const totalPaid = previousPaid + amountNum;
    const courseFee = appliedCoupon ? (originalAmount - discountAmount) : originalAmount;

    res.json({
      success: true,
      message: `${isNewUser ? 'New student created and' : 'Student'} enrolled successfully`,
      data: {
        userId: user._id,
        studentName: user.name,
        studentPhone: user.phoneNumber,
        isNewUser,
        courseId: course._id,
        courseName: course.name,
        enrollmentId: enrollment._id,
        paymentId: payment._id,
        receiptNumber: payment.receiptNumber,
        invoiceNumber: `${prefix}${counter}`,
        amountPaid: amountNum,
        totalPaid,
        courseFee,
        remainingBalance: Math.max(0, courseFee - totalPaid),
        paymentMethod,
      }
    });
  } catch (err) {
    console.error('Offline admission error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to process offline admission' });
  }
});

router.get('/payment-history', adminAuth, async (req, res) => {
  try {
    const { phone, courseId } = req.query;
    if (!phone || !courseId) {
      return res.json({ success: true, payments: [], totalPaid: 0 });
    }

    const user = await User.findOne({ phoneNumber: phone });
    if (!user) {
      return res.json({ success: true, payments: [], totalPaid: 0 });
    }

    const payments = await Payment.find({
      userId: user._id,
      courseId,
      status: 'paid'
    }).sort({ createdAt: -1 }).lean();

    const totalPaid = payments.reduce((sum, p) => sum + (p.amount >= 100 ? p.amount / 100 : p.amount), 0);

    res.json({
      success: true,
      payments: payments.map(p => ({
        _id: p._id,
        amount: p.amount >= 100 ? p.amount / 100 : p.amount,
        paymentMethod: p.paymentMethod,
        receiptNumber: p.receiptNumber,
        invoiceNumber: p.invoiceNumber,
        notes: p.notes,
        createdAt: p.createdAt
      })),
      totalPaid
    });
  } catch (err) {
    console.error('Payment history error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
  }
});

router.get('/', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = { paymentMethod: 'offline', status: 'paid' };

    let allPayments = await Payment.find(filter)
      .populate('userId', 'name phoneNumber email city')
      .populate('courseId', 'name price')
      .sort({ createdAt: -1 })
      .lean();

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      allPayments = allPayments.filter(p =>
        p.userId?.name?.toLowerCase().includes(s) ||
        p.userId?.phoneNumber?.includes(s) ||
        p.userId?.email?.toLowerCase().includes(s) ||
        p.courseId?.name?.toLowerCase().includes(s) ||
        p.receiptNumber?.toLowerCase().includes(s)
      );
    }

    const total = allPayments.length;
    const payments = allPayments.slice(skip, skip + Number(limit));

    res.json({
      success: true,
      admissions: payments,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    console.error('List offline admissions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch admissions' });
  }
});

const adminTokenFromQuery = (req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
};

router.get('/invoice/:paymentId', adminTokenFromQuery, adminAuth, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const user = await User.findById(payment.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const course = await Course.findById(payment.courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    let billingSettings = await BillingSettings.findOne({ isActive: true });
    if (!billingSettings) {
      billingSettings = {};
    }

    if (!payment.invoiceNumber) {
      const prefix = billingSettings.invoicePrefix || 'STX';
      const { counter } = await generateSequentialInvoiceNumber(prefix, BillingSettings);
      payment.invoiceNumber = counter;
      await payment.save();
    }

    const invoiceData = prepareInvoiceData(payment, user, course, billingSettings);
    const invoiceHtml = generateInvoiceHtml(invoiceData);

    const printWrapper = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${invoiceData.invoiceNumber}</title>
  <style>
    @media print {
      .print-toolbar { display: none !important; }
      body { margin: 0; padding: 0; }
    }
    .print-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: #1a237e;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 12px 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .print-toolbar button {
      padding: 10px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-download {
      background: #d3544b;
      color: white;
    }
    .btn-download:hover {
      background: #b53e36;
    }
    .btn-close {
      background: rgba(255,255,255,0.15);
      color: white;
      border: 1px solid rgba(255,255,255,0.3) !important;
    }
    .btn-close:hover {
      background: rgba(255,255,255,0.25);
    }
    .toolbar-title {
      font-size: 15px;
      font-weight: 600;
      margin-right: auto;
    }
    .invoice-body-wrapper {
      margin-top: 60px;
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <span class="toolbar-title">Invoice: ${invoiceData.invoiceNumber}</span>
    <button class="btn-download" onclick="window.print()">
      Download / Print PDF
    </button>
    <button class="btn-close" onclick="window.close()">
      Close
    </button>
  </div>
  <div class="invoice-body-wrapper">
    ${invoiceHtml}
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.send(printWrapper);
  } catch (err) {
    console.error('Admin invoice error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate invoice' });
  }
});

module.exports = router;
