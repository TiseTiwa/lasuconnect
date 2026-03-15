const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8+ has these defaults built-in, but being explicit is good practice
      serverSelectionTimeoutMS: 5000, // Timeout after 5s if no server found
      socketTimeoutMS: 45000,         // Close sockets after 45s of inactivity
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events after initial connect
    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected.');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`❌ MongoDB connection error: ${err.message}`);
    });

  } catch (error) {
    logger.error(`❌ MongoDB initial connection failed: ${error.message}`);
    process.exit(1); // Exit process — server cannot run without a database
  }
};

module.exports = connectDB;
