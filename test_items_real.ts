import mongoose from "mongoose";
import dotenv from "dotenv";
import { WorkItemModel } from "./server/models/WorkItem";

dotenv.config();
const mongoUri = process.env.MONGODB_URI;

mongoose.connect(mongoUri!).then(async () => {
  const items = await WorkItemModel.find({}).lean();
  console.log("Total items in DB:", items.length);
  for (const item of items) {
    if (!item.title) {
      console.log("Bad item missing title:", item._id, item);
    } else if (typeof item.title !== "string") {
      console.log("Bad item title not string:", item._id, typeof item.title);
    }
  }
  process.exit(0);
});
