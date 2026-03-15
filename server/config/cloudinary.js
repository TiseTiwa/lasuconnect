const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

const connectCloudinary = () => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    logger.info('✅ Cloudinary configured.');
  } catch (error) {
    logger.error(`❌ Cloudinary config failed: ${error.message}`);
  }
};

module.exports = { cloudinary, connectCloudinary };
