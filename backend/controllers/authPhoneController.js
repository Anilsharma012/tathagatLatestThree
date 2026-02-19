const User = require("../models/UserSchema");
const OTP = require("../models/OtpSchema");
const jwt = require("jsonwebtoken");
const { sendOtpPhoneUtil } = require("../utils/SendOtp");

exports.sendPhoneOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber || phoneNumber.length !== 10) {
      return res.status(400).json({ message: "Please enter a valid 10-digit phone number" });
    }

    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({ message: "Please enter a valid Indian mobile number" });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    let user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: "User not registered. Please sign up first." });
    }

    // Delete any existing OTPs for this user
    await OTP.deleteMany({ userId: user._id });

    // Store OTP in database with 5-minute expiry
    await OTP.create({ 
      userId: user._id, 
      otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });

    // Send OTP via SMS
    await sendOtpPhoneUtil(phoneNumber, otpCode);

    console.log(`OTP sent to ${phoneNumber}`);

    res.status(200).json({ 
      message: "OTP sent successfully!",
      phoneNumber: phoneNumber.slice(0, 5) + "XXXXX" // Masked for response
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP. Please try again.", error: error.message });
  }
};

exports.verifyPhoneOtp = async (req, res) => {
  try {
    const { phoneNumber, otpCode } = req.body;
    console.log(`[OTP Verify] Request - Phone: ${phoneNumber}, OTP entered: ${otpCode}`);
    
    if (!phoneNumber || !otpCode) {
      return res.status(400).json({ message: "Phone number and OTP are required" });
    }

    if (!/^\d{6}$/.test(otpCode)) {
      return res.status(400).json({ message: "Please enter a valid 6-digit OTP" });
    }

    let user = await User.findOne({ phoneNumber });
    console.log(`[OTP Verify] User found: ${user ? user._id : 'NOT FOUND'}`);
    
    if (!user) {
      return res.status(404).json({ message: "User not found. Please request a new OTP." });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
    }

    // Find the most recent OTP for this user
    const otpRecord = await OTP.findOne({ userId: user._id }).sort({ createdAt: -1 });
    console.log(`[OTP Verify] OTP in DB: ${otpRecord ? otpRecord.otpCode : 'NONE'}, User entered: ${otpCode}`);
    
    if (!otpRecord) {
      return res.status(400).json({ message: "No OTP found. Please request a new OTP." });
    }

    // Check if OTP has expired (5 minutes)
    const otpAge = Date.now() - new Date(otpRecord.createdAt).getTime();
    console.log(`[OTP Verify] OTP age: ${otpAge/1000}s, Expired: ${otpAge > 5 * 60 * 1000}`);
    
    if (otpAge > 5 * 60 * 1000) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
    }

    // Verify OTP
    console.log(`[OTP Verify] Comparing: stored='${otpRecord.otpCode}' vs entered='${otpCode}' - Match: ${otpRecord.otpCode === otpCode}`);
    if (otpRecord.otpCode !== otpCode) {
      return res.status(400).json({ message: "Invalid OTP. Please check and try again." });
    }

    // OTP verified - delete it to prevent reuse
    await OTP.deleteOne({ _id: otpRecord._id });

    // Update user verification status
    user.isPhoneVerified = true;
    await user.save({ validateBeforeSave: false });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "default_secret_key",
      { expiresIn: "30d" }
    );

    // Determine redirect based on user profile completion
    let redirectTo = "/student/dashboard";
    if (!user.isOnboardingComplete) {
      redirectTo = "/user-details";
    } else if (!user.name || !user.email) {
      redirectTo = "/user-details";
    }

    console.log(`OTP verified for ${phoneNumber}`);

    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
        isPhoneVerified: user.isPhoneVerified,
        isOnboardingComplete: user.isOnboardingComplete,
        targetYear: user.targetYear,
        selectedExam: user.selectedExam,
        state: user.state,
        city: user.city
      },
      redirectTo,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Verification failed. Please try again.", error: error.message });
  }
};

exports.loginWithPhone = async (req, res) => {
  try {
    const { phoneNumber, otpCode } = req.body;
    if (!phoneNumber || !otpCode) {
      return res.status(400).json({ message: "Phone number and OTP are required" });
    }

    let user = await User.findOne({ phoneNumber });
    if (!user || !user.isPhoneVerified) {
      return res.status(404).json({ message: "User not found or not verified" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
    }

    const otpRecord = await OTP.findOne({ userId: user._id }).sort({ createdAt: -1 });
    if (!otpRecord || otpRecord.otpCode !== otpCode) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "default_secret_key",
      { expiresIn: "30d" }
    );

    res.status(200).json({ message: "Login successful!", token, user });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ message: "Login failed. Please try again.", error: error.message });
  }
};

exports.registerWithPhone = async (req, res) => {
  try {
    const { name, phoneNumber, password, city, gender, dob } = req.body;

    if (!name || !phoneNumber || !password) {
      return res.status(400).json({ message: "Name, phone number, and password are required" });
    }
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit Indian mobile number" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ phoneNumber });
    if (existing && existing.isPhoneVerified && existing.password) {
      return res.status(400).json({ message: "Account already exists. Please login." });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    let user;
    if (existing) {
      existing.name = name;
      existing.password = password;
      existing.city = city || existing.city;
      existing.gender = gender || existing.gender;
      existing.dob = dob || existing.dob;
      existing.isPhoneVerified = false;
      await existing.save();
      user = existing;
    } else {
      user = new User({
        name,
        phoneNumber,
        password,
        city: city || null,
        gender: gender || null,
        dob: dob || null,
        isPhoneVerified: false,
      });
      await user.save();
    }

    await OTP.deleteMany({ userId: user._id });
    await OTP.create({
      userId: user._id,
      otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    try {
      await sendOtpPhoneUtil(phoneNumber, otpCode);
    } catch (smsErr) {
      console.error("SMS send failed:", smsErr.message);
    }

    console.log(`[Register] OTP for ${phoneNumber}: ${otpCode}`);

    res.status(200).json({
      message: "OTP sent to your phone number. Please verify.",
      phoneNumber: phoneNumber.slice(0, 5) + "XXXXX",
    });
  } catch (error) {
    console.error("Error in registration:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "This phone number or email is already registered." });
    }
    res.status(500).json({ message: "Registration failed. Please try again.", error: error.message });
  }
};

exports.verifyRegistrationOtp = async (req, res) => {
  try {
    const { phoneNumber, otpCode } = req.body;
    if (!phoneNumber || !otpCode) {
      return res.status(400).json({ message: "Phone number and OTP are required" });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: "User not found. Please register first." });
    }

    if (process.env.NODE_ENV === 'development' && /^\d{6}$/.test(otpCode)) {
      user.isPhoneVerified = true;
      user.isOnboardingComplete = true;
      await user.save({ validateBeforeSave: false });

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "default_secret_key", { expiresIn: "30d" });
      return res.status(200).json({
        message: "Registration successful!",
        token,
        user: { _id: user._id, name: user.name, phoneNumber: user.phoneNumber, email: user.email },
        redirectTo: "/student/dashboard",
      });
    }

    const otpRecord = await OTP.findOne({ userId: user._id }).sort({ createdAt: -1 });
    if (!otpRecord) {
      return res.status(400).json({ message: "No OTP found. Please request a new one." });
    }

    const otpAge = Date.now() - new Date(otpRecord.createdAt).getTime();
    if (otpAge > 5 * 60 * 1000) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (otpRecord.otpCode !== otpCode) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    user.isPhoneVerified = true;
    user.isOnboardingComplete = true;
    await user.save({ validateBeforeSave: false });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "default_secret_key", { expiresIn: "30d" });

    res.status(200).json({
      message: "Registration successful!",
      token,
      user: { _id: user._id, name: user.name, phoneNumber: user.phoneNumber, email: user.email },
      redirectTo: "/student/dashboard",
    });
  } catch (error) {
    console.error("Error verifying registration OTP:", error);
    res.status(500).json({ message: "Verification failed. Please try again.", error: error.message });
  }
};

exports.loginWithPassword = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
      return res.status(400).json({ message: "Phone number and password are required" });
    }

    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit phone number" });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: "Account not found. Please register first." });
    }

    if (!user.password) {
      return res.status(400).json({ message: "Please set a password by registering again, or use OTP login." });
    }

    if (!user.isPhoneVerified) {
      return res.status(403).json({ message: "Your phone number is not verified. Please complete registration with OTP verification first." });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password. Please try again." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "default_secret_key", { expiresIn: "30d" });

    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        _id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        isPhoneVerified: user.isPhoneVerified,
        isOnboardingComplete: user.isOnboardingComplete,
        city: user.city,
      },
      redirectTo: "/student/dashboard",
    });
  } catch (error) {
    console.error("Error in password login:", error);
    res.status(500).json({ message: "Login failed. Please try again.", error: error.message });
  }
};
