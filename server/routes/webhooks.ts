import { Router } from "express";
import { WebhookSubscriptionModel, WebhookReceiptModel } from "../models";
import { requireAuth } from "../middleware/auth";
import crypto from "crypto";

export const webhooksRouter = Router();

// Secure all endpoints with authentication
webhooksRouter.use(requireAuth);

// GET /api/webhooks/subscriptions - Retrieve all registered webhooks for tenant
webhooksRouter.get("/subscriptions", async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) return res.status(400).json({ error: "Missing organization context" });

    const subs = await WebhookSubscriptionModel.find({ organisationId: orgId });
    res.json(subs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

// POST /api/webhooks/subscriptions - Register new webhook
webhooksRouter.post("/subscriptions", async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) return res.status(400).json({ error: "Missing organization context" });

    const { url, events } = req.body;
    if (!url) return res.status(400).json({ error: "Webhook target URL is required" });

    // Generate random secure secret for signature verification
    const secret = crypto.randomBytes(32).toString("hex");

    const sub = await WebhookSubscriptionModel.create({
      organisationId: orgId,
      url,
      secret,
      events: events || ["task.created", "task.updated", "task.deleted"],
      active: true
    });

    res.status(201).json(sub);
  } catch (error) {
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

// DELETE /api/webhooks/subscriptions/:id - De-register webhook
webhooksRouter.delete("/subscriptions/:id", async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) return res.status(400).json({ error: "Missing organization context" });

    const deleted = await WebhookSubscriptionModel.findOneAndDelete({
      _id: req.params.id,
      organisationId: orgId
    });

    if (!deleted) return res.status(404).json({ error: "Subscription not found" });

    res.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete subscription" });
  }
});

// GET /api/webhooks/receipts - Fetch webhook receipts dashboard logs
webhooksRouter.get("/receipts", async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) return res.status(400).json({ error: "Missing organization context" });

    const receipts = await WebhookReceiptModel.find({ organisationId: orgId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch webhook receipts" });
  }
});
