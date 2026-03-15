const { cloudinary } = require('../config/cloudinary');
const AppError = require('./AppError');

// ── Upload a file buffer to Cloudinary ────────────────────
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'lasuconnect',
      resource_type: options.resource_type || 'auto',
      transformation: options.transformation || [],
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(new AppError(`Cloudinary upload failed: ${error.message}`, 500));
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

// ── Delete a file from Cloudinary by public_id ────────────
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error(`Failed to delete from Cloudinary: ${err.message}`);
  }
};

// ── Extract public_id from a Cloudinary URL ───────────────
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  try {
    const parts = url.split('/');
    const folderAndFile = parts.slice(parts.indexOf('lasuconnect')).join('/');
    return folderAndFile.split('.')[0]; // Remove extension
  } catch {
    return null;
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl };
