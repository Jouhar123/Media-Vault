const File = require("../models/File");
const { cloudinary } = require("../config/cloudinary");
const { notifyUser, broadcast } = require("../utils/websocket");

// --- HELPER FUNCTIONS ---

// Determine file type from MIME type
const getFileType = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  return "image";
};

// Map fileType to Cloudinary resource_type
const getCloudinaryResourceType = (fileType, mimeType) => {
  if (fileType === "image") return "image";
  if (fileType === "video" || fileType === "audio") return "video";
  if (fileType === "pdf" || mimeType === "application/pdf") return "raw";
  return "raw";
};

// --- CONTROLLER FUNCTIONS ---

// POST /api/files/upload
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded." });
    }

    const { name, description, tags, isPublic } = req.body;
    const fileType = getFileType(req.file.mimetype);

    // Generate thumbnails
    let thumbnailUrl = null;
    if (fileType === "video" && req.file.path) {
      thumbnailUrl = req.file.path.replace(
        "/upload/",
        "/upload/so_0,w_400,h_300,c_fill/",
      );
    } else if (fileType === "image") {
      thumbnailUrl = req.file.path.replace(
        "/upload/",
        "/upload/w_400,h_300,c_fill/",
      );
    } else if (fileType === "pdf" && req.file.path) {
      // PDF thumbnail fallback (requires 'image' upload type in Cloudinary config)
      thumbnailUrl =
        req.file.path
          .replace("/raw/upload/", "/image/upload/")
          .replace(/\.pdf$/i, ".jpg") + "?page=1";
    }

    const file = await File.create({
      name: name || req.file.originalname,
      originalName: req.file.originalname,
      description: description || "",
      fileType,
      mimeType: req.file.mimetype,
      size: req.file.size,
      cloudinaryUrl: req.file.path,
      cloudinaryPublicId: req.file.filename,
      cloudinaryResourceType: getCloudinaryResourceType(
        fileType,
        req.file.mimetype,
      ),
      thumbnailUrl,
      tags: tags || [],
      uploader: req.user._id,
      isPublic: isPublic !== "false",
    });

    await file.populate("uploader", "username email");

    // Real-time notifications
    notifyUser(req.user._id.toString(), {
      type: "UPLOAD_SUCCESS",
      message: `File "${file.name}" uploaded successfully!`,
      file: { _id: file._id, name: file.name, fileType: file.fileType },
    });

    broadcast({
      type: "NEW_FILE",
      file: {
        _id: file._id,
        name: file.name,
        fileType: file.fileType,
        uploader: file.uploader.username,
      },
    });

    res.status(201).json({
      success: true,
      message: "File uploaded successfully!",
      data: { file },
    });
  } catch (error) {
    if (req.file?.filename) {
      const resourceType = getCloudinaryResourceType(
        getFileType(req.file.mimetype),
        req.file.mimetype,
      );
      cloudinary.uploader
        .destroy(req.file.filename, { resource_type: resourceType })
        .catch(console.error);
    }
    next(error);
  }
};

// GET /api/files
const getFiles = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      fileType,
      sortBy = "createdAt",
      order = "desc",
      myFiles,
    } = req.query;

    const query = {};
    if (myFiles === "true" && req.user) {
      query.uploader = req.user._id;
    } else {
      query.isPublic = true;
    }

    if (fileType && ["image", "video", "audio", "pdf"].includes(fileType)) {
      query.fileType = fileType;
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [files, total] = await Promise.all([
      File.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("uploader", "username"),
      File.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        files,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/files/:id
const getFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id).populate(
      "uploader",
      "username email",
    );
    if (!file)
      return res
        .status(404)
        .json({ success: false, message: "File not found." });

    if (
      !file.isPublic &&
      (!req.user || file.uploader._id.toString() !== req.user._id.toString())
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    await File.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    file.viewCount += 1;
    file.updateRelevanceScore();
    await file.save();

    res.json({ success: true, data: { file } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/files/:id
const updateFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file)
      return res
        .status(404)
        .json({ success: false, message: "File not found." });

    if (file.uploader.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized." });
    }

    const { name, description, tags, isPublic } = req.body;
    if (name !== undefined) file.name = name;
    if (description !== undefined) file.description = description;
    if (tags !== undefined) file.tags = tags;
    if (isPublic !== undefined) file.isPublic = isPublic;

    await file.save();
    await file.populate("uploader", "username");

    res.json({ success: true, message: "File updated.", data: { file } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/files/:id
const deleteFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file)
      return res
        .status(404)
        .json({ success: false, message: "File not found." });

    if (file.uploader.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized." });
    }

    const resourceType =
      file.cloudinaryResourceType ||
      getCloudinaryResourceType(file.fileType, file.mimeType);
    await cloudinary.uploader
      .destroy(file.cloudinaryPublicId, { resource_type: resourceType })
      .catch(console.error);

    await File.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "File deleted." });
  } catch (error) {
    next(error);
  }
};

// GET /api/files/:id/download
const incrementDownload = async (req, res, next) => {
  try {
    const file = await File.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloadCount: 1 } },
      { new: true },
    );
    if (!file)
      return res
        .status(404)
        .json({ success: false, message: "File not found." });

    const resourceType =
      file.cloudinaryResourceType ||
      getCloudinaryResourceType(file.fileType, file.mimeType);

    let downloadUrl;
    try {
      downloadUrl = cloudinary.url(file.cloudinaryPublicId, {
        resource_type: resourceType,
        flags: "attachment",
        attachment_filename: file.originalName,
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });
    } catch (e) {
      downloadUrl =
        file.cloudinaryUrl +
        (file.cloudinaryUrl.includes("?") ? "&" : "?") +
        "fl_attachment";
    }

    res.json({
      success: true,
      data: { downloadUrl, fileName: file.originalName },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  getFiles,
  getFile,
  updateFile,
  deleteFile,
  incrementDownload,
};
