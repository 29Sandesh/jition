import mongoose, { Schema } from "mongoose";
import { tenantIsolationPlugin } from "../middleware/tenantIsolation";
import { softDeletePlugin } from "../middleware/softDelete";

export const OrganisationSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  plan: { type: String, enum: ["Free", "Pro", "Enterprise"], default: "Free" },
  logoBase64: { type: String, default: null },
  ownerId: { type: String, required: true, index: true },
  settings: { type: Schema.Types.Mixed, default: {} },
  workspaceIds: [{ type: Schema.Types.ObjectId, ref: "Workspace" }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

OrganisationSchema.plugin(softDeletePlugin);

export const OrganisationModel = mongoose.model("Organisation", OrganisationSchema);
