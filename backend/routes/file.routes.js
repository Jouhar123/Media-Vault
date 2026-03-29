const express = require('express');
const router = express.Router();
const { uploadFile, getFiles, getFile, updateFile, deleteFile, incrementDownload } = require('../controllers/file.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { uploadValidation } = require('../middleware/validation.middleware');
const { upload } = require('../config/cloudinary');

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File upload, retrieval, and management
 */

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Upload a multimedia file
 *     tags: [Files]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (image, video, audio, PDF - max 50MB)
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: No file or invalid file type
 *       401:
 *         description: Not authenticated
 */
router.post('/upload',
  authenticate,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File too large. Maximum size is 50MB.' });
        }
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadValidation,
  uploadFile
);

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: Get all public files with pagination and sorting
 *     tags: [Files]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *       - in: query
 *         name: fileType
 *         schema: { type: string, enum: [image, video, audio, pdf] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, viewCount, name, size, relevanceScore] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc] }
 *       - in: query
 *         name: myFiles
 *         schema: { type: boolean }
 *         description: Get only current user's files
 *     responses:
 *       200:
 *         description: List of files with pagination
 */
router.get('/', optionalAuth, getFiles);

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: Get a single file by ID (increments view count)
 *     tags: [Files]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: File details
 *       404:
 *         description: File not found
 */
router.get('/:id', optionalAuth, getFile);

/**
 * @swagger
 * /api/files/{id}:
 *   patch:
 *     summary: Update file metadata (name, tags, description)
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               tags: { type: array, items: { type: string } }
 *               isPublic: { type: boolean }
 *     responses:
 *       200:
 *         description: File updated
 *       403:
 *         description: Not authorized
 */
router.patch('/:id', authenticate, updateFile);

/**
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     summary: Delete a file (removes from Cloudinary and DB)
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: File deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: File not found
 */
router.delete('/:id', authenticate, deleteFile);

/**
 * @swagger
 * /api/files/{id}/download:
 *   get:
 *     summary: Get download URL and increment download count
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Download URL returned
 */
router.get('/:id/download', authenticate, incrementDownload);

module.exports = router;
