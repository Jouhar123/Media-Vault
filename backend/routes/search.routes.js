const express = require('express');
const router = express.Router();
const { search, getSuggestions } = require('../controllers/search.controller');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Full-text search with ranking and filters
 */

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search files by keyword with ranking
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema: { type: string }
 *         description: Search keyword (matches name, description, tags)
 *       - in: query
 *         name: fileType
 *         schema: { type: string, enum: [image, video, audio, pdf] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [relevance, date, views, name, size], default: relevance }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: tags
 *         schema: { type: string }
 *         description: Comma-separated tags to filter by
 *       - in: query
 *         name: minSize
 *         schema: { type: integer }
 *         description: Minimum file size in bytes
 *       - in: query
 *         name: maxSize
 *         schema: { type: integer }
 *         description: Maximum file size in bytes
 *     responses:
 *       200:
 *         description: Ranked search results with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     files:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/File' }
 *                     pagination:
 *                       type: object
 *       400:
 *         description: No search parameters provided
 *       401:
 *         description: Not authenticated
 */
router.get('/', authenticate, search);

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get autocomplete suggestions for search
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of suggestions (file names and tags)
 */
router.get('/suggestions', authenticate, getSuggestions);

module.exports = router;
