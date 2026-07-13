import express from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

const router = express.Router();

const uploadsRoot = path.join(process.cwd(), "uploads");

const safeFolder = (value) =>
  String(value || "deal")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "") || "deal";

// Memory storage: original image will NOT be saved directly
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG and WEBP images are allowed"));
    }

    cb(null, true);
  },
});

router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    const folder = safeFolder(req.query.folder || req.body.folder || "deal");

    const uploadDir = path.join(uploadsRoot, folder);
    const thumbDir = path.join(uploadsRoot, folder, "thumbs");

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(thumbDir, { recursive: true });

    const filenameBase = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const mainFilename = `${filenameBase}.webp`;
    const thumbFilename = `${filenameBase}-thumb.webp`;

    const mainPath = path.join(uploadDir, mainFilename);
    const thumbPath = path.join(thumbDir, thumbFilename);

    // Main optimized image
    await sharp(req.file.buffer)
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 78,
        effort: 5,
      })
      .toFile(mainPath);

    // Small thumbnail for listing card
    await sharp(req.file.buffer)
      .rotate()
      .resize({
        width: 450,
        height: 450,
        fit: "cover",
      })
      .webp({
        quality: 70,
        effort: 4,
      })
      .toFile(thumbPath);

    const imageUrl = `/uploads/${folder}/${mainFilename}`;
    const thumbnailUrl = `/uploads/${folder}/thumbs/${thumbFilename}`;

    return res.status(201).json({
      success: true,
      message: "Image optimized and uploaded successfully",
      image_url: imageUrl,
      url: imageUrl,
      thumbnail_url: thumbnailUrl,
    });
  } catch (error) {
    console.error("Image optimize upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Image upload failed",
      error: error.message,
    });
  }
});

export default router;