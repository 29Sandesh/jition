import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

export interface IAuditLog {
  actor: string;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  previousHash: string;
  hash: string;
}

const AuditLogSchema = new Schema({
  actor: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  resource: { type: String, required: true },
  ip: { type: String, required: true },
  userAgent: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, required: true },
  previousHash: { type: String, required: true },
  hash: { type: String, required: true, unique: true }
}, {
  timestamps: false,
});

/**
 * Calculates SHA-256 hash for an audit log entry
 */
export function calculateLogHash(log: Omit<IAuditLog, "hash">): string {
  const data = `${log.actor}|${log.action}|${log.resource}|${log.ip}|${log.userAgent}|${log.timestamp.toISOString()}|${log.previousHash}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

export const AuditLogModel = mongoose.model("AuditLog", AuditLogSchema);

/**
 * Helper to write a tamper-evident audit log
 */
export async function writeAuditLog(
  actor: string,
  action: string,
  resource: string,
  ip: string,
  userAgent: string
) {
  try {
    // 1. Fetch the latest audit log entry to get its hash
    const latestLog = await AuditLogModel.findOne().sort({ timestamp: -1, _id: -1 }).lean() as IAuditLog | null;
    const previousHash = latestLog ? latestLog.hash : "0000000000000000000000000000000000000000000000000000000000000000"; // Genesis hash
    
    const timestamp = new Date();
    
    const logData = {
      actor,
      action,
      resource,
      ip,
      userAgent,
      timestamp,
      previousHash
    };
    
    const hash = calculateLogHash(logData);
    
    await AuditLogModel.create({
      ...logData,
      hash
    });
  } catch (error) {
    console.error("Failed to write tamper-evident audit log:", error);
  }
}
