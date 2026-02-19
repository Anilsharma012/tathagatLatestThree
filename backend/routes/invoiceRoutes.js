const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const Payment = require('../models/Payment');
const User = require('../models/UserSchema');
const Course = require('../models/course/Course');
const BillingSettings = require('../models/BillingSettings');
const { prepareInvoiceData, generateInvoiceHtml } = require('../services/invoicePdfService');

const tokenFromQuery = (req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
};

router.get('/download/:paymentId', tokenFromQuery, authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id || req.user._id;

    const payment = await Payment.findOne({
      _id: paymentId,
      userId: userId,
      status: 'paid'
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or not authorized'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const course = await Course.findById(payment.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    let billingSettings = await BillingSettings.findOne({ isActive: true });
    if (!billingSettings) {
      billingSettings = {};
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

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
});

router.get('/preview/:paymentId', authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id || req.user._id;

    const payment = await Payment.findOne({
      _id: paymentId,
      userId: userId,
      status: 'paid'
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or not authorized'
      });
    }

    const user = await User.findById(userId);
    const course = await Course.findById(payment.courseId);
    let billingSettings = await BillingSettings.findOne({ isActive: true });

    if (!billingSettings) {
      billingSettings = {};
    }

    const invoiceData = prepareInvoiceData(payment, user, course, billingSettings);

    res.json({
      success: true,
      invoiceData
    });

  } catch (error) {
    console.error('Error previewing invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview invoice',
      error: error.message
    });
  }
});

module.exports = router;
