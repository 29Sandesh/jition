import { Worker } from "bullmq";
import Redis from "ioredis";
import nodemailer from "nodemailer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { WebhookSubscriptionModel, WebhookReceiptModel } from "../models";
import { WorkItemModel } from "../models/WorkItem";
import { logger, traceStorage } from "../utils/logger";

const sentinelsEnv = process.env.REDIS_SENTINELS;
const masterName = process.env.REDIS_MASTER_NAME || "mymaster";

const connectionOptions: any = sentinelsEnv
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

// Configure Nodemailer transporter connected to MailHog
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "127.0.0.1",
  port: parseInt(process.env.SMTP_PORT || "1025", 10),
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
});

// Helper to wrap worker logic with trace context
const withTrace = async (job: any, fn: () => Promise<void>) => {
  const traceId = job.data?.traceId || uuidv4();
  return new Promise<void>((resolve, reject) => {
    traceStorage.run(traceId, () => {
      fn().then(resolve).catch(reject);
    });
  });
};

// 1. Email Worker
export const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    return withTrace(job, async () => {
      const { to, subject, html } = job.data;
      logger.info(`Processing email job for: ${to}`);
      await transporter.sendMail({
        from: '"JITION Platform" <no-reply@jition.com>',
        to,
        subject,
        html,
      });
    });
  },
  { connection: connectionOptions }
);

// 2. Report Worker
export const reportWorker = new Worker(
  "report-queue",
  async (job) => {
    return withTrace(job, async () => {
      const { projectId, recipientEmail } = job.data;
      logger.info(`Processing PDF report for Project: ${projectId}`);
      
      // Simulate PDF generation by creating a mock report file
      const reportsDir = path.join(process.cwd(), "dist", "reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const filename = `project-report-${projectId}-${Date.now()}.pdf`;
      const reportPath = path.join(reportsDir, filename);
      
      fs.writeFileSync(reportPath, `MOCK PDF CONTENT\nProject ID: ${projectId}\nGenerated: ${new Date().toISOString()}`);
      logger.info(`PDF successfully written to: ${reportPath}`);

      // Trigger notification email when ready
      await transporter.sendMail({
        from: '"JITION Reports" <reports@jition.com>',
        to: recipientEmail,
        subject: `Your PDF Report is ready`,
        html: `<p>Your report has been generated. You can access it at the local path: <b>${reportPath}</b></p>`,
      });
    });
  },
  { connection: connectionOptions }
);

// 3. Webhook Delivery Worker
export const webhookWorker = new Worker(
  "webhook-queue",
  async (job) => {
    return withTrace(job, async () => {
      const { organisationId, event, payload } = job.data;
      logger.info(`Processing webhook delivery for event ${event} in Org ${organisationId}`);

      const subscriptions = await WebhookSubscriptionModel.find({
        organisationId,
        events: event,
        active: true,
      });

      for (const sub of subscriptions) {
        const signature = crypto
          .createHmac("sha256", sub.secret)
          .update(JSON.stringify(payload))
          .digest("hex");

        const startTime = Date.now();
        let status = 0;
        let body = "";
        let success = false;

        try {
          const response = await fetch(sub.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Jition-Signature-256": signature,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000), // 5 seconds timeout
          });

          status = response.status;
          body = await response.text();
          success = response.ok;
        } catch (err: any) {
          body = err.message || "Network Timeout/Error";
        }

        const durationMs = Date.now() - startTime;

        // Persist delivery receipt
        await WebhookReceiptModel.create({
          organisationId,
          subscriptionId: sub._id,
          url: sub.url,
          event,
          payload,
          responseStatus: status,
          responseBody: body.slice(0, 1000),
          durationMs,
          attempts: (job.attemptsMade || 0) + 1,
          success,
        });

        if (!success) {
          throw new Error(`Webhook post failed for subscription ${sub._id} with code ${status}`);
        }
      }
    });
  },
  { connection: connectionOptions }
);

// 4. Cron Rollover Worker
export const cronWorker = new Worker(
  "cron-queue",
  async (job) => {
    return withTrace(job, async () => {
      if (job.name === "sprint-rollover") {
        logger.info("Running scheduled daily sprint rollover validation...");
        const today = new Date();
        // Scan for unfinished tasks (not Done) past their due dates
        const overdueTasks = await WorkItemModel.find({
          status: { $ne: "Done" },
          dueDate: { $lt: today },
        });

        logger.info(`Found ${overdueTasks.length} overdue tasks during rollover check.`);
        // In production, we would automatically move these tasks to the next sprint if applicable
      }
    });
  },
  { connection: connectionOptions }
);

// Listen to worker failures for logging
[emailWorker, reportWorker, webhookWorker, cronWorker].forEach((w) => {
  w.on("failed", (job, err) => {
    logger.error(`BullMQ job ${job?.id} failed on queue ${w.name}: ${err.message}`);
  });
  w.on("completed", (job) => {
    logger.info(`BullMQ job ${job?.id} completed successfully on queue ${w.name}`);
  });
});
