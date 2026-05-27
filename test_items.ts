import mongoose from "mongoose";
import { WorkItemModel } from "./server/models/WorkItem";

mongoose.connect("mongodb://127.0.0.1:27017/jition").then(async () => {
  const items = await WorkItemModel.find({}).lean();
  console.log("Total items:", items.length);
  for (const item of items) {
    if (typeof item.title !== "string" || typeof item._id.toString() !== "string") {
      console.log("Bad item:", item);
    }
  }
  process.exit(0);
});
