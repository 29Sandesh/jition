import client from "prom-client";
import { emailQueue, reportQueue, webhookQueue, cronQueue } from "../jobs/queues";

// Custom registry
export const register = new client.Registry();

// Default process/system metrics
client.collectDefaultMetrics({ register });

// 1. Active WebSocket connection count
export const activeSocketConnections = new client.Gauge({
  name: "jition_websocket_connections_active",
  help: "Total number of active Socket.io client connections",
});
register.registerMetric(activeSocketConnections);

// 2. Queue depths
export const queueDepthMetric = new client.Gauge({
  name: "jition_queue_depth_total",
  help: "Number of pending/active/delayed jobs in BullMQ queues",
  labelNames: ["queue_name"],
});
register.registerMetric(queueDepthMetric);

// 3. Cache operation counters (hit vs miss)
export const cacheOperationsMetric = new client.Counter({
  name: "jition_cache_operations_total",
  help: "Total number of cache read operations",
  labelNames: ["status"], // 'hit' or 'miss'
});
register.registerMetric(cacheOperationsMetric);

// 4. HTTP request counters per tenant organization
export const tenantRequestsMetric = new client.Counter({
  name: "jition_http_requests_tenant_total",
  help: "Total number of HTTP requests processed per tenant organization",
  labelNames: ["tenant_id"],
});
register.registerMetric(tenantRequestsMetric);

/**
 * Periodically scrape BullMQ queue sizes to update Prometheus metrics
 */
export async function collectQueueMetrics() {
  try {
    const [emails, reports, webhooks, crons] = await Promise.all([
      emailQueue.getJobCounts(),
      reportQueue.getJobCounts(),
      webhookQueue.getJobCounts(),
      cronQueue.getJobCounts(),
    ]);

    queueDepthMetric.set({ queue_name: "email-queue" }, emails.waiting + emails.active + emails.delayed);
    queueDepthMetric.set({ queue_name: "report-queue" }, reports.waiting + reports.active + reports.delayed);
    queueDepthMetric.set({ queue_name: "webhook-queue" }, webhooks.waiting + webhooks.active + webhooks.delayed);
    queueDepthMetric.set({ queue_name: "cron-queue" }, crons.waiting + crons.active + crons.delayed);
  } catch (error) {
    // Avoid crashing on startup if Redis cluster failovers occur
  }
}
