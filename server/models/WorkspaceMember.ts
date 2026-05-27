import mongoose, { Schema } from "mongoose";
import { tenantIsolationPlugin } from "../middleware/tenantIsolation";
import { softDeletePlugin } from "../middleware/softDelete";

export const WorkspaceMemberSchema = new Schema({
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, enum: ["Owner", "Admin", "Editor", "Member", "Viewer"], default: "Member" },
  organisationId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true, index: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

WorkspaceMemberSchema.plugin(tenantIsolationPlugin);
WorkspaceMemberSchema.plugin(softDeletePlugin);

export const WorkspaceMemberModel = mongoose.model("WorkspaceMember", WorkspaceMemberSchema);
