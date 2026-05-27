import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("WARNING: MONGODB_URI is not set in environment variables!");
} else {
  mongoose
    .connect(mongoUri)
    .then(() => console.log("Successfully connected to MongoDB Atlas."))
    .catch((err) => console.error("Error connecting to MongoDB Atlas:", err));
}

// Transaction helper for safer operations
export const withTransaction = async <T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export default mongoose;
