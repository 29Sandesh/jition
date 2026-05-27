import mongoose, { Schema } from "mongoose";
import { tenantIsolationPlugin } from "../middleware/tenantIsolation";
import { softDeletePlugin } from "../middleware/softDelete";

const WorkItemSchema = new Schema({
  storyId: { type: Schema.Types.ObjectId, ref: "Story" },
  epicId: { type: Schema.Types.ObjectId, ref: "Epic" },
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
  organisationId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true, index: true },
  
  title: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, enum: ["Todo", "In Progress", "Review", "Done"], default: "Todo" },
  priority: { type: String, enum: ["P0", "P1", "P2", "P3"], default: "P2" },
  
  assigneeIds: [{ type: String }],
  creatorId: { type: String, required: true },
  
  dueDate: { type: Date },
  tags: [{ type: String }],
  attachments: [{ type: String }],
  comments: { type: [Schema.Types.Mixed], default: [] },
  
  parentTaskId: { type: Schema.Types.ObjectId, ref: "WorkItem", default: null }, // for subtasks
  subTaskIds: [{ type: Schema.Types.ObjectId, ref: "WorkItem" }],
  
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
}, { 
  timestamps: true,
  discriminatorKey: "kind",
  optimisticConcurrency: true,
});

import { biDirectionalRefPlugin } from "../middleware/biDirectionalRef";

WorkItemSchema.plugin(tenantIsolationPlugin);
WorkItemSchema.plugin(softDeletePlugin);
WorkItemSchema.plugin(biDirectionalRefPlugin, {
  parentModelName: "Story",
  parentKey: "storyId",
  parentArrayName: "workItemIds"
});
WorkItemSchema.plugin(biDirectionalRefPlugin, {
  parentModelName: "WorkItem",
  parentKey: "parentTaskId",
  parentArrayName: "subTaskIds"
});

export const WorkItemModel = mongoose.model("WorkItem", WorkItemSchema);

// Discriminators
export const BugModel = WorkItemModel.discriminator("Bug", new Schema({
  severity: { type: String, enum: ["Low", "Medium", "High", "Critical"] },
  reproducible: { type: Boolean, default: true },
  stepsToReproduce: { type: String, default: "" },
}));

export const FeatureModel = WorkItemModel.discriminator("Feature", new Schema({
  acceptanceCriteria: [{ type: String }],
  storyPoints: { type: Number, default: 0 },
}));

export const ChoreModel = WorkItemModel.discriminator("Chore", new Schema({
  estimatedHours: { type: Number, default: 0 },
}));

export const SpikeModel = WorkItemModel.discriminator("Spike", new Schema({
  researchGoal: { type: String, default: "" },
  timeboxHours: { type: Number, default: 0 },
}));
