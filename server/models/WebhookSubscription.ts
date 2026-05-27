import mongoose, { Schema } from "mongoose";

const WebhookSubscriptionSchema = new Schema({
  organisationId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true, index: true },
  url: { type: String, required: true },
  secret: { type: String, required: true }, // HMAC secret key
  events: { type: [String], default: ["task.created", "task.updated", "task.deleted"] },
  active: { type: Boolean, default: true },
}, {
  timestamps: true
});

export const WebhookSubscriptionModel = mongoose.model("WebhookSubscription", WebhookSubscriptionSchema);
