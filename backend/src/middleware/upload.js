const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const uploadDir = process.env.UPLOAD_PATH || "uploads/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
    cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${uuidv4()}${ext}`;
        cb(null, uniqueName);
    },
});

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
]);

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
        cb(null, true);   
    } else {
        cb(new Error(`File type '${file.mimetype}' is not allowed`), false);
    }
};

const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "10", 10);

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_SIZE_MB * 1024 * 1024, 
        files: 5,                           
    },
});

const handleUploadError = (multerMiddleware) => (req, res, next) => {
    multerMiddleware(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError) {
        const messages = {
            LIMIT_FILE_SIZE: `File too large. Maximum size is ${MAX_SIZE_MB}MB.`,
            LIMIT_FILE_COUNT: "Too many files. Maximum 5 files per upload.",
            LIMIT_UNEXPECTED_FILE: "Unexpected field name in upload.",
        };
        return res.status(400).json({
            success: false,
            message: messages[err.code] || `Upload error: ${err.message}`,
        });
    }

    return res.status(400).json({ success: false, message: err.message });
    });
};

module.exports = {
    uploadSingle: handleUploadError(upload.single("file")),
    uploadMultiple: handleUploadError(upload.array("files", 5)),
    uploadDir,
};