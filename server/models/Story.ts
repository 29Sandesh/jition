import mongoose, { Schema } from "mongoose";
import { tenantIsolationPlugin } from "../middleware/tenantIsolation";
import { softDeletePlugin } from "../middleware/softDelete";
import { biDirectionalRefPlugin } from "../middleware/biDirectionalRef";

export const StorySchema = new Schema({
  epicId: { type: Schema.Types.ObjectId, ref: "Epic", required: true, index: true },
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
  organisationId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  workItemIds: [{ type: Schema.Types.ObjectId, ref: "WorkItem" }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

StorySchema.plugin(tenantIsolationPlugin);
StorySchema.plugin(softDeletePlugin);
StorySchema.plugin(biDirectionalRefPlugin, {
  parentModelName: "Epic",
  parentKey: "epicId",
  parentArrayName: "storyIds"
});

export const StoryModel = mongoose.model("Story", StorySchema);
