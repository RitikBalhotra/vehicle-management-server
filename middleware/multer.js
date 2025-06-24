import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = file.mimetype.startsWith("image/") || file.mimetype === "application/pdf";
    if (!allowed) {
      console.warn(`Rejected file: ${file.originalname} | Type: ${file.mimetype}`);
      return cb(new Error("Unsupported file type"), false);
    }
    cb(null, true);
  },
});

export default upload;
