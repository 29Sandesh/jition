import mongoose, { Schema } from "mongoose";
import { tenantIsolationPlugin } from "../middleware/tenantIsolation";
import { softDeletePlugin } from "../middleware/softDelete";
import { biDirectionalRefPlugin } from "../middleware/biDirectionalRef";

export const ProjectSchema = new Schema({
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  organisationId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true, index: true },
  name: { type: String, required: true },
  status: { type: String, enum: ["Active", "Archived"], default: "Active" },
  epicIds: [{ type: Schema.Types.ObjectId, ref: "Epic" }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

ProjectSchema.plugin(tenantIsolationPlugin);
ProjectSchema.plugin(softDeletePlugin);
ProjectSchema.plugin(biDirectionalRefPlugin, {
  parentModelName: "Workspace",
  parentKey: "workspaceId",
  parentArrayName: "projectIds"
});

export const ProjectModel = mongoose.model("Project", ProjectSchema);
