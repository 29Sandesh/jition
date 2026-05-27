import mongoose, { Schema } from "mongoose";
import { encrypt, decrypt, generateBlindIndex } from "../utils/encryption";

export const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true }, // Encrypted at rest
  emailHash: { type: String, required: true, unique: true, index: true }, // Blind index for exact matches
  password: { type: String, required: true }, // Simple mock password for now
  role: { type: String, enum: ["Owner", "Admin", "Editor", "Member", "Viewer", "Guest", "Lead", "User"], default: "User" },
  organisationId: { type: Schema.Types.ObjectId, ref: "Organisation", default: null },
  avatar: { type: String, default: null },
  jobTitle: { type: String, default: "" },
  bio: { type: String, default: "" },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

// Pre-save hook: Encrypt PII and generate blind index hash
UserSchema.pre("save", function (this: any) {
  if (this.isModified("email")) {
    this.emailHash = generateBlindIndex(this.email);
    this.email = encrypt(this.email);
  }
  if (this.isModified("name")) {
    this.name = encrypt(this.name);
  }
});

// Post-init hook: Decrypt PII fields on fetch/load
UserSchema.post("init", function (doc) {
  if (doc.email) doc.email = decrypt(doc.email);
  if (doc.name) doc.name = decrypt(doc.name);
});

export const UserModel = mongoose.model("User", UserSchema);
