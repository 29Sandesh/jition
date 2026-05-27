import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

export const connectDB = async () => {
  if (!mongoUri) {
    console.error("WARNING: MONGODB_URI is not set in environment variables!");
    return;
  }
  
  try {
    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect(mongoUri);
    console.log("Successfully connected to MongoDB Atlas.");
  } catch (err) {
    console.error("Error connecting to MongoDB Atlas:", err);
  }
};
