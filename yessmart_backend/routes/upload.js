const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadFolders = {
  products: "mart-products",
  category: "mart-category",
};

const getUploadFolder = (req) =>
  req.query?.folder === uploadFolders.category ? uploadFolders.category : uploadFolders.products;

const getUploadRoot = (req) => path.join(__dirname, "..", "uploads", getUploadFolder(req));
const extensionFromMime = (mime = "") => {
  const subtype = mime.split("/")[1] || "jpg";
  return `.${subtype.replace(/[^a-z0-9.+-]/gi, "").replace("svg+xml", "svg") || "jpg"}`;
};

// Save to /uploads folder in your backend
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadRoot = getUploadRoot(req);
    if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeExt = ext || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype?.startsWith("image/") || file.mimetype?.startsWith("video/")) cb(null, true);
    else cb(new Error("Only image and video files are allowed"));
  },
});

const uploadSingleFile = upload.single("file");

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    uploadSingleFile(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function uploadUrl(req, filename) {
  return `/uploads/${getUploadFolder(req)}/${filename}`;
}

// POST /api/upload
// Supports multipart/form-data uploads with field name "file".
router.post("/", async (req, res) => {
  try {
    await runUpload(req, res);

    // JSON base64 path
    if (req.body?.image && typeof req.body.image === "string") {
      try {
        const dataUrl = req.body.image;
        const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (!match) {
          return res.status(400).json({ success: false, message: "Invalid base64 data URL" });
        }

        const mime = match[1];
        const b64 = match[2];

        if (!mime.startsWith("image/") && !mime.startsWith("video/")) {
          return res.status(400).json({ success: false, message: "Only image and video files are allowed" });
        }

        const uploadRoot = getUploadRoot(req);
        if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

        const extFromMime = extensionFromMime(mime);
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extFromMime}`;
        const filePath = path.join(uploadRoot, filename);

        const buffer = Buffer.from(b64, "base64");
        fs.writeFileSync(filePath, buffer);

        const url = uploadUrl(req, filename);

        console.log("[Upload] Base64 file saved:", url);
        return res.json({ success: true, url });
      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
    }

    // multipart path
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const url = uploadUrl(req, req.file.filename);

    console.log("[Upload] File saved:", url);

    res.json({ success: true, url });
  } catch (err) {
    const status = err instanceof multer.MulterError || err.message === "Only image and video files are allowed" ? 400 : 500;
    console.error("[Upload] Error:", err);
    res.status(status).json({ success: false, message: err.message || "Image upload failed" });
  }
});

module.exports = router;
