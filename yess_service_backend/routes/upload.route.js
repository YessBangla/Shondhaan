import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const uploadsRoot = path.join(process.cwd(), "uploads");

const safeFolder = (value) => {
  const folder = String(value || "common")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "");

  return folder || "common";
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = safeFolder(req.query.folder || req.body.folder);
    const dir = path.join(uploadsRoot, folder);

    fs.mkdirSync(dir, { recursive: true });

    req.uploadFolder = folder;
    cb(null, dir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext || ".jpg";
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;

    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG and WEBP images are allowed"));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    const folder = req.uploadFolder || "common";
    const imageUrl = `/uploads/${folder}/${req.file.filename}`;

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      image_url: imageUrl,
      url: imageUrl,
    });
  } catch (error) {
    console.error("Upload image error:", error);

    res.status(500).json({
      success: false,
      message: "Image upload failed",
      error: error.message,
    });
  }
});

export default router;