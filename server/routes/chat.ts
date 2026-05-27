import { Router } from "express";
import { ConversationModel, MessageModel, UserModel, WorkItemModel } from "../models";
import { requireAuth } from "../middleware/auth";
import mongoose from "mongoose";
import { tenantLocalStorage } from "../utils/tenantContext";
export const chatRouter = Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

// Apply requireAuth to all chat routes
chatRouter.use(requireAuth);

// Get all conversations for a user
chatRouter.get("/conversations", async (req, res) => {
  try {
    const userId = req.user!.id;
    const orgId = req.user!.organisationId;

    if (!orgId) return res.status(400).json({ error: "Missing organisation context" });

    const conversations = await ConversationModel.find({ 
      organisationId: orgId, 
      participants: userId 
    });

    // Populate participant info
    const populated = await Promise.all(conversations.map(async (conv) => {
      const otherParticipantId = conv.participants.find(id => id !== userId);
      const otherUser = otherParticipantId ? await UserModel.findById(otherParticipantId) : null;
      
      const lastMessage = await MessageModel.findOne({ conversationId: conv._id }).sort({ createdAt: -1 });

      return {
        id: conv._id.toString(),
        otherUser: otherUser 
          ? { id: otherUser._id.toString(), name: otherUser.name, role: otherUser.role, avatar: (otherUser as any).avatar || null } 
          : { id: "unknown", name: "Unknown User", role: "User", avatar: null },
        lastMessage: lastMessage ? { content: lastMessage.content, timestamp: (lastMessage as any).createdAt?.toISOString() } : null
      };
    }));

    // Sort by last message timestamp
    populated.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
    });

    res.json(populated);
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Start a conversation
chatRouter.post("/conversations", async (req, res) => {
  try {
    const userId = req.user!.id;
    const orgId = req.user!.organisationId;
    const { targetUserId } = req.body;

    if (!orgId || !targetUserId) return res.status(400).json({ error: "Missing parameters" });

    // Check if conversation already exists
    let conversation = await ConversationModel.findOne({
      organisationId: orgId,
      participants: { $all: [userId, targetUserId] }
    });

    if (!conversation) {
      conversation = await ConversationModel.create({
        organisationId: orgId,
        participants: [userId, targetUserId]
      });
    }

    res.json({ id: conversation._id.toString() });
  } catch (error) {
    console.error("Failed to start conversation:", error);
    res.status(500).json({ error: "Failed to start conversation" });
  }
});

// Get messages for a conversation
chatRouter.get("/conversations/:id/messages", async (req, res) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID" });
    }

    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(403).json({ error: "Unauthorized access to conversation" });
    }

    const messages = await MessageModel.find({ conversationId }).sort({ createdAt: 1 });
    
    // Map messages to return proper formats
    const mappedMessages = await Promise.all(messages.map(async (msg) => {
      const sender = await UserModel.findById(msg.senderId);
      return {
        id: msg._id.toString(),
        senderId: msg.senderId,
        senderName: sender?.name || "Unknown",
        content: msg.content,
        timestamp: (msg as any).createdAt?.toISOString() || new Date().toISOString()
      };
    }));

    res.json(mappedMessages);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send a message
chatRouter.post("/conversations/:id/messages", async (req, res) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: "Missing parameters" });

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID" });
    }

    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const newMessage = await MessageModel.create({
      conversationId,
      senderId: userId,
      content
    });

    res.json({ 
      success: true, 
      id: newMessage._id.toString(), 
      timestamp: (newMessage as any).createdAt?.toISOString() || new Date().toISOString() 
    });
  } catch (error) {
    console.error("Failed to send message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// POST /api/chat/assistant - OpenRouter AI Assistant Chatbot with user role streaming
chatRouter.post("/assistant", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages payload" });
    }

    const userId = req.user!.id;
    const userObj = await UserModel.findById(userId);
    const userName = userObj ? userObj.name : "The CirCle User";
    const userEmail = userObj ? userObj.email : "user@thecircle.io";
    const userRole = userObj ? userObj.role : "Member";

    const systemPrompt = `You are The CirCle AI Co-Pilot, an intelligent AI assistant embedded inside The CirCle.
The CirCle is a premium agile workflow, project management, and workspace collaboration suite built for StartAPPss.

### 1. THE CIRCLE SYSTEM ARCHITECTURE & 6-LEVEL HIERARCHY:
The CirCle enforces a strict 6-level architecture for resource organization and isolation:
Level 1: Organisation (StartAPPss) - The enterprise tenant.
Level 2: Workspace (e.g., "Product Engineering", "Design & Marketing") - Logical divisions for departments or teams.
Level 3: Project (e.g., "The CirCircle Core Platform", "Mobile App Development", "Brand Guidelines 2026") - High-level goals.
Level 4: Epic (e.g., "Security & Encryption", "Real-Time Collaboration", "New Logo Design System") - Theme of work.
Level 5: Story (e.g., "PII Encryption", "Liquid Glass UI Rendering", "Brand Logo Variants") - User scenarios.
Level 6: WorkItem (Task / Sub-task) - Single actionable development item.

### 2. ROLE & PERMISSIONS MATRIX:
You must strictly respect the user's role and only provide assistance and reveal technical knowledge that matches their permissions.
- Owner (Super Admin): Full read/write over everything in the organisation, subscription details, Billing, and system deletion rights.
- Admin: Enterprise administration, managing workspaces, configuring member invites, viewing metrics, and high-level project management.
- Lead (Manager): Sprints coordinator, story creation, task delegation, project leading, and standard work item manipulation.
- Member / Editor: Write access to tasks, stories, and epics inside their assigned workspace.
- Viewer: Read-only access. Can view lists and details but cannot save edits or add cards.
- Auditor: Compliance-focused read-only access. Can view compliance timelines, security configurations, encryption methods, and audit logs.
- Guest: Restricted external viewer. Has access to specific elements inside a single project.

### 3. USER CONTEXT:
The user you are currently talking to has the following details:
- Name: ${userName}
- Email: ${userEmail}
- System Role: ${userRole}
- Organisation: StartAPPss (Plan: Pro)

### 4. DIRECT TASK CREATION COMMAND EXECUTION:
You can directly create or assign tasks upon request.
If the user asks you to create a task, assign a task, or do a chore, you must:
1. Check if you have all the necessary information to construct the task.
2. The required parameters are:
   - "title": A clear, concise heading/title for the task.
   - "description": A descriptive, helpful explanation of the task's goals.
   - "status": One of "Todo", "In Progress", "Review", "Done".
   - "priority": One of "P0", "P1", "P2", "P3".
   - "assigneeEmail": The email address of the team member to assign it to.
     Mapping for mock team profiles:
     - "member 1" / "member eng" / "member engineering" -> "member_eng@startappss.io"
     - "member design" -> "member_design@startappss.io"
     - "editor eng" / "editor engineering" -> "editor_eng@startappss.io"
     - "editor design" -> "editor_design@startappss.io"
     - "admin" -> "admin@startappss.io"
     - "lead" / "manager" -> "lead@startappss.io"
     - "owner" -> "owner@startappss.io"
     - "viewer" -> "viewer_all@startappss.io"
     - "auditor" -> "audit_officer@startappss.io"
     - "guest" -> "guest_eng@startappss.io"
3. If you do NOT have all these details (e.g. if the user says "assign a task to member eng" but didn't state the title or description), you MUST politely ask the user for the missing fields first before executing the command. For example:
   "I can create that task for you! What should be the Title/Heading and Description for this task?"
4. Once you have all required details, you must generate the task JSON wrapped inside <create_task>...</create_task> tags. The frontend will parse this and execute the action automatically. Do not include raw json block characters like backticks around the json if it is inside the tags.
   Format to output:
   <create_task>
   {
     "title": "Clean codebase imports",
     "description": "Remove unused references in routes.",
     "status": "Todo",
     "priority": "P2",
     "assigneeEmail": "member_eng@startappss.io"
   }
   </create_task>

### 5. YOUR BEHAVIOR:
- Respond in a highly human-like, warm, and natural conversational style. Imagine you are a friendly, smart coworker sitting next to them. Avoid robotic, overly structured, or repetitive greeting templates.
- Keep your responses extremely crisp, brief, and short. Answer directly and save their time. Do not output generic bulleted summaries of things they can see.
- CRITICAL: Do NOT use asterisks for bolding or italics (e.g. do NOT use **bold** or *italic*) anywhere in your response. Speak in plain text, using capitalization, simple list formatting, or emojis for emphasis.
- Always frame suggestions and actions from the perspective of their role (${userRole}).`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: chatMessages,
        stream: true
      })
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const errorMsg = errorJson?.error?.message || "Upstream AI provider error";
      res.write(`data: ${JSON.stringify({ content: `\n\n*[Error: ${errorMsg}]*` })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    if (response.body) {
      const decoder = new TextDecoder();
      for await (const chunk of response.body as any) {
        const text = decoder.decode(chunk);
        const lines = text.split("\n").filter(line => line.trim().startsWith("data: "));
        for (const line of lines) {
          const dataStr = line.replace(/^data: /, "").trim();
          if (dataStr === "[DONE]") continue;
          try {
            const data = JSON.parse(dataStr);
            const content = data.choices?.[0]?.delta?.content || "";
            if (content) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch(e) {}
        }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("OpenRouter Assistant failed:", error);
    res.status(500).json({ error: error.message || "Failed to process chat" });
  }
});

// AI Task Summariser Broadcast State
const taskViewers = new Map<string, Set<any>>();

// GET /api/chat/tasks/:id/stream-summary
chatRouter.get("/tasks/:id/stream-summary", (req, res) => {
  const { id } = req.params;
  
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  // Send initial ping to establish connection
  res.write(`data: ${JSON.stringify({ status: "connected" })}\n\n`);

  if (!taskViewers.has(id)) {
    taskViewers.set(id, new Set());
  }
  taskViewers.get(id)!.add(res);

  req.on("close", () => {
    const viewers = taskViewers.get(id);
    if (viewers) {
      viewers.delete(res);
      if (viewers.size === 0) taskViewers.delete(id);
    }
  });
});

// POST /api/chat/tasks/:id/trigger-summary
chatRouter.post("/tasks/:id/trigger-summary", async (req, res) => {
  const { id } = req.params;
  const headerOrgId = req.headers["x-organisation-id"] || req.headers["x-company-id"];
  const orgId = (headerOrgId || req.user?.organisationId)?.toString();

  if (!orgId) {
    return res.status(400).json({ error: "Missing organisation context" });
  }

  // Wrap inside tenantContext run explicitly to guarantee Mongoose has tenant context
  tenantLocalStorage.run(orgId, async () => {
    try {
      const task = await WorkItemModel.findById(id);
      if (!task) {
        if (!res.headersSent) res.status(404).json({ error: "Task not found" });
        return;
      }

      const viewers = taskViewers.get(id);
      if (!viewers || viewers.size === 0) {
        if (!res.headersSent) res.json({ message: "No active viewers to broadcast to." });
        return;
      }

      if (!res.headersSent) res.json({ message: "Summary triggered." }); // Return immediately, process async

      const prompt = `Please provide a short, concise, and professional 2-3 sentence summary of the following task:
Title: ${task.title}
Status: ${task.status}
Priority: ${task.priority}
Description: ${task.description || 'No description provided.'}`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [{ role: "user", content: prompt }],
          stream: true
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const errorMsg = errorJson?.error?.message || "Upstream AI provider error";
        viewers.forEach((viewerRes) => {
          viewerRes.write(`data: ${JSON.stringify({ content: `*[Error: ${errorMsg}]*` })}\n\n`);
          viewerRes.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        });
        return;
      }

      if (response.body) {
        const decoder = new TextDecoder();
        for await (const chunk of response.body as any) {
          const text = decoder.decode(chunk);
          const lines = text.split("\n").filter(line => line.trim().startsWith("data: "));
          for (const line of lines) {
            const dataStr = line.replace(/^data: /, "").trim();
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content || "";
              if (content) {
                viewers.forEach((viewerRes) => {
                  viewerRes.write(`data: ${JSON.stringify({ content })}\n\n`);
                });
              }
            } catch(e) {}
          }
        }
      }

      viewers.forEach((viewerRes) => {
        viewerRes.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      });
    } catch (error: any) {
      console.error("AI Summariser failed:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Failed to trigger summary" });
      } else {
        // Forward error to active viewers if HTTP headers were already sent
        const viewers = taskViewers.get(id);
        if (viewers) {
          viewers.forEach((viewerRes) => {
            viewerRes.write(`data: ${JSON.stringify({ content: `*[Error: ${error.message || "Internal error"}]*` })}\n\n`);
            viewerRes.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          });
        }
      }
    }
  });
});
