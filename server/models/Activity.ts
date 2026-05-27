import mongoose, { Schema } from "mongoose";

export const ActivitySchema = new Schema({
  organisationId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true, index: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", default: null },
  workItemId: { type: Schema.Types.ObjectId, ref: "WorkItem", default: null }, // Replaces taskId
  user: { type: String, required: true },
  action: { type: String, required: true },
  target: { type: String, required: true },
  oldValue: { type: String, default: null },
  newValue: { type: String, default: null },
}, { timestamps: true });

export const ActivityModel = mongoose.model("Activity", ActivitySchema);
