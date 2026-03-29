const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Allowed MIME types → Cloudinary resource_type
// IMPORTANT:
//   - Cloudinary stores PDF as resource_type 'raw' (not 'auto') for reliable delivery
//   - Cloudinary stores audio under resource_type 'video'
//   - 'auto' works for upload but makes delete unreliable — always use explicit types
const MIME_TO_RESOURCE_TYPE = {
  'image/jpeg':      'image',
  'image/png':       'image',
  'image/gif':       'image',
  'image/webp':      'image',
  'video/mp4':       'video',
  'video/webm':      'video',
  'video/quicktime': 'video',
  'audio/mpeg':      'video',  // Cloudinary stores audio under 'video'
  'audio/wav':       'video',
  'audio/ogg':       'video',
  'audio/mp4':       'video',
  'application/pdf': 'raw',    // PDFs use 'raw' for reliable signed-URL delivery
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const resourceType = MIME_TO_RESOURCE_TYPE[file.mimetype] || 'raw';
    return {
      folder: 'mediavault',
      resource_type: resourceType,
      // Don't restrict formats at upload — Cloudinary validates by resource_type
      // Applying image transformations only to images
      transformation: resourceType === 'image'
        ? [{ quality: 'auto', fetch_format: 'auto' }]
        : undefined,
    };
  },
});

const fileFilter = (req, file, cb) => {
  if (MIME_TO_RESOURCE_TYPE[file.mimetype]) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type "${file.mimetype}" is not supported. ` +
        `Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, MOV, MP3, WAV, OGG, PDF`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = { cloudinary, upload, MIME_TO_RESOURCE_TYPE };