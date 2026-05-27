import mongoose, { Schema } from "mongoose";

const EventLogSchema = new Schema({
  aggregateId: { type: Schema.Types.ObjectId, required: true, index: true },
  aggregateType: { type: String, required: true, default: "WorkItem" },
  eventType: { type: String, required: true }, // e.g. "CREATED", "UPDATED", "DELETED"
  payload: { type: Schema.Types.Mixed, required: true },
  userId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: false,
});

export const EventLogModel = mongoose.model("EventLog", EventLogSchema);
