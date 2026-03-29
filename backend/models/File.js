const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
    maxlength: [255, 'File name cannot exceed 255 characters'],
  },
  originalName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
  },
  fileType: {
    type: String,
    required: true,
    enum: ['image', 'video', 'audio', 'pdf'],
    index: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number, // bytes
    required: true,
  },
  cloudinaryUrl: {
    type: String,
    required: true,
  },
  cloudinaryPublicId: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
    default: null,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50,
  }],
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  // Relevance scoring factors
  relevanceScore: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Compound text index for search
fileSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  originalName: 'text',
}, {
  weights: {
    name: 10,
    tags: 8,
    description: 5,
    originalName: 3,
  },
  name: 'text_search_index',
});

// Additional indexes for sorting/filtering
fileSchema.index({ createdAt: -1 });
fileSchema.index({ viewCount: -1 });
fileSchema.index({ fileType: 1, createdAt: -1 });

// Virtual: formatted size
fileSchema.virtual('formattedSize').get(function () {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (this.size === 0) return '0 B';
  const i = Math.floor(Math.log(this.size) / Math.log(1024));
  return `${(this.size / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
});

// Update relevance score based on interactions
fileSchema.methods.updateRelevanceScore = function () {
  const ageInDays = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 100 - ageInDays * 2);
  const popularityScore = Math.log1p(this.viewCount) * 10;
  const tagScore = this.tags.length * 5;
  this.relevanceScore = recencyScore + popularityScore + tagScore;
};

module.exports = mongoose.model('File', fileSchema);
