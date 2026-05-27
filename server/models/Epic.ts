import mongoose, { Schema } from "mongoose";
import { tenantIsolationPlugin } from "../middleware/tenantIsolation";
import { softDeletePlugin } from "../middleware/softDelete";
import { biDirectionalRefPlugin } from "../middleware/biDirectionalRef";

export const EpicSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
  organisationId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true, index: true },
  title: { type: String, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  storyIds: [{ type: Schema.Types.ObjectId, ref: "Story" }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

EpicSchema.plugin(tenantIsolationPlugin);
EpicSchema.plugin(softDeletePlugin);
EpicSchema.plugin(biDirectionalRefPlugin, {
  parentModelName: "Project",
  parentKey: "projectId",
  parentArrayName: "epicIds"
});

export const EpicModel = mongoose.model("Epic", EpicSchema);
