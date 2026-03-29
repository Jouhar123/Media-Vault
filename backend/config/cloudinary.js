const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Allowed MIME types
const ALLOWED_TYPES = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'audio/mpeg': 'auto',
  'audio/wav': 'auto',
  'audio/ogg': 'auto',
  'application/pdf': 'auto',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const resourceType = ALLOWED_TYPES[file.mimetype] || 'auto';
    return {
      folder: 'mediavault',
      resource_type: resourceType,
      access_mode: 'public',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg', 'pdf'],
      transformation: (resourceType === 'image' || file.mimetype === 'application/pdf') 
  ? [{ quality: 'auto', fetch_format: 'auto' }] 
  : undefined,
    };
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: images, videos, audio, PDF`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = { cloudinary, upload, ALLOWED_TYPES };
