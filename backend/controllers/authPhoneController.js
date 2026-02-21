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

    await OTP.deleteMany(user ? { userId: user._id } : { phoneNumber });

    await OTP.create({ 
      userId: user ? user._id : undefined, 
      phoneNumber,
      otpCode,
    });

    await sendOtpPhoneUtil(phoneNumber, otpCode);

    console.log(`OTP sent to ${phoneNumber}`);

    res.status(200).json({ 
      message: "OTP sent successfully!",
      phoneNumber: phoneNumber.slice(0, 5) + "XXXXX"
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

    let otpRecord;
    if (user) {
      otpRecord = await OTP.findOne({ userId: user._id }).sort({ createdAt: -1 });
      if (!otpRecord) {
        otpRecord = await OTP.findOne({ phoneNumber }).sort({ createdAt: -1 });
      }
    } else {
      otpRecord = await OTP.findOne({ phoneNumber }).sort({ createdAt: -1 });
    }

    console.log(`[OTP Verify] User found: ${user ? user._id : 'NOT FOUND'}, OTP record: ${otpRecord ? 'YES' : 'NONE'}`);
    
    if (!otpRecord) {
      return res.status(400).json({ message: "No OTP found. Please request a new OTP." });
    }

    const otpAge = Date.now() - new Date(otpRecord.createdAt).getTime();
    if (otpAge > 5 * 60 * 1000) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
    }

    if (otpRecord.otpCode !== otpCode) {
      return res.status(400).json({ message: "Invalid OTP. Please check and try again." });
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    if (!user) {
      console.log(`[OTP Verify] No user for ${phoneNumber}, redirecting to signup`);
      return res.status(200).json({
        message: "OTP verified! Please complete your registration.",
        userExists: false,
        phoneNumber,
      });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
    }

    user.isPhoneVerified = true;
    await user.save({ validateBeforeSave: false });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "default_secret_key",
      { expiresIn: "30d" }
    );

    let redirectTo = "/student/dashboard";
    if (!user.isOnboardingComplete) {
      redirectTo = "/user-details";
    } else if (!user.name || !user.email) {
      redirectTo = "/user-details";
    }

    console.log(`OTP verified for ${phoneNumber}, user exists, logging in`);

    res.status(200).json({
      message: "Login successful!",
      userExists: true,
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

    if (!name || !phoneNumber) {
      return res.status(400).json({ message: "Name and phone number are required" });
    }
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit Indian mobile number" });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ phoneNumber });
    if (existing && existing.isPhoneVerified) {
      return res.status(400).json({ message: "Account already exists. Please login." });
    }

    let user;
    if (existing) {
      existing.name = name;
      if (password) existing.password = password;
      existing.city = city || existing.city;
      existing.gender = gender || existing.gender;
      existing.dob = dob || existing.dob;
      existing.isPhoneVerified = true;
      existing.isOnboardingComplete = false;
      await existing.save();
      user = existing;
    } else {
      const userData = {
        name,
        phoneNumber,
        city: city || null,
        gender: gender || null,
        dob: dob || null,
        isPhoneVerified: true,
        isOnboardingComplete: false,
      };
      if (password) userData.password = password;
      user = new User(userData);
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "default_secret_key", { expiresIn: "30d" });

    res.status(200).json({
      message: "Account created successfully!",
      token,
      user: { _id: user._id, name: user.name, phoneNumber: user.phoneNumber, email: user.email },
      redirectTo: "/exam-category",
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
      user.isOnboardingComplete = false;
      await user.save({ validateBeforeSave: false });

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "default_secret_key", { expiresIn: "30d" });
      return res.status(200).json({
        message: "Registration successful!",
        token,
        user: { _id: user._id, name: user.name, phoneNumber: user.phoneNumber, email: user.email },
        redirectTo: "/exam-category",
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
    user.isOnboardingComplete = false;
    await user.save({ validateBeforeSave: false });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "default_secret_key", { expiresIn: "30d" });

    res.status(200).json({
      message: "Registration successful!",
      token,
      user: { _id: user._id, name: user.name, phoneNumber: user.phoneNumber, email: user.email },
      redirectTo: "/exam-category",
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
