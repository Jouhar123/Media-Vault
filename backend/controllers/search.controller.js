const File = require('../models/File');

// GET /api/search
const search = async (req, res, next) => {
  try {
    const {
      query = '',
      fileType,
      sortBy = 'relevance',
      order = 'desc',
      page = 1,
      limit = 12,
      dateFrom,
      dateTo,
      minSize,
      maxSize,
      tags,
    } = req.query;

    if (!query.trim() && !fileType && !tags) {
      return res.status(400).json({ success: false, message: 'Please provide a search query, file type, or tags.' });
    }

    const matchStage = { isPublic: true };

    // File type filter
    if (fileType && ['image', 'video', 'audio', 'pdf'].includes(fileType)) {
      matchStage.fileType = fileType;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
    }

    // Size filter (bytes)
    if (minSize || maxSize) {
      matchStage.size = {};
      if (minSize) matchStage.size.$gte = parseInt(minSize);
      if (maxSize) matchStage.size.$lte = parseInt(maxSize);
    }

    // Tags filter
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      if (tagList.length > 0) matchStage.tags = { $in: tagList };
    }

    let pipeline = [];

    if (query.trim()) {
      // Full-text search with relevance scoring
      pipeline.push({
        $match: {
          ...matchStage,
          $text: { $search: query.trim() },
        },
      });
      pipeline.push({
        $addFields: {
          textScore: { $meta: 'textScore' },
        },
      });
    } else {
      pipeline.push({ $match: matchStage });
      pipeline.push({ $addFields: { textScore: 0 } });
    }

    // Fuzzy matching bonus: if query words appear in name/tags
    if (query.trim()) {
      const words = query.trim().toLowerCase().split(/\s+/);
      pipeline.push({
        $addFields: {
          fuzzyScore: {
            $sum: words.map(word => ({
              $cond: [
                {
                  $or: [
                    { $regexMatch: { input: { $toLower: '$name' }, regex: word } },
                    { $regexMatch: { input: { $toLower: '$description' }, regex: word } },
                    { $in: [word, '$tags'] },
                  ],
                },
                1, 0,
              ],
            })),
          },
        },
      });
    } else {
      pipeline.push({ $addFields: { fuzzyScore: 0 } });
    }

    // Compute composite ranking score
    pipeline.push({
      $addFields: {
        rankScore: {
          $add: [
            { $multiply: ['$textScore', 20] },            // Text relevance
            { $multiply: ['$fuzzyScore', 5] },            // Fuzzy match bonus
            { $multiply: [{ $log: [{ $add: ['$viewCount', 1] }, 10] }, 10] }, // Popularity (log scale)
            { $multiply: [{ $size: '$tags' }, 2] },       // Tag richness
            // Recency factor (higher for newer files, decays)
            {
              $multiply: [
                50,
                {
                  $exp: {
                    $multiply: [
                      -0.05,
                      {
                        $divide: [
                          { $subtract: [new Date(), '$createdAt'] },
                          1000 * 60 * 60 * 24, // milliseconds to days
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    });

    // Sort
    let sortStage = {};
    switch (sortBy) {
      case 'relevance':
        sortStage = { rankScore: -1, viewCount: -1 };
        break;
      case 'date':
        sortStage = { createdAt: order === 'asc' ? 1 : -1 };
        break;
      case 'views':
        sortStage = { viewCount: order === 'asc' ? 1 : -1 };
        break;
      case 'name':
        sortStage = { name: order === 'asc' ? 1 : -1 };
        break;
      case 'size':
        sortStage = { size: order === 'asc' ? 1 : -1 };
        break;
      default:
        sortStage = { rankScore: -1 };
    }

    pipeline.push({ $sort: sortStage });

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const countPipeline = [...pipeline, { $count: 'total' }];

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Lookup uploader
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'uploader',
        foreignField: '_id',
        as: 'uploader',
        pipeline: [{ $project: { username: 1, email: 1 } }],
      },
    });
    pipeline.push({ $unwind: { path: '$uploader', preserveNullAndEmptyArrays: true } });

    const [results, countResult] = await Promise.all([
      File.aggregate(pipeline),
      File.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        files: results,
        query: query.trim(),
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
        appliedFilters: { fileType, dateFrom, dateTo, tags, sortBy, order },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/search/suggestions
const getSuggestions = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.json({ success: true, data: { suggestions: [] } });
    }

    const regex = new RegExp(query.trim(), 'i');

    const [nameSuggestions, tagSuggestions] = await Promise.all([
      File.find({ name: regex, isPublic: true }).select('name').limit(5).lean(),
      File.distinct('tags', { tags: regex, isPublic: true }),
    ]);

    const suggestions = [
      ...nameSuggestions.map(f => ({ type: 'file', value: f.name })),
      ...tagSuggestions.slice(0, 5).map(t => ({ type: 'tag', value: t })),
    ];

    res.json({ success: true, data: { suggestions } });
  } catch (error) {
    next(error);
  }
};

module.exports = { search, getSuggestions };
