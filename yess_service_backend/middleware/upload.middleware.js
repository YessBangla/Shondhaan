import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDir = "uploads";
const providerNidDir = path.join(uploadDir, "providers", "nid");

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(providerNidDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, file.fieldname === "nid_front" || file.fieldname === "nid_back" ? providerNidDir : uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

export const upload = multer({ storage });
