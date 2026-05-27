import mongoose, { Schema } from "mongoose";
import { tenantIsolationPlugin } from "../middleware/tenantIsolation";
import { softDeletePlugin } from "../middleware/softDelete";
import { biDirectionalRefPlugin } from "../middleware/biDirectionalRef";

export const WorkspaceSchema = new Schema({
  organisationId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  memberIds: [{ type: String }], // Array of User IDs (string or ObjectId depending on auth setup)
  projectIds: [{ type: Schema.Types.ObjectId, ref: "Project" }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

WorkspaceSchema.plugin(tenantIsolationPlugin);
WorkspaceSchema.plugin(softDeletePlugin);
WorkspaceSchema.plugin(biDirectionalRefPlugin, {
  parentModelName: "Organisation",
  parentKey: "organisationId",
  parentArrayName: "workspaceIds"
});

export const WorkspaceModel = mongoose.model("Workspace", WorkspaceSchema);
