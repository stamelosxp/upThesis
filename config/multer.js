import multer from "multer";
import {fileURLToPath} from "url";
import {dirname, join, extname, basename} from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function normalizeFilename(filename) {
    return filename
        .toLowerCase()        // make all letters lowercase
        .replace(/[-\s]+/g, "_"); // replace - and spaces (one or more) with _
}



const topicUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, join(__dirname, "../uploads/topics"));
        },
        filename: (req, file, cb) => {
            const ext = extname(file.originalname);
            const name = basename(normalizeFilename(file.originalname), ext);
            cb(null, `${name}_${Date.now()}${ext}`);
        }
    })
});

const profileImageUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, join(__dirname, "../uploads/profile_photo"));
        },
        filename: (req, file, cb) => {
            const ext = extname(file.originalname);
            const name = basename(normalizeFilename(file.originalname), ext);
            cb(null, `${name}_${Date.now()}${ext}`);
        }
    })
});

export {topicUpload, profileImageUpload};
