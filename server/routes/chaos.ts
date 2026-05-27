import { Router } from "express";

export const chaosRouter = Router();

// In-memory state for chaos engineering (dev only)
let chaosConfig = {
  enabled: false,
  errorRate: 0.2, // 20% chance of 500 error
  delayMin: 500,  // minimum delay in ms
  delayMax: 3000, // maximum delay in ms
};

chaosRouter.post("/toggle", (req, res) => {
  chaosConfig.enabled = !chaosConfig.enabled;
  res.json({ message: `Chaos mode is now ${chaosConfig.enabled ? "enabled" : "disabled"}.`, config: chaosConfig });
});

chaosRouter.post("/config", (req, res) => {
  const { errorRate, delayMin, delayMax } = req.body;
  if (errorRate !== undefined) chaosConfig.errorRate = errorRate;
  if (delayMin !== undefined) chaosConfig.delayMin = delayMin;
  if (delayMax !== undefined) chaosConfig.delayMax = delayMax;
  res.json({ message: "Chaos config updated.", config: chaosConfig });
});

chaosRouter.get("/status", (req, res) => {
  res.json({ config: chaosConfig });
});

export const getChaosConfig = () => chaosConfig;
