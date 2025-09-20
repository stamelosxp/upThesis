import multer from "multer";
import { fileURLToPath } from "url";
import { dirname, join, extname, basename } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function normalizeFilename(filename) {
  return filename
    .toLowerCase() // make all letters lowercase
    .replace(/[-\s]+/g, "_"); // replace - and spaces (one or more) with _
}

// 1. Define storage for topic files
const topicUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, join(__dirname, "../uploads/topics"));
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname);
      const name = basename(normalizeFilename(file.originalname), ext);
      cb(null, `${name}_${Date.now()}${ext}`);
    },
  }),
});

// 2. Define storage for profile images
const profileImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, join(__dirname, "../uploads/profile_photo"));
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname);
      // Need to change this to user ID or username later
    //   const username = req.user?.username || "guest"; 
      cb(null, `${"user"}_${Date.now()}${ext}`);
    },
  }),
});

// 3. Define storage for temporary report files
const tmpReportUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, join(__dirname, "../uploads/temp_thesis_files"));
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname);
      const name = basename(normalizeFilename(file.originalname), ext);
      cb(null, `${name}_${Date.now()}${ext}`);
    },
  }),
});

// 4. Middleware for JSON file uploads (in memory)
const jsonFileUpload = multer({ storage: multer.memoryStorage() });

export { topicUpload, profileImageUpload, tmpReportUpload, jsonFileUpload };
