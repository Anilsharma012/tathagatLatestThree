const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const Course = require('../models/course/Course');
const { adminAuth, authMiddleware } = require('../middleware/authMiddleware');

router.post('/create', adminAuth, async (req, res) => {
  try {
    const { code, discountPercent, applicableTo, courses, maxUses, maxUsesPerUser, expiryDate, description } = req.body;

    if (!code || !discountPercent) {
      return res.status(400).json({ success: false, message: 'Coupon code and discount percentage are required' });
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }

    const coupon = new Coupon({
      code: code.toUpperCase().trim(),
      discountPercent: Number(discountPercent),
      applicableTo: applicableTo || 'all',
      courses: applicableTo === 'specific' ? courses : [],
      maxUses: Number(maxUses) || 0,
      maxUsesPerUser: Number(maxUsesPerUser) || 1,
      expiryDate: expiryDate || null,
      description: description || '',
    });

    await coupon.save();
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    console.error('Coupon create error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/all', adminAuth, async (req, res) => {
  try {
    const coupons = await Coupon.find().populate('courses', 'name').sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { code, discountPercent, applicableTo, courses, maxUses, maxUsesPerUser, expiryDate, description, isActive } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

    if (code && code.toUpperCase().trim() !== coupon.code) {
      const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
      if (existing) return res.status(400).json({ success: false, message: 'Coupon code already exists' });
      coupon.code = code.toUpperCase().trim();
    }

    if (discountPercent !== undefined) coupon.discountPercent = Number(discountPercent);
    if (applicableTo !== undefined) coupon.applicableTo = applicableTo;
    if (courses !== undefined) coupon.courses = applicableTo === 'specific' ? courses : [];
    if (maxUses !== undefined) coupon.maxUses = Number(maxUses);
    if (maxUsesPerUser !== undefined) coupon.maxUsesPerUser = Number(maxUsesPerUser);
    if (expiryDate !== undefined) coupon.expiryDate = expiryDate || null;
    if (description !== undefined) coupon.description = description;
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();
    const populated = await Coupon.findById(coupon._id).populate('courses', 'name');
    res.json({ success: true, coupon: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/toggle', adminAuth, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/validate', authMiddleware, async (req, res) => {
  try {
    const { code, courseId } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Coupon code is required' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon code' });

    if (!coupon.isActive) {
      return res.status(400).json({ success: false, message: 'This coupon is no longer active' });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'This coupon has expired' });
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
    }

    if (coupon.applicableTo === 'specific' && courseId) {
      const courseIds = coupon.courses.map(c => c.toString());
      if (!courseIds.includes(courseId)) {
        return res.status(400).json({ success: false, message: 'This coupon is not applicable for this course' });
      }
    }

    const userId = req.user?.id || req.user?._id;
    if (userId && coupon.maxUsesPerUser > 0) {
      const userUseCount = coupon.usedBy.filter(u => u.userId?.toString() === userId.toString()).length;
      if (userUseCount >= coupon.maxUsesPerUser) {
        return res.status(400).json({ success: false, message: 'You have already used this coupon' });
      }
    }

    res.json({
      success: true,
      discountPercent: coupon.discountPercent,
      code: coupon.code,
      message: `${coupon.discountPercent}% discount applied!`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
