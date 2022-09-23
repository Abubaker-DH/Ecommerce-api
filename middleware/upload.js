const multer = require("multer");

// INFO: Setup image folder and image URL
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().replace(/[\/\\:]/g, "-") +
        "%" +
        file.originalname
    );
  },
});

// INFO: Type of file that acceptaple to upload
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/JPG" ||
    file.mimetype === "image/PNG" ||
    file.mimetype === "image/JPEG"
  ) {
    cb(null, true);
  } else {
    return cb((new Error("The images type are not allowed"), false));
  }
};

const upload = multer({ storage: fileStorage, fileFilter: fileFilter });
exports.upload = upload;
