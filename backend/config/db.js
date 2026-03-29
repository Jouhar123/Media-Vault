const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Ensure this name matches your .env file EXACTLY
    const uri = process.env.MONGODB_URI ; 
    
    if (!uri) {
      throw new Error("MONGODB_URI is missing from .env file");
    }

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    throw error; // Re-throw so server.js can catch it
  }
};

module.exports = connectDB;