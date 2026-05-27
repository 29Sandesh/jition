import React, { createContext, useContext, useState, useEffect } from "react";

export type BlockType = 'h1' | 'h2' | 'h3' | 'p' | 'info' | 'ul' | 'todo' | 'quote' | 'divider';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
}

export interface Document {
  id: string;
  title: string;
  emoji: string;
  coverUrl: string;
  coverPos: number;
  blocks: Block[];
}

const initialBlocks: Block[] = [
  { id: "1", type: "h2", content: "Introduction" },
  { id: "2", type: "p", content: "The Kinetic Ledger is a high-throughput, distributed ledger technology designed specifically for real-time asset settlement. Unlike traditional sequential blocks, Kinetic uses a directed acyclic graph (DAG) structure to achieve sub-second finality." },
  { id: "3", type: "quote", content: "We believe that transaction finality should not be bound by block times, but by network propagation speed. — Kinetic Whitepaper" },
  { id: "4", type: "h3", content: "Core Principles" },
  { id: "5", type: "ul", content: "Atomic Synchronization: Ensures that cross-shard transactions either succeed entirely or fail gracefully." },
  { id: "6", type: "divider", content: "" },
  { id: "7", type: "todo", content: "Finalize sub-second finality spec", checked: true },
  { id: "8", type: "todo", content: "Review ZK validation layer", checked: false },
];

const defaultDocs: Document[] = [
  {
    id: "doc-1",
    title: "Kinetic Ledger System v2.4",
    emoji: "📄",
    coverUrl: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=2574&auto=format&fit=crop",
    coverPos: 50,
    blocks: initialBlocks
  },
  {
    id: "doc-2",
    title: "Engineering Onboarding",
    emoji: "🚀",
    coverUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2670&auto=format&fit=crop",
    coverPos: 50,
    blocks: [
      { id: "1", type: "h1", content: "Welcome to Kinetic Team" },
      { id: "2", type: "p", content: "Please read the following documents before pushing to production." },
      { id: "3", type: "todo", content: "Set up local environment", checked: false }
    ]
  }
];

interface DocsContextType {
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  activeDocId: string;
  setActiveDocId: (id: string) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  createDocument: (title?: string, template?: string, emoji?: string) => string;
}

const DocsContext = createContext<DocsContextType | undefined>(undefined);

export function DocsProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>(() => {
    const savedJition = localStorage.getItem("jition_docs");
    const savedKinetic = localStorage.getItem("kinetic_docs");
    
    // Migrate from the temporary jition_docs key used previously
    if (savedJition) {
      localStorage.setItem("kinetic_docs", savedJition);
      localStorage.removeItem("jition_docs");
      return JSON.parse(savedJition);
    }
    
    return savedKinetic ? JSON.parse(savedKinetic) : defaultDocs;
  });
  const [activeDocId, setActiveDocId] = useState<string>(documents[0]?.id || "doc-1");

  useEffect(() => {
    localStorage.setItem("kinetic_docs", JSON.stringify(documents));
  }, [documents]);

  const updateDocument = (id: string, updates: Partial<Document>) => {
    setDocuments(docs => docs.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const getTemplateBlocks = (template: string): Block[] => {
    switch (template) {
      case "meeting":
        return [
          { id: "1", type: "h2", content: "Meeting Details" },
          { id: "2", type: "info", content: "Date: " + new Date().toLocaleDateString() + " | Organizer: Product Team" },
          { id: "3", type: "h3", content: "Attendees" },
          { id: "4", type: "ul", content: "Product Manager" },
          { id: "5", type: "ul", content: "Engineering Team" },
          { id: "6", type: "h3", content: "Agenda" },
          { id: "7", type: "ul", content: "Review current roadmap progress" },
          { id: "8", type: "ul", content: "Discuss next sprint milestones" },
          { id: "9", type: "h3", content: "Action Items" },
          { id: "10", type: "todo", content: "Finalize epic designs", checked: false },
          { id: "11", type: "todo", content: "Schedule retro review", checked: false },
        ];
      case "prd":
        return [
          { id: "1", type: "h2", content: "Product Requirements Document (PRD)" },
          { id: "2", type: "p", content: "This document describes the key functionality, requirements, and user flows for the upcoming release." },
          { id: "3", type: "h3", content: "1. Objectives" },
          { id: "4", type: "p", content: "Deliver a high-quality multi-tenant user experience." },
          { id: "5", type: "h3", content: "2. User Stories" },
          { id: "6", type: "todo", content: "As a lead, I can manage members and roles.", checked: true },
          { id: "7", type: "todo", content: "As a user, I can create and manage tasks.", checked: false },
          { id: "8", type: "h3", content: "3. Tech Scope" },
          { id: "9", type: "info", content: "Database Migration to MongoDB Atlas completes by next Monday." },
        ];
      case "retro":
        return [
          { id: "1", type: "h2", content: "Sprint Retrospective" },
          { id: "2", type: "h3", content: "What Went Well" },
          { id: "3", type: "ul", content: "Successfully completed backend migration without downtime" },
          { id: "4", type: "ul", content: "Aesthetics and color palettes look gorgeous" },
          { id: "5", type: "h3", content: "What Could Be Improved" },
          { id: "6", type: "ul", content: "CI pipeline is taking too long to run" },
          { id: "7", type: "h3", content: "Action Items" },
          { id: "8", type: "todo", content: "Optimize Webpack and bundler caching", checked: false },
        ];
      case "brief":
        return [
          { id: "1", type: "h2", content: "Project Brief" },
          { id: "2", type: "p", content: "Summary of the project goals, target audience, and key deliverables." },
          { id: "3", type: "h3", content: "Core Target" },
          { id: "4", type: "p", content: "Develop a modern workspace planner." },
          { id: "5", type: "h3", content: "Timeline & Milestones" },
          { id: "6", type: "todo", content: "Phase 1: Database normalisation", checked: true },
          { id: "7", type: "todo", content: "Phase 2: GraphQL & WebSockets", checked: false },
        ];
      case "specs":
        return [
          { id: "1", type: "h2", content: "Engineering Specs" },
          { id: "2", type: "p", content: "Technical details, database schema, and API architecture specifications." },
          { id: "3", type: "h3", content: "Database Architecture" },
          { id: "4", type: "info", content: "Using discriminatory schemas for WorkItems (Bugs, Features, Chores, Spikes)." },
          { id: "5", type: "h3", content: "API Endpoints" },
          { id: "6", type: "ul", content: "GET /api/workItems - Paginated list of tasks" },
          { id: "7", type: "ul", content: "POST /api/workItems - Create a task" },
        ];
      default:
        return [{ id: "1", type: "p", content: "" }];
    }
  };

  const createDocument = (title = "Untitled", template = "blank", emoji = "📝") => {
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title,
      emoji,
      coverUrl: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2629&auto=format&fit=crop",
      coverPos: 50,
      blocks: getTemplateBlocks(template)
    };
    setDocuments(prev => [...prev, newDoc]);
    setActiveDocId(newDoc.id);
    return newDoc.id;
  };

  return (
    <DocsContext.Provider value={{ documents, setDocuments, activeDocId, setActiveDocId, updateDocument, createDocument }}>
      {children}
    </DocsContext.Provider>
  );
}

export function useDocs() {
  const context = useContext(DocsContext);
  if (context === undefined) {
    throw new Error("useDocs must be used within a DocsProvider");
  }
  return context;
}
