const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const Razorpay = require("razorpay");

const User = require("../models/UserSchema");
const Course = require("../models/course/Course");
const Payment = require("../models/Payment");
const Receipt = require("../models/Receipt");
const Coupon = require("../models/Coupon");
const { sendCoursePurchaseEmail } = require("../services/authEmailService");

// ---------------- Helpers ----------------
const getUserId = (req) => req.user?.id || req.user?._id || req.user?.userId;

const signToken = (user) => {
  const secret = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
  return jwt.sign({ id: user._id, email: user.email }, secret, {
    expiresIn: "30d",
  });
};

// const getRazorpay = () => {
//   const key_id = process.env.RAZORPAY_KEY_ID;
//   const key_secret = process.env.RAZORPAY_KEY_SECRET;

//   if (!key_id || !key_secret) {
//     // Dev-friendly error
//     throw new Error("Razorpay keys missing in env");
//   }

//   return new Razorpay({ key_id, key_secret });
// };

const getRazorpay = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY;

  const key_secret =
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.RAZORPAY_KEY_SECRET_KEY ||
    process.env.RAZORPAY_SECRET;

  if (!key_id || !key_secret) {
    console.error("[Razorpay] Missing keys in env", {
      hasKeyId: !!key_id,
      hasSecret: !!key_secret,
    });
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing in env");
  }

  return new Razorpay({ key_id, key_secret });
};

// Small helper: price sanitize
const parsePriceRupees = (val) => {
  const n = Number(String(val ?? "0").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

// Small helper: short receipt (Razorpay receipt length issues)
const makeShortReceipt = (userId, courseId) => {
  const uidTail = String(userId || "").slice(-6);
  const cidTail = String(courseId || "").slice(-6);
  const timeTail = String(Date.now()).slice(-6);
  return `rcpt_${uidTail}_${cidTail}_${timeTail}`;
};

// ---------------- Auth ----------------
exports.signup = async (req, res) => {
  try {
    const { name, email, phoneNumber, password } = req.body;

    if (!name || !email || !phoneNumber || !password) {
      return res.status(400).json({
        status: false,
        msg: "All fields are required",
      });
    }

    const existing = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existing) {
      return res.status(409).json({
        status: false,
        msg: "User already exists with this email/phone",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phoneNumber,
      password: hashed,
    });

    const token = signToken(user);

    return res.json({
      status: true,
      msg: "Signup successful",
      token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({
      status: false,
      msg: "Signup failed",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, phoneNumber, password } = req.body;

    if ((!email && !phoneNumber) || !password) {
      return res.status(400).json({
        status: false,
        msg: "Email/Phone and password required",
      });
    }

    const user = await User.findOne(email ? { email } : { phoneNumber });

    if (!user) {
      return res.status(404).json({
        status: false,
        msg: "User not found",
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({
        status: false,
        msg: "Invalid credentials",
      });
    }

    const token = signToken(user);

    return res.json({
      status: true,
      msg: "Login successful",
      token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profilePic: user.profilePic,
        city: user.city,
        selectedExam: user.selectedExam,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      status: false,
      msg: "Login failed",
    });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.split(" ")[1]
      : req.query.token;

    if (!token) {
      return res.status(401).json({
        status: false,
        msg: "Token missing",
      });
    }

    const secret = process.env.JWT_SECRET || "default_secret_key";
    const decoded = jwt.verify(token, secret);

    // Fetch full user from database
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({
        status: false,
        msg: "User not found",
      });
    }

    // Determine redirect based on onboarding status
    let redirectTo = "/student/dashboard";
    if (!user.isOnboardingComplete) {
      redirectTo = "/user-details";
    } else if (!user.name || !user.email) {
      redirectTo = "/user-details";
    }

    return res.json({
      status: true,
      msg: "Token valid",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profilePic: user.profilePic,
        isPhoneVerified: user.isPhoneVerified,
        isOnboardingComplete: user.isOnboardingComplete,
        targetYear: user.targetYear,
        selectedExam: user.selectedExam,
        selectedCategory: user.selectedCategory,
        state: user.state,
        city: user.city,
        gender: user.gender,
        dob: user.dob,
      },
      redirectTo,
    });
  } catch (err) {
    console.error("Token verify error:", err);
    return res.status(401).json({
      status: false,
      msg: "Token invalid",
    });
  }
};

exports.autoLogin = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        status: false,
        msg: "Unauthorized",
      });
    }

    const user = await User.findById(userId)
      .select("-password")
      .populate("enrolledCourses.courseId");

    if (!user) {
      return res.status(404).json({
        status: false,
        msg: "User not found",
      });
    }

    return res.json({
      status: true,
      msg: "Auto login success",
      data: user,
    });
  } catch (err) {
    console.error("AutoLogin error:", err);
    return res.status(500).json({
      status: false,
      msg: "Auto login failed",
    });
  }
};

// ---------------- Profile ----------------
exports.updateDetails = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ status: false, msg: "Unauthorized" });
    }

    const allowed = [
      "name", "email", "phoneNumber", "city", "state", "profilePic",
      "gender", "dob", "selectedCategory", "selectedExam", "targetYear", "isOnboardingComplete"
    ];

    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    
    // If all required fields are present, mark onboarding as complete
    if (req.body.isOnboardingComplete === true) {
      updates.isOnboardingComplete = true;
    }

    // Get current user to check login method
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ status: false, msg: "User not found" });
    }

    // Handle email conflict - merge accounts if user logged in via phone
    if (updates.email) {
      const existingEmailUser = await User.findOne({
        email: updates.email,
        _id: { $ne: userId },
      });

      if (existingEmailUser) {
        // If current user logged in via phone and email account exists, merge them
        if (currentUser.isPhoneVerified && currentUser.phoneNumber) {
          console.log(
            `[Account Merge] Merging phone account ${userId} into email account ${existingEmailUser._id}`
          );

          // Update existing email account with phone details
          existingEmailUser.phoneNumber = currentUser.phoneNumber;
          existingEmailUser.isPhoneVerified = true;

          // Copy any missing fields from phone account to email account
          if (!existingEmailUser.city && currentUser.city)
            existingEmailUser.city = currentUser.city;
          if (!existingEmailUser.state && currentUser.state)
            existingEmailUser.state = currentUser.state;
          if (!existingEmailUser.name && currentUser.name)
            existingEmailUser.name = currentUser.name;
          if (!existingEmailUser.gender && currentUser.gender)
            existingEmailUser.gender = currentUser.gender;
          if (!existingEmailUser.dob && currentUser.dob)
            existingEmailUser.dob = currentUser.dob;
          if (!existingEmailUser.targetYear && currentUser.targetYear)
            existingEmailUser.targetYear = currentUser.targetYear;
          if (!existingEmailUser.selectedExam && currentUser.selectedExam)
            existingEmailUser.selectedExam = currentUser.selectedExam;

          existingEmailUser.isOnboardingComplete = true;
          
          // IMPORTANT: Delete the phone-only account FIRST to free up the phone number
          // This prevents duplicate key error on phoneNumber field
          await User.findByIdAndDelete(userId);
          
          // Now save the email account with the phone number
          await existingEmailUser.save();

          // Generate new token for merged account
          const newToken = signToken(existingEmailUser);

          return res.json({
            status: true,
            msg: "Accounts merged successfully",
            merged: true,
            token: newToken,
            data: existingEmailUser,
            redirectTo: "/student/dashboard",
          });
        }

        return res.status(409).json({
          status: false,
          msg: "Email already in use",
        });
      }
    }

    if (updates.phoneNumber) {
      const exists = await User.findOne({
        phoneNumber: updates.phoneNumber,
        _id: { $ne: userId },
      });
      if (exists) {
        return res.status(409).json({
          status: false,
          msg: "Phone already in use",
        });
      }
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select(
      "-password"
    );

    return res.json({
      status: true,
      msg: "Profile updated",
      data: user,
    });
  } catch (err) {
    console.error("updateDetails error:", err);
    return res.status(500).json({
      status: false,
      msg: "Update failed",
    });
  }
};

exports.uploadProfilePic = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ status: false, msg: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({
        status: false,
        msg: "No file uploaded",
      });
    }

    // Store as URL path that can be used directly in frontend
    const filename = req.file.filename;
    const profilePicUrl = `/uploads/${filename}`;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { profilePic: profilePicUrl } },
      { new: true }
    ).select("-password");

    return res.json({
      status: true,
      msg: "Profile pic updated",
      data: user,
      profilePic: profilePicUrl,
    });
  } catch (err) {
    console.error("uploadProfilePic error:", err);
    return res.status(500).json({
      status: false,
      msg: "Upload failed",
    });
  }
};

// ---------------- Dashboard selections ----------------
exports.saveCategory = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { category } = req.body;

    if (!userId) {
      return res.status(401).json({ status: false, msg: "Unauthorized" });
    }

    if (!category) {
      return res.status(400).json({ status: false, msg: "Category required" });
    }

    const user = await User.findByIdAndUpdate(userId, { $set: { selectedCategory: category } }, { new: true }).select(
      "-password"
    );

    return res.json({
      status: true,
      msg: "Category saved",
      data: user,
    });
  } catch (err) {
    console.error("saveCategory error:", err);
    return res.status(500).json({ status: false, msg: "Save failed" });
  }
};

exports.saveExam = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { exam } = req.body;

    if (!userId) {
      return res.status(401).json({ status: false, msg: "Unauthorized" });
    }

    if (!exam) {
      return res.status(400).json({ status: false, msg: "Exam required" });
    }

    const user = await User.findByIdAndUpdate(userId, { $set: { selectedExam: exam, isOnboardingComplete: true } }, { new: true }).select(
      "-password"
    );

    return res.json({
      status: true,
      msg: "Exam saved",
      data: user,
    });
  } catch (err) {
    console.error("saveExam error:", err);
    return res.status(500).json({ status: false, msg: "Save failed" });
  }
};

// ---------------- Courses ----------------
exports.enrollInCourse = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { courseId } = req.params;

    if (!userId) {
      return res.status(401).json({ status: false, msg: "Unauthorized" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ status: false, msg: "Course not found" });
    }

    const user = await User.findById(userId);
    user.enrolledCourses = user.enrolledCourses || [];

    const existing = user.enrolledCourses.find((c) => String(c.courseId) === String(courseId));

    if (!existing) {
      user.enrolledCourses.push({
        courseId,
        status: "locked",
        enrolledAt: new Date(),
      });
    }

    await user.save();

    return res.json({
      status: true,
      msg: "Enrolled (locked). Complete payment to unlock.",
      data: user.enrolledCourses,
    });
  } catch (err) {
    console.error("enrollInCourse error:", err);
    return res.status(500).json({ status: false, msg: "Enroll failed" });
  }
};

exports.unlockCourseForStudent = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { courseId } = req.params;
    const { amount, paymentMethod = "manual", notes = "" } = req.body || {};

    if (!userId) {
      return res.status(401).json({ status: false, msg: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, msg: "User not found" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ status: false, msg: "Course not found" });
    }

    const existingPayment = await Payment.findOne({
      userId,
      courseId,
      status: "paid",
    });

    if (existingPayment) {
      user.enrolledCourses = user.enrolledCourses || [];
      const existingEnrollment = user.enrolledCourses.find(
        (c) => String(c.courseId) === String(courseId)
      );
      if (existingEnrollment && existingEnrollment.status !== "unlocked") {
        existingEnrollment.status = "unlocked";
        await user.save();
      }
      const existingReceipt = await Receipt.findOne({ paymentId: existingPayment._id });
      return res.json({
        status: true,
        msg: "Course already unlocked",
        data: user.enrolledCourses,
        paymentId: existingPayment._id,
        receiptNumber: existingReceipt?.receiptNumber || existingPayment.receiptNumber || null,
      });
    }

    user.enrolledCourses = user.enrolledCourses || [];

    const existing = user.enrolledCourses.find((c) => String(c.courseId) === String(courseId));

    if (!existing) {
      user.enrolledCourses.push({
        courseId,
        status: "unlocked",
        enrolledAt: new Date(),
      });
    } else {
      existing.status = "unlocked";
    }

    await user.save();

    const finalAmountRupees = amount !== undefined ? Number(amount) : course.price || 0;
    const amountInPaise = Math.round(finalAmountRupees * 100);

    const BillingSettings = require("../models/BillingSettings");
    let billingSettings = await BillingSettings.findOne({ isActive: true }).lean();

    let companyDetails = {
      name: "Tathagat Education",
      logo: "",
      address: "",
      phone: "",
      email: "",
      gstin: "",
      website: "",
    };

    if (billingSettings) {
      const addressParts = [
        billingSettings.address?.street,
        billingSettings.address?.city,
        billingSettings.address?.state,
        billingSettings.address?.pincode,
        billingSettings.address?.country,
      ].filter(Boolean);

      companyDetails = {
        name: billingSettings.companyName || "Tathagat Education",
        logo: billingSettings.companyLogo || "",
        address: addressParts.join(", "),
        phone: billingSettings.phone || "",
        email: billingSettings.email || "",
        gstin: billingSettings.gstNumber || "",
        website: billingSettings.website || "",
      };
    }

    const payment = await Payment.create({
      userId,
      courseId,
      razorpay_order_id: `manual_unlock_${userId}_${courseId}_${Date.now()}`,
      razorpay_payment_id: null,
      amount: amountInPaise,
      originalAmount: amountInPaise,
      currency: "INR",
      status: "paid",
      paymentMethod: paymentMethod || "manual",
      notes: notes || "Course unlocked manually",
      validityStartDate: new Date(),
    });

    const receiptNumber = Receipt.generateReceiptNumber();
    await Receipt.create({
      paymentId: payment._id,
      userId,
      courseId,
      receiptNumber,
      amount: amountInPaise,
      totalAmount: amountInPaise,
      taxAmount: 0,
      currency: "INR",
      customerDetails: {
        name: user.name || "Student",
        email: user.email || "no-email@example.com",
        phone: user.phoneNumber || "",
      },
      courseDetails: {
        name: course.name || "Course",
        description: course.description || "",
        price: amountInPaise,
      },
      companyDetails,
      receiptType: "course_purchase",
      status: "generated",
      generatedAt: new Date(),
    });

    return res.json({
      status: true,
      msg: "Course unlocked",
      data: user.enrolledCourses,
      paymentId: payment._id,
      receiptNumber,
    });
  } catch (err) {
    console.error("unlockCourseForStudent error:", err);
    return res.status(500).json({ status: false, msg: "Unlock failed" });
  }
};

exports.getUnlockedCourses = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ status: false, msg: "Unauthorized" });
    }

    const user = await User.findById(userId)
      .populate("enrolledCourses.courseId")
      .select("-password");

    if (!user) {
      return res.status(404).json({ status: false, msg: "User not found" });
    }

    const enrolled = user.enrolledCourses || [];
    const unlocked = enrolled.filter((c) => c.status === "unlocked");

    return res.json({
      status: true,
      msg: "My courses fetched",
      enrolledCourses: enrolled,
      unlockedCourses: unlocked,
    });
  } catch (err) {
    console.error("getUnlockedCourses error:", err);
    return res.status(500).json({ status: false, msg: "Fetch failed" });
  }
};

// ---------------- Payments ----------------
exports.createOrder = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { courseId, couponCode } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, status: false, msg: "Unauthorized", message: "Unauthorized" });
    }
    if (!courseId) {
      return res
        .status(400)
        .json({ success: false, status: false, msg: "courseId required", message: "courseId required" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, status: false, msg: "Course not found", message: "Course not found" });
    }

    const originalAmountRupees = parsePriceRupees(course.price);
    let amountRupees = originalAmountRupees;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
      if (coupon && coupon.isActive) {
        const now = new Date();
        const notExpired = !coupon.expiryDate || new Date(coupon.expiryDate) >= now;
        const withinLimit = coupon.maxUses === 0 || coupon.usedCount < coupon.maxUses;
        const courseApplicable = coupon.applicableTo === 'all' ||
          coupon.courses.map(c => c.toString()).includes(courseId);
        let userCanUse = true;
        if (coupon.maxUsesPerUser > 0) {
          const userUseCount = coupon.usedBy.filter(u => u.userId?.toString() === userId.toString()).length;
          if (userUseCount >= coupon.maxUsesPerUser) userCanUse = false;
        }

        if (notExpired && withinLimit && courseApplicable && userCanUse) {
          const discount = Math.round(amountRupees * coupon.discountPercent / 100);
          amountRupees = amountRupees - discount;
          appliedCoupon = coupon;
        }
      }
    }

    if (!amountRupees || amountRupees <= 0) {
      return res.status(400).json({
        success: false,
        status: false,
        msg: "Invalid course price",
        message: "Invalid course price",
      });
    }

    const razorpay = getRazorpay();

    // OLD (kept for reference, not deleted):
    // receipt: `rcpt_${userId}_${courseId}_${Date.now()}`,

    // ✅ FIX: short receipt to avoid Razorpay rejection/500
    const receipt = makeShortReceipt(userId, courseId);

    const options = {
      amount: Math.round(amountRupees * 100), // paise
      currency: "INR",
      receipt,
      notes: { userId: String(userId), courseId: String(courseId) },
    };

    const order = await razorpay.orders.create(options);

    try {
      await Payment.create({
        userId,
        courseId,
        razorpay_order_id: order.id,
        amount: amountRupees,
        currency: "INR",
        status: "created",
        originalAmount: originalAmountRupees,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        discountPercent: appliedCoupon ? appliedCoupon.discountPercent : undefined,
      });
    } catch (e) {
      console.warn("Payment create warning:", e?.message);
    }

    if (appliedCoupon) {
      appliedCoupon.usedCount += 1;
      appliedCoupon.usedBy.push({ userId, courseId });
      await appliedCoupon.save();
    }

    const publicKey = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY;

    return res.json({
      success: true,
      status: true,
      msg: "Order created",
      message: "Order created",
      order,
      key: publicKey,
      keyId: publicKey,
      amount: amountRupees,
      originalAmount: originalAmountRupees,
      couponApplied: appliedCoupon ? appliedCoupon.code : null,
      discountPercent: appliedCoupon ? appliedCoupon.discountPercent : 0,
      courseId,
    });
  } catch (err) {
    const rpMsg =
      err?.error?.description ||
      err?.error?.reason ||
      err?.response?.data?.error?.description ||
      err?.message ||
      "Order creation failed";

    console.error("createOrder error:", err?.response?.data || err);

    return res.status(500).json({
      success: false,
      status: false,
      msg: rpMsg,
      message: rpMsg,
    });
  }
};

exports.verifyAndUnlockPayment = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, status: false, msg: "Unauthorized", message: "Unauthorized" });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
      // optional dev friendly payload:
      devMode,
    } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        status: false,
        msg: "courseId required",
        message: "courseId required",
      });
    }

    // Dev bypass ONLY if you explicitly pass devMode=true
    if (devMode === true && process.env.NODE_ENV !== "production") {
      console.log("🔧 Dev bypass enabled by request");
    } else {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          status: false,
          msg: "Payment verification fields are required",
          message: "Payment verification fields are required",
        });
      }

      // ✅ FIX: secret fallback (same as getRazorpay)
      const secret =
        process.env.RAZORPAY_KEY_SECRET ||
        process.env.RAZORPAY_KEY_SECRET_KEY ||
        process.env.RAZORPAY_SECRET;

      if (!secret) {
        return res.status(500).json({
          success: false,
          status: false,
          msg: "Razorpay secret missing",
          message: "Razorpay secret missing",
        });
      }

      const generated = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generated !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          status: false,
          msg: "Invalid payment signature",
          message: "Invalid payment signature",
        });
      }
    }

    // Mark payment paid (best-effort)
    try {
      const payment =
        (razorpay_order_id &&
          (await Payment.findOne({
            razorpay_order_id,
            // ✅ more safe:
            userId,
            courseId,
          }))) ||
        null;

      if (payment) {
        payment.status = "paid";
        payment.razorpay_payment_id = razorpay_payment_id;
        payment.razorpay_signature = razorpay_signature;
        await payment.save();
      } else {
        // if payment not found, create it (keep best-effort)
        const course = await Course.findById(courseId).lean();
        const amountRupees = parsePriceRupees(course?.price);

        await Payment.create({
          userId,
          courseId,
          razorpay_order_id: razorpay_order_id || `dev_${Date.now()}`,
          razorpay_payment_id: razorpay_payment_id || `dev_pay_${Date.now()}`,
          razorpay_signature: razorpay_signature || "dev_signature",
          amount: amountRupees || 0,
          originalAmount: amountRupees || 0,
          currency: "INR",
          status: "paid",
        });
      }
    } catch (e) {
      console.warn("Payment update warning:", e?.message);
    }

    // Unlock course in user doc
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, status: false, msg: "User not found", message: "User not found" });
    }

    user.enrolledCourses = user.enrolledCourses || [];
    const existing = user.enrolledCourses.find((c) => String(c.courseId) === String(courseId));

    if (!existing) {
      user.enrolledCourses.push({
        courseId,
        status: "unlocked",
        enrolledAt: new Date(),
      });
    } else {
      existing.status = "unlocked";
    }

    await user.save();

    // Fetch course details for email
    const course = await Course.findById(courseId).lean();

    // Create receipt (best-effort) - kept minimal like your original
    try {
      await Receipt.create({
        userId,
        courseId,
        razorpay_order_id: razorpay_order_id || null,
        razorpay_payment_id: razorpay_payment_id || null,
        amount: 0,
        status: "paid",
        createdAt: new Date(),
      });
    } catch (e) {
      console.warn("Receipt create warning:", e?.message);
    }

    // Send course purchase confirmation email (async, don't block response)
    if (user.email && course) {
      sendCoursePurchaseEmail(user, course, { amount: course.price * 100 })
        .catch(err => console.log('Purchase email error:', err.message));
    }

    return res.json({
      success: true,
      status: true,
      msg: "Payment verified & course unlocked",
      message: "Payment verified & course unlocked",
      enrolledCourses: user.enrolledCourses,
    });
  } catch (err) {
    console.error("verifyAndUnlockPayment error:", err);
    return res.status(500).json({
      success: false,
      status: false,
      msg: "Payment verification failed",
      message: "Payment verification failed",
    });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ status: false, msg: "Unauthorized" });
    }

    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });

    return res.json({
      status: true,
      msg: "Payment history",
      data: payments,
    });
  } catch (err) {
    console.error("getPaymentHistory error:", err);
    return res.status(500).json({ status: false, msg: "Fetch failed" });
  }
};

exports.getReceipts = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ status: false, msg: "Unauthorized" });
    }

    let receipts = await Receipt.find({ userId }).sort({ createdAt: -1 });

    // If no receipts found, generate receipts from existing payments
    if (receipts.length === 0) {
      const payments = await Payment.find({ userId, status: "paid" })
        .populate("courseId")
        .sort({ createdAt: -1 });

      if (payments.length > 0) {
        const user = await User.findById(userId).select("name email phoneNumber");
        const BillingSettings = require("../models/BillingSettings");
        let billingSettings = await BillingSettings.findOne({ isActive: true }).lean();

        for (const payment of payments) {
          // Check if receipt already exists for this payment
          const existingReceipt = await Receipt.findOne({ paymentId: payment._id });
          if (existingReceipt) continue;

          const course = payment.courseId || {};
          const receiptNumber = payment.receiptNumber || Receipt.generateReceiptNumber();

          let companyDetails = {
            name: "Tathagat Education",
            logo: "",
            address: "",
            phone: "",
            email: "",
            gstin: "",
            website: "",
          };

          if (billingSettings) {
            const addressParts = [
              billingSettings.address?.street,
              billingSettings.address?.city,
              billingSettings.address?.state,
              billingSettings.address?.pincode,
              billingSettings.address?.country,
            ].filter(Boolean);

            companyDetails = {
              name: billingSettings.companyName || "Tathagat Education",
              logo: billingSettings.companyLogo || "",
              address: addressParts.join(", "),
              phone: billingSettings.phone || "",
              email: billingSettings.email || "",
              gstin: billingSettings.gstNumber || "",
              website: billingSettings.website || "",
            };
          }

          try {
            await Receipt.create({
              paymentId: payment._id,
              userId,
              courseId: payment.courseId?._id || payment.courseId,
              receiptNumber,
              amount: payment.amount || 0,
              totalAmount: payment.amount || 0,
              taxAmount: 0,
              currency: payment.currency || "INR",
              customerDetails: {
                name: user?.name || "Student",
                email: user?.email || "no-email@example.com",
                phone: user?.phoneNumber || "",
              },
              courseDetails: {
                name: course.name || "Course",
                description: course.description || "",
                price: payment.amount || 0,
              },
              companyDetails,
              receiptType: "course_purchase",
              status: "generated",
              generatedAt: payment.createdAt || new Date(),
            });
          } catch (createErr) {
            console.warn("Receipt creation warning:", createErr.message);
          }
        }

        // Fetch again after creating
        receipts = await Receipt.find({ userId }).sort({ createdAt: -1 });
      }
    }

    return res.json({
      status: true,
      msg: "Receipts fetched",
      data: receipts,
    });
  } catch (err) {
    console.error("getReceipts error:", err);
    return res.status(500).json({ status: false, msg: "Fetch failed" });
  }
};

exports.downloadReceipt = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { receiptId } = req.params;
    const format = req.query.format || "json";

    console.log(`[downloadReceipt] receiptId=${receiptId}, userId=${userId}, format=${format}`);

    if (!userId) {
      console.log("[downloadReceipt] No userId found");
      return res.status(401).json({ status: false, msg: "Unauthorized" });
    }

    const receipt = await Receipt.findOne({ _id: receiptId, userId });
    if (!receipt) {
      console.log(`[downloadReceipt] Receipt not found for id=${receiptId}, userId=${userId}`);
      return res.status(404).json({ status: false, msg: "Receipt not found" });
    }

    console.log("[downloadReceipt] Receipt found:", receipt.receiptNumber);

    if (format === "html") {
      const { generateReceiptHTML } = require("../utils/receiptGenerator");
      const BillingSettings = require("../models/BillingSettings");

      let billingSettings = await BillingSettings.findOne({ isActive: true }).lean();

      let receiptData = receipt.getReceiptData();
      console.log("[downloadReceipt] Receipt data:", JSON.stringify(receiptData, null, 2));

      if (billingSettings) {
        const addressParts = [
          billingSettings.address?.street,
          billingSettings.address?.city,
          billingSettings.address?.state,
          billingSettings.address?.pincode,
          billingSettings.address?.country,
        ].filter(Boolean);

        receiptData.company = {
          name: billingSettings.companyName || receiptData.company?.name || "Tathagat Education",
          logo: billingSettings.companyLogo || receiptData.company?.logo || "",
          address: addressParts.join(", ") || receiptData.company?.address || "",
          phone: billingSettings.phone || receiptData.company?.phone || "",
          email: billingSettings.email || receiptData.company?.email || "",
          gstin: billingSettings.gstNumber || receiptData.company?.gstin || "",
          website: billingSettings.website || receiptData.company?.website || "",
        };

        receiptData.companyLogo = billingSettings.companyLogo || "";
      }

      const html = generateReceiptHTML(receiptData);
      console.log("[downloadReceipt] HTML generated successfully, length:", html.length);

      try {
        await receipt.markAsDownloaded();
      } catch (markErr) {
        console.warn("[downloadReceipt] Failed to mark as downloaded:", markErr.message);
      }

      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", `inline; filename="receipt-${receipt.receiptNumber}.html"`);
      return res.send(html);
    }

    if (format === "text") {
      const { generateReceiptText } = require("../utils/receiptGenerator");
      const receiptData = receipt.getReceiptData();
      const text = generateReceiptText(receiptData);

      await receipt.markAsDownloaded();

      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", `attachment; filename="receipt-${receipt.receiptNumber}.txt"`);
      return res.send(text);
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=receipt_${receiptId}.json`);
    return res.send(JSON.stringify(receipt, null, 2));
  } catch (err) {
    console.error("downloadReceipt error:", err);
    return res.status(500).json({ status: false, msg: "Download failed" });
  }
};
