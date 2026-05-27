import { Queue } from "bullmq";
import Redis from "ioredis";

const sentinelsEnv = process.env.REDIS_SENTINELS;
const masterName = process.env.REDIS_MASTER_NAME || "mymaster";

export const connectionOptions: any = sentinelsEnv
  ? {
      sentinels: sentinelsEnv.split(",").map((s) => {
        const [host, port] = s.split(":");
        return { host, port: parseInt(port, 10) || 26379 };
      }),
      name: masterName,
      sentinelRetryStrategy: (times: number) => Math.min(times * 100, 2000),
      maxRetriesPerRequest: null,
    }
  : {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      maxRetriesPerRequest: null,
    };

export const emailQueue = new Queue("email-queue", { connection: connectionOptions });
export const reportQueue = new Queue("report-queue", { connection: connectionOptions });
export const webhookQueue = new Queue("webhook-queue", { connection: connectionOptions });
export const cronQueue = new Queue("cron-queue", { connection: connectionOptions });

// Schedule repeatable sprint rollover checks once (e.g., daily)
export async function scheduleRecurringJobs() {
  try {
    // BullMQ repeat option will check every day at midnight
    await cronQueue.add(
      "sprint-rollover",
      {},
      {
        repeat: { pattern: "0 0 * * *" }, // Daily at midnight
        jobId: "sprint-rollover-daily",
      }
    );
    console.log("Daily sprint rollover cron job scheduled successfully.");
  } catch (error) {
    console.error("Failed to schedule daily sprint rollover job:", error);
  }
}
