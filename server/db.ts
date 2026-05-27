import mongoose, { Schema, Document } from "mongoose";
import dotenv from "dotenv";
import { generateBlindIndex } from "./utils/encryption";
import { tenantLocalStorage } from "./utils/tenantContext";

dotenv.config();
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("WARNING: MONGODB_URI is not set in environment variables!");
} else {
  mongoose
    .connect(mongoUri)
    .then(() => console.log("Successfully connected to MongoDB Atlas."))
    .catch((err) => console.error("Error connecting to MongoDB Atlas:", err));
}

export * from "./models";

export const dashboardSummaryDefaults = {
  completionRate: 85,
  overdueTasks: 0,
  activeSprints: 2,
  avgResponse: "1.8h",
  activeTasks: 35,
  completed: 184,
  onTrack: true,
  activeSprintName: "Q3 Core Architecture Scaling",
  revenue: 890000,
  burnRate: 145000,
};

// ==========================================
// SEEDING
// ==========================================
import { 
  OrganisationModel, WorkspaceModel, ProjectModel, 
  EpicModel, StoryModel, WorkItemModel, UserModel, WorkspaceMemberModel 
} from "./models";

export async function seedDatabase() {
  return tenantLocalStorage.run("BYPASS", async () => {
    try {
    // Only seed if encrypted Owner user does not exist
    const existing = await UserModel.findOne({ emailHash: generateBlindIndex("owner@startappss.io") });
    if (existing) {
      console.log("Database already seeded with the 6-level hierarchy and 10 StartAPPss profiles.");
      return;
    }
    
    console.log("Seeding fresh StartAPPss Multi-Tenant 10-Profile Hierarchy...");
    
    // Clear all existing data
    await OrganisationModel.deleteMany({});
    await WorkspaceModel.deleteMany({});
    await WorkspaceMemberModel.deleteMany({});
    await ProjectModel.deleteMany({});
    await EpicModel.deleteMany({});
    await StoryModel.deleteMany({});
    await WorkItemModel.deleteMany({});
    await UserModel.deleteMany({});
    
    // Create Organisation
    const org = await OrganisationModel.create({
      name: "StartAPPss",
      slug: "startappss",
      ownerId: "owner@startappss.io",
      plan: "Pro"
    });

    // Create 10 distinct profiles with pre-calculated emailHash (blind index) to satisfy validations
    const users = await UserModel.create([
      { name: "StartAPPss Owner (Super Admin)", email: "owner@startappss.io", emailHash: generateBlindIndex("owner@startappss.io"), password: "password", role: "Owner", organisationId: org._id },
      { name: "StartAPPss Admin", email: "admin@startappss.io", emailHash: generateBlindIndex("admin@startappss.io"), password: "password", role: "Admin", organisationId: org._id },
      { name: "StartAPPss Lead (Manager)", email: "lead@startappss.io", emailHash: generateBlindIndex("lead@startappss.io"), password: "password", role: "Lead", organisationId: org._id },
      { name: "StartAPPss Editor (Engineering)", email: "editor_eng@startappss.io", emailHash: generateBlindIndex("editor_eng@startappss.io"), password: "password", role: "Member", organisationId: org._id },
      { name: "StartAPPss Editor (Design)", email: "editor_design@startappss.io", emailHash: generateBlindIndex("editor_design@startappss.io"), password: "password", role: "Member", organisationId: org._id },
      { name: "StartAPPss Member (Engineering)", email: "member_eng@startappss.io", emailHash: generateBlindIndex("member_eng@startappss.io"), password: "password", role: "Member", organisationId: org._id },
      { name: "StartAPPss Member (Design)", email: "member_design@startappss.io", emailHash: generateBlindIndex("member_design@startappss.io"), password: "password", role: "Member", organisationId: org._id },
      { name: "StartAPPss Guest (Engineering)", email: "guest_eng@startappss.io", emailHash: generateBlindIndex("guest_eng@startappss.io"), password: "password", role: "Member", organisationId: org._id },
      { name: "StartAPPss Viewer (Read Only)", email: "viewer_all@startappss.io", emailHash: generateBlindIndex("viewer_all@startappss.io"), password: "password", role: "Member", organisationId: org._id },
      { name: "StartAPPss Auditor", email: "audit_officer@startappss.io", emailHash: generateBlindIndex("audit_officer@startappss.io"), password: "password", role: "Admin", organisationId: org._id }
    ]);

    const owner = users[0];
    const admin = users[1];
    const lead = users[2];
    const editorEng = users[3];
    const editorDesign = users[4];
    const memberEng = users[5];
    const memberDesign = users[6];
    const guestEng = users[7];
    const viewer = users[8];
    const auditor = users[9];

    // ==========================================
    // WORKSPACE 1: Product Engineering
    // ==========================================
    const ws1Members = [owner, admin, lead, editorEng, memberEng, guestEng, viewer, auditor];
    const ws1 = await WorkspaceModel.create({
      organisationId: org._id,
      name: "Product Engineering",
      description: "Core software engineering and devops teams",
      memberIds: ws1Members.map(u => u._id.toString())
    });

    // Workspace 1 Memberships & Permission Levels mapping
    await WorkspaceMemberModel.create([
      { workspaceId: ws1._id, userId: owner._id, role: "Owner", organisationId: org._id },
      { workspaceId: ws1._id, userId: admin._id, role: "Admin", organisationId: org._id },
      { workspaceId: ws1._id, userId: lead._id, role: "Editor", organisationId: org._id },
      { workspaceId: ws1._id, userId: editorEng._id, role: "Editor", organisationId: org._id },
      { workspaceId: ws1._id, userId: memberEng._id, role: "Member", organisationId: org._id },
      { workspaceId: ws1._id, userId: guestEng._id, role: "Viewer", organisationId: org._id },
      { workspaceId: ws1._id, userId: viewer._id, role: "Viewer", organisationId: org._id },
      { workspaceId: ws1._id, userId: auditor._id, role: "Admin", organisationId: org._id }
    ]);

    // W1 Project 1: The CirCle Core
    const p1 = await ProjectModel.create({
      organisationId: org._id,
      workspaceId: ws1._id,
      name: "The CirCle Core Platform",
      status: "Active"
    });

    // W1 Project 1 Epics
    const epic1 = await EpicModel.create({
      organisationId: org._id,
      workspaceId: ws1._id,
      projectId: p1._id,
      title: "Security & Encryption"
    });

    const epic2 = await EpicModel.create({
      organisationId: org._id,
      workspaceId: ws1._id,
      projectId: p1._id,
      title: "Real-Time Collaboration"
    });

    // W1 Project 1 Stories
    const story1 = await StoryModel.create({
      organisationId: org._id,
      workspaceId: ws1._id,
      projectId: p1._id,
      epicId: epic1._id,
      title: "PII Encryption"
    });

    const story2 = await StoryModel.create({
      organisationId: org._id,
      workspaceId: ws1._id,
      projectId: p1._id,
      epicId: epic2._id,
      title: "Liquid Glass UI Rendering"
    });

    // W1 Project 2: Native App
    const p2 = await ProjectModel.create({
      organisationId: org._id,
      workspaceId: ws1._id,
      name: "Mobile App Development",
      status: "Active"
    });

    const epic3 = await EpicModel.create({
      organisationId: org._id,
      workspaceId: ws1._id,
      projectId: p2._id,
      title: "Push Notifications Setup"
    });

    const story3 = await StoryModel.create({
      organisationId: org._id,
      workspaceId: ws1._id,
      projectId: p2._id,
      epicId: epic3._id,
      title: "APNS & FCM Handlers"
    });

    // ==========================================
    // WORKSPACE 2: Design & Marketing
    // ==========================================
    const ws2Members = [owner, admin, lead, editorDesign, memberDesign, viewer, auditor];
    const ws2 = await WorkspaceModel.create({
      organisationId: org._id,
      name: "Design & Marketing",
      description: "Visual identity, campaign design, and marketing content",
      memberIds: ws2Members.map(u => u._id.toString())
    });

    // Workspace 2 Memberships & Permission Levels mapping
    await WorkspaceMemberModel.create([
      { workspaceId: ws2._id, userId: owner._id, role: "Owner", organisationId: org._id },
      { workspaceId: ws2._id, userId: admin._id, role: "Admin", organisationId: org._id },
      { workspaceId: ws2._id, userId: lead._id, role: "Editor", organisationId: org._id },
      { workspaceId: ws2._id, userId: editorDesign._id, role: "Editor", organisationId: org._id },
      { workspaceId: ws2._id, userId: memberDesign._id, role: "Member", organisationId: org._id },
      { workspaceId: ws2._id, userId: viewer._id, role: "Viewer", organisationId: org._id },
      { workspaceId: ws2._id, userId: auditor._id, role: "Admin", organisationId: org._id }
    ]);

    // W2 Project 3: Brand Guidelines 2026
    const p3 = await ProjectModel.create({
      organisationId: org._id,
      workspaceId: ws2._id,
      name: "Brand Guidelines 2026",
      status: "Active"
    });

    // W2 Project 3 Epics
    const epic4 = await EpicModel.create({
      organisationId: org._id,
      workspaceId: ws2._id,
      projectId: p3._id,
      title: "New Logo Design System"
    });

    const epic5 = await EpicModel.create({
      organisationId: org._id,
      workspaceId: ws2._id,
      projectId: p3._id,
      title: "Website Redesign Layouts"
    });

    // W2 Project 3 Stories
    const story4 = await StoryModel.create({
      organisationId: org._id,
      workspaceId: ws2._id,
      projectId: p3._id,
      epicId: epic4._id,
      title: "Brand Logo Variants"
    });

    const story5 = await StoryModel.create({
      organisationId: org._id,
      workspaceId: ws2._id,
      projectId: p3._id,
      epicId: epic5._id,
      title: "Landing Page Mockups"
    });

    // ==========================================
    // WORKITEMS (TASKS AND SUBTASKS)
    // ==========================================
    const now = new Date();
    const futureDate = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const pastDate = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const tasksData = [
      // Workspace 1 Tasks
      { 
        organisationId: org._id, workspaceId: ws1._id, projectId: p1._id, epicId: epic1._id, storyId: story1._id,
        kind: "Feature", title: "Build JWT API", description: "Implement secure JSON Web Token endpoints and cookie helpers.", 
        status: "Todo", priority: "P0", creatorId: owner._id, assigneeIds: [editorEng._id],
        startDate: pastDate(1), dueDate: futureDate(4)
      },
      { 
        organisationId: org._id, workspaceId: ws1._id, projectId: p1._id, epicId: epic1._id, storyId: story1._id,
        kind: "Feature", title: "Build Google OAuth", description: "Integrate passport-google-oauth20 flow.", 
        status: "In Progress", priority: "P1", creatorId: owner._id, assigneeIds: [memberEng._id],
        startDate: now, dueDate: futureDate(6)
      },
      { 
        organisationId: org._id, workspaceId: ws1._id, projectId: p1._id, epicId: epic2._id, storyId: story2._id,
        kind: "Feature", title: "Design widget layout", description: "Draw layouts for the dashboard cards.", 
        status: "Done", priority: "P2", creatorId: owner._id, assigneeIds: [lead._id],
        startDate: pastDate(4), dueDate: pastDate(1)
      },
      { 
        organisationId: org._id, workspaceId: ws1._id, projectId: p1._id, epicId: epic2._id, storyId: story2._id,
        kind: "Feature", title: "Connect to real API data", description: "Hook widgets up to actual analytics reporting endpoints.", 
        status: "In Progress", priority: "P1", creatorId: owner._id, assigneeIds: [editorEng._id],
        startDate: pastDate(2), dueDate: futureDate(3)
      },
      { 
        organisationId: org._id, workspaceId: ws1._id, projectId: p2._id, epicId: epic3._id, storyId: story3._id,
        kind: "Feature", title: "Setup FCM credentials", description: "Generate Firebase keys and push certificates.", 
        status: "Todo", priority: "P2", creatorId: owner._id, assigneeIds: [memberEng._id],
        dueDate: futureDate(7)
      },

      // Workspace 2 Tasks
      { 
        organisationId: org._id, workspaceId: ws2._id, projectId: p3._id, epicId: epic4._id, storyId: story4._id,
        kind: "Feature", title: "Design primary logo", description: "Create vector assets for the primary logo mark.", 
        status: "Done", priority: "P0", creatorId: owner._id, assigneeIds: [editorDesign._id],
        startDate: pastDate(5), dueDate: pastDate(2)
      },
      { 
        organisationId: org._id, workspaceId: ws2._id, projectId: p3._id, epicId: epic4._id, storyId: story4._id,
        kind: "Feature", title: "Create dark mode variant", description: "Adjust contrast and colors for dark UI backgrounds.", 
        status: "In Progress", priority: "P1", creatorId: owner._id, assigneeIds: [memberDesign._id],
        startDate: pastDate(1), dueDate: futureDate(2)
      },
      { 
        organisationId: org._id, workspaceId: ws2._id, projectId: p3._id, epicId: epic5._id, storyId: story5._id,
        kind: "Feature", title: "Hero section design", description: "Design a visually striking hero layout with interactive elements.", 
        status: "In Progress", priority: "P2", creatorId: owner._id, assigneeIds: [editorDesign._id],
        startDate: now, dueDate: futureDate(5)
      },
      { 
        organisationId: org._id, workspaceId: ws2._id, projectId: p3._id, epicId: epic5._id, storyId: story5._id,
        kind: "Feature", title: "Pricing page layout", description: "Draft grid layout comparing Free, Pro, and Enterprise tiers.", 
        status: "Todo", priority: "P2", creatorId: owner._id, assigneeIds: [viewer._id],
        dueDate: futureDate(8)
      }
    ];

    const seededTasks = await WorkItemModel.insertMany(tasksData);

    // ==========================================
    // SUB-TASKS (LEVEL 6)
    // ==========================================
    const jwtTask = seededTasks[0];
    const subTasks = [
      {
        organisationId: org._id, workspaceId: ws1._id, projectId: p1._id, epicId: epic1._id, storyId: story1._id,
        parentTaskId: jwtTask._id,
        kind: "Chore", title: "Add JWT validation helper", description: "Write express validation middleware for jwt verify.",
        status: "Todo", priority: "P1", creatorId: editorEng._id, assigneeIds: [editorEng._id]
      },
      {
        organisationId: org._id, workspaceId: ws1._id, projectId: p1._id, epicId: epic1._id, storyId: story1._id,
        parentTaskId: jwtTask._id,
        kind: "Chore", title: "Add refresh token rotation", description: "Create database schemas and rotation handler.",
        status: "Todo", priority: "P2", creatorId: editorEng._id, assigneeIds: [memberEng._id]
      }
    ];

    await WorkItemModel.insertMany(subTasks);

    console.log("10-Profile The CirCle Seeding Complete.");
    } catch (error) {
      console.error("Error seeding database:", error);
    }
  });
}

// Enable automatic execution
seedDatabase();
