import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { OrganisationModel, UserModel, JoinRequestModel, WorkspaceModel, WorkspaceMemberModel } from "../models";

export const companiesRouter = Router();

// GET /api/companies/search - Search companies by name
companiesRouter.get("/search", async (req, res) => {
  const q = req.query.q as string;
  if (!q || q.trim().length < 2) {
    return res.json([]);
  }
  try {
    const orgs = await OrganisationModel.find({
      name: { $regex: q.trim(), $options: "i" },
      deletedAt: null
    }).limit(10);
    res.json(orgs.map(org => ({ id: org._id.toString(), name: org.name })));
  } catch (err) {
    res.status(500).json({ error: "Error searching companies" });
  }
});

// POST /api/companies/join-request - Create a request to join a company
companiesRouter.post("/join-request", requireAuth, async (req, res) => {
  try {
    const { companyId } = req.body;
    const userId = req.user?.id;

    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }
    if (!userId) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    // Check if organisation exists
    const org = await OrganisationModel.findById(companyId);
    if (!org) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Check if already in this organisation
    const user = await UserModel.findById(userId);
    if (user && user.organisationId?.toString() === companyId) {
      return res.status(400).json({ error: "You are already a member of this company" });
    }

    // Check for pending requests
    const existingRequest = await JoinRequestModel.findOne({
      userId,
      companyId,
      status: "pending"
    });
    if (existingRequest) {
      return res.status(400).json({ error: "You already have a pending request for this company" });
    }

    await JoinRequestModel.create({
      userId,
      companyId,
      status: "pending"
    });

    res.json({ success: true, message: "Join request submitted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/companies/requests - List pending requests for the admin's organisation
companiesRouter.get("/requests", requireAuth, async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) {
      return res.status(400).json({ error: "No organisation context" });
    }

    if (req.user?.role !== "Lead" && req.user?.role !== "Owner" && req.user?.role !== "Admin") {
      return res.status(403).json({ error: "Permission denied" });
    }

    const requests = await JoinRequestModel.find({
      companyId: orgId,
      status: "pending"
    }).populate("userId");

    const formattedRequests = requests
      .filter(r => r.userId !== null)
      .map((r: any) => ({
        id: r._id.toString(),
        userName: r.userId.name,
        userEmail: r.userId.email
      }));

    res.json(formattedRequests);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/companies/requests/:id/approve - Approve a join request
companiesRouter.post("/requests/:id/approve", requireAuth, async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) {
      return res.status(400).json({ error: "No organisation context" });
    }

    if (req.user?.role !== "Lead" && req.user?.role !== "Owner" && req.user?.role !== "Admin") {
      return res.status(403).json({ error: "Permission denied" });
    }

    const joinRequest = await JoinRequestModel.findById(req.params.id);
    if (!joinRequest || joinRequest.status !== "pending") {
      return res.status(404).json({ error: "Pending request not found" });
    }

    if (joinRequest.companyId.toString() !== orgId.toString()) {
      return res.status(403).json({ error: "Permission denied for this company" });
    }

    const requestUser = await UserModel.findById(joinRequest.userId);
    if (!requestUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Set user's organisation and change role to Member
    requestUser.organisationId = orgId;
    requestUser.role = "Member";
    await requestUser.save();

    // Auto-join workspaces under this organisation
    const userIdStr = requestUser._id.toString();
    await WorkspaceModel.updateMany(
      { organisationId: orgId },
      { $addToSet: { memberIds: userIdStr } }
    );
    
    const workspaces = await WorkspaceModel.find({ organisationId: orgId }).lean();
    for (const ws of workspaces) {
      await WorkspaceMemberModel.create({
        workspaceId: ws._id,
        userId: requestUser._id,
        role: "Member",
        organisationId: orgId
      }).catch(() => {});
    }

    // Update join request status
    joinRequest.status = "approved";
    await joinRequest.save();

    res.json({ success: true, message: "User approved and added to workspace" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/companies/requests/:id/reject - Reject a join request
companiesRouter.post("/requests/:id/reject", requireAuth, async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) {
      return res.status(400).json({ error: "No organisation context" });
    }

    if (req.user?.role !== "Lead" && req.user?.role !== "Owner" && req.user?.role !== "Admin") {
      return res.status(403).json({ error: "Permission denied" });
    }

    const joinRequest = await JoinRequestModel.findById(req.params.id);
    if (!joinRequest || joinRequest.status !== "pending") {
      return res.status(404).json({ error: "Pending request not found" });
    }

    if (joinRequest.companyId.toString() !== orgId.toString()) {
      return res.status(403).json({ error: "Permission denied for this company" });
    }

    // Update join request status
    joinRequest.status = "rejected";
    await joinRequest.save();

    res.json({ success: true, message: "User request rejected" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});
