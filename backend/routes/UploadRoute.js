const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { adminAuth } = require("../middleware/authMiddleware");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/image/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

router.post("/", adminAuth, upload.single("file"), (req, res) => {
  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({ success: true, url: fileUrl });
});

router.post("/image", adminAuth, upload.single("image"), (req, res) => {
  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({ success: true, url: fileUrl });
});

module.exports = router;
