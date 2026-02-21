const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authPhoneController = require("../controllers/authPhoneController");

const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { message: "Too many OTP requests. Please wait a minute before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.phoneNumber || req.ip,
});

router.post("/send-otp", otpRateLimiter, authPhoneController.sendPhoneOtp);
router.post("/mobileVerify-otp", authPhoneController.verifyPhoneOtp);
router.post("/login-phone", authPhoneController.loginWithPhone);
router.post("/register", authPhoneController.registerWithPhone);
router.post("/verify-registration", authPhoneController.verifyRegistrationOtp);
router.post("/login-password", authPhoneController.loginWithPassword);

module.exports = router;
