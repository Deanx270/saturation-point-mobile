const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'saturation_point_mobile',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/') || file.mimetype === 'image/gif') {
    return cb(new Error('Only static image files (JPEG, PNG, WebP) are allowed'), false);
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

module.exports = {
  cloudinary,
  upload,
};
