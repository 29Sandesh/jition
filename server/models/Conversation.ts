import mongoose, { Schema } from "mongoose";

export const ConversationSchema = new Schema({
  organisationId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", default: null },
  participants: [{ type: String, required: true }], // String IDs for now, update to ObjectId when Auth is done
}, { timestamps: true });

export const ConversationModel = mongoose.model("Conversation", ConversationSchema);
