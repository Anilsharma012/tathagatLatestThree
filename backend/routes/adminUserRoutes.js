const express = require("express");
const router = express.Router();
const AdminUser = require("../models/AdminUser");
const Role = require("../models/Role");
const { adminAuth } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

router.get("/", adminAuth, checkPermission("roleManagement", "view"), async (req, res) => {
  try {
    const { userType, status } = req.query;
    const filter = {};
    if (userType) filter.userType = userType;
    if (status) filter.status = status;

    const users = await AdminUser.find(filter)
      .select("-password")
      .populate("role", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

router.get("/me", adminAuth, async (req, res) => {
  try {
    const user = await AdminUser.findById(req.user.id)
      .select("-password")
      .populate("role");

    if (!user) {
      return res.json({
        success: true,
        user: {
          _id: req.user.id,
          fullName: req.user.name || "Super Admin",
          email: req.user.email,
          userType: "superadmin",
          status: "active"
        },
        permissions: await getFullPermissions()
      });
    }

    const permissions = await user.getEffectivePermissions();
    res.json({ success: true, user, permissions });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ success: false, message: "Failed to fetch user info" });
  }
});

async function getFullPermissions() {
  const allPermissions = {};
  const modules = [
    "dashboard", "students", "courses", "batches", "liveClasses", "liveBatches",
    "mockTests", "mockTestFeedback", "practiceTests", "payments", "coupons", "notifications",
    "announcements", "popupAnnouncements", "leads", "reports", "faculty", "blogs", "demoVideos",
    "studyMaterials", "pdfManagement", "discussions", "bschools", "iimPredictor", "responseSheets",
    "downloads", "gallery", "scoreCards", "successStories", "topPerformers", "coursePurchaseContent",
    "crm", "billing", "roleManagement"
  ];
  modules.forEach(mod => {
    allPermissions[mod] = {
      view: true, create: true, edit: true, delete: true, export: true, approve: true
    };
  });
  return allPermissions;
}

router.get("/:id", adminAuth, checkPermission("roleManagement", "view"), async (req, res) => {
  try {
    const user = await AdminUser.findById(req.params.id)
      .select("-password")
      .populate("role", "name permissions");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
});

router.post("/", adminAuth, checkPermission("roleManagement", "create"), async (req, res) => {
  try {
    const { fullName, email, phone, password, userType, role, status } = req.body;

    const existingUser = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User with this email already exists" });
    }

    const user = new AdminUser({
      fullName,
      email: email.toLowerCase(),
      phone,
      password,
      userType: userType || "subadmin",
      role,
      status: status || "active",
      createdBy: req.user.id
    });

    await user.save();
    const savedUser = await AdminUser.findById(user._id).select("-password").populate("role", "name");

    res.status(201).json({ success: true, message: "User created successfully", user: savedUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ success: false, message: "Failed to create user" });
  }
});

router.put("/:id", adminAuth, checkPermission("roleManagement", "edit"), async (req, res) => {
  try {
    const { fullName, email, phone, userType, role, status, customPermissions } = req.body;

    const existingUser = await AdminUser.findOne({
      email: email.toLowerCase(),
      _id: { $ne: req.params.id }
    });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User with this email already exists" });
    }

    const updateData = {
      fullName,
      email: email.toLowerCase(),
      phone,
      userType,
      status
    };

    if (role !== undefined) updateData.role = role || null;
    if (customPermissions !== undefined) updateData.customPermissions = customPermissions;

    const user = await AdminUser.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .select("-password")
      .populate("role", "name");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
});

router.put("/:id/assign-role", adminAuth, checkPermission("roleManagement", "edit"), async (req, res) => {
  try {
    const { roleId, customPermissions } = req.body;

    const updateData = { role: roleId || null };
    if (customPermissions !== undefined) {
      updateData.customPermissions = customPermissions;
    }

    const user = await AdminUser.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .select("-password")
      .populate("role", "name permissions");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "Role assigned successfully", user });
  } catch (error) {
    console.error("Error assigning role:", error);
    res.status(500).json({ success: false, message: "Failed to assign role" });
  }
});

router.put("/:id/toggle-status", adminAuth, checkPermission("roleManagement", "edit"), async (req, res) => {
  try {
    const user = await AdminUser.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.userType === "superadmin") {
      return res.status(400).json({ success: false, message: "Cannot suspend a superadmin" });
    }

    user.status = user.status === "active" ? "suspended" : "active";
    await user.save();

    res.json({
      success: true,
      message: `User ${user.status === "active" ? "activated" : "suspended"} successfully`,
      user: { _id: user._id, status: user.status }
    });
  } catch (error) {
    console.error("Error toggling user status:", error);
    res.status(500).json({ success: false, message: "Failed to update user status" });
  }
});

router.put("/:id/reset-password", adminAuth, checkPermission("roleManagement", "edit"), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const user = await AdminUser.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ success: false, message: "Failed to reset password" });
  }
});

router.delete("/:id", adminAuth, checkPermission("roleManagement", "delete"), async (req, res) => {
  try {
    const user = await AdminUser.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.userType === "superadmin") {
      return res.status(400).json({ success: false, message: "Cannot delete a superadmin" });
    }

    await AdminUser.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await AdminUser.findOne({ email: email.toLowerCase() }).populate("role");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ success: false, message: "Your account has been suspended" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    user.lastLogin = new Date();
    await user.save();

    const permissions = await user.getEffectivePermissions();

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.fullName,
        role: user.userType === "superadmin" ? "admin" : "subadmin",
        userType: user.userType,
        roleId: user.role?._id
      },
      process.env.JWT_SECRET || "secret_admin_key",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        role: user.role,
        status: user.status
      },
      permissions,
      loginRoute: user.role?.loginRoute || ""
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

module.exports = router;
