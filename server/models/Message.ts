import mongoose, { Schema } from "mongoose";

export const MessageSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
  senderId: { type: String, required: true },
  content: { type: String, required: true },
}, { timestamps: true });

export const MessageModel = mongoose.model("Message", MessageSchema);
