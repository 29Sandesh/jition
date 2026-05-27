import { Router } from "express";
import { OrganisationModel, UserModel } from "../models";
import { requireAuth } from "../middleware/auth";

export const organisationsRouter = Router();

// GET /api/organisations - Get the organisation of the current user
organisationsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) return res.status(400).json({ message: "No organisation context" });

    const organisation = await OrganisationModel.findById(orgId);
    if (!organisation) return res.status(404).json({ message: "Organisation not found" });

    res.json({ data: [organisation] });
  } catch (err) {
    res.status(500).json({ message: "Error fetching organisation" });
  }
});

// GET /api/organisations/members - List members of the user's organisation
organisationsRouter.get("/members", requireAuth, async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) {
      return res.json([
        { id: req.user?.id, name: "Me", role: "Owner" }
      ]);
    }
    const users = await UserModel.find({ organisationId: orgId });
    const members = users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: (u as any).avatar || null,
      jobTitle: (u as any).jobTitle || "",
      bio: (u as any).bio || ""
    }));
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: "Error fetching members" });
  }
});
