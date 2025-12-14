import multer from "multer";
import path from "path";
import fs from "fs";

// Correct absolute path to rb Frontend/public/uploads
const uploadsPath = path.join(process.cwd(), "../rb/public/uploads");

// Create folder if missing
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

console.log("CWD:", process.cwd());
console.log("Uploads Path:", uploadsPath);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

export default upload;
