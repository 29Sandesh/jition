import mongoose, { Schema } from "mongoose";

const WebhookReceiptSchema = new Schema({
  organisationId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true, index: true },
  subscriptionId: { type: Schema.Types.ObjectId, ref: "WebhookSubscription", required: true },
  url: { type: String, required: true },
  event: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  responseStatus: { type: Number, default: 0 }, // HTTP status code (e.g. 200, 500)
  responseBody: { type: String, default: "" },
  durationMs: { type: Number, default: 0 },
  attempts: { type: Number, default: 1 },
  success: { type: Boolean, required: true },
}, {
  timestamps: true
});

export const WebhookReceiptModel = mongoose.model("WebhookReceipt", WebhookReceiptSchema);
