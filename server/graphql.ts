import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import { PubSub } from "graphql-subscriptions";
import { 
  WorkItemModel, UserModel, ProjectModel, EpicModel, StoryModel, WorkspaceModel 
} from "./models";
import { createUserLoader, createSubTaskLoader } from "./graphql/loaders";
import { getWorkspaceRole } from "./middleware/permission";

const pubsub = new PubSub();

// GraphQL Schema Type Definitions
const typeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
  }

  type Workspace {
    id: ID!
    name: String!
    description: String
    organisationId: ID!
  }

  type Project {
    id: ID!
    name: String!
    status: String!
    workspaceId: ID!
  }

  type Epic {
    id: ID!
    title: String!
    projectId: ID!
  }

  type Story {
    id: ID!
    title: String!
    epicId: ID!
  }

  type WorkItem {
    id: ID!
    title: String!
    description: String
    status: String!
    priority: String!
    kind: String!
    workspaceId: ID!
    projectId: ID!
    storyId: ID
    parentTaskId: ID
    assignees: [User!]!
    subTasks: [WorkItem!]!
    
    # Polymorphic discriminator fields
    severity: String
    reproducible: Boolean
    stepsToReproduce: String
    acceptanceCriteria: [String!]
    storyPoints: Int
    estimatedHours: Float
    researchGoal: String
    timeboxHours: Float
  }

  type Query {
    workItems(workspaceId: ID!): [WorkItem!]!
    workItem(id: ID!): WorkItem
    workspaces: [Workspace!]!
  }

  type Mutation {
    createWorkItem(
      workspaceId: ID!
      projectId: ID!
      title: String!
      kind: String!
      priority: String
      status: String
      description: String
      storyId: ID
      parentTaskId: ID
    ): WorkItem!
    
    updateWorkItem(
      id: ID!
      title: String
      priority: String
      status: String
      description: String
    ): WorkItem!
  }

  type Subscription {
    workItemCreated(workspaceId: ID!): WorkItem!
    workItemUpdated(workspaceId: ID!): WorkItem!
  }
`;

// Resolvers implementation
const resolvers = {
  Query: {
    workItems: async (_: any, { workspaceId }: { workspaceId: string }, context: any) => {
      if (!context.user) throw new Error("Authentication required");
      
      const role = await getWorkspaceRole(
        context.user.id,
        workspaceId,
        context.user.role,
        context.user.organisationId
      );
      if (role === "None") {
        throw new Error("Forbidden: You do not have access to this workspace");
      }
      return await WorkItemModel.find({ workspaceId }).lean();
    },
    workItem: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) throw new Error("Authentication required");
      const item = await WorkItemModel.findById(id).lean();
      if (!item) return null;

      const role = await getWorkspaceRole(
        context.user.id,
        item.workspaceId.toString(),
        context.user.role,
        context.user.organisationId
      );
      if (role === "None") {
        throw new Error("Forbidden: You do not have access to this workspace");
      }
      return item;
    },
    workspaces: async (_: any, __: any, context: any) => {
      if (!context.user) throw new Error("Authentication required");
      return await WorkspaceModel.find({ 
        organisationId: context.user.organisationId,
        memberIds: context.user.id 
      }).lean();
    }
  },

  Mutation: {
    createWorkItem: async (_: any, args: any, context: any) => {
      if (!context.user) throw new Error("Authentication required");

      const role = await getWorkspaceRole(
        context.user.id,
        args.workspaceId,
        context.user.role,
        context.user.organisationId
      );
      if (role === "Viewer" || role === "None") {
        throw new Error("Forbidden: Insufficient workspace permissions");
      }

      const item = await WorkItemModel.create({
        ...args,
        organisationId: context.user.organisationId,
        creatorId: context.user.id
      });

      const leanItem = item.toObject();
      pubsub.publish(`WORKITEM_CREATED_${args.workspaceId}`, { workItemCreated: leanItem });

      return leanItem;
    },

    updateWorkItem: async (_: any, { id, ...updates }: any, context: any) => {
      if (!context.user) throw new Error("Authentication required");

      const item = await WorkItemModel.findById(id);
      if (!item) throw new Error("WorkItem not found");

      const role = await getWorkspaceRole(
        context.user.id,
        item.workspaceId.toString(),
        context.user.role,
        context.user.organisationId
      );
      if (role === "Viewer" || role === "None") {
        throw new Error("Forbidden: Insufficient workspace permissions");
      }

      Object.assign(item, updates);
      await item.save();

      const leanItem = item.toObject();
      pubsub.publish(`WORKITEM_UPDATED_${item.workspaceId}`, { workItemUpdated: leanItem });

      return leanItem;
    }
  },

  Subscription: {
    workItemCreated: {
      subscribe: (_: any, { workspaceId }: { workspaceId: string }) => {
        return pubsub.asyncIterableIterator([`WORKITEM_CREATED_${workspaceId}`]);
      }
    },
    workItemUpdated: {
      subscribe: (_: any, { workspaceId }: { workspaceId: string }) => {
        return pubsub.asyncIterableIterator([`WORKITEM_UPDATED_${workspaceId}`]);
      }
    }
  },

  WorkItem: {
    id: (parent: any) => parent._id.toString(),
    assignees: async (parent: any, _: any, context: any) => {
      if (!parent.assigneeIds || parent.assigneeIds.length === 0) return [];
      // DataLoader batches these user requests to eliminate N+1 queries
      return Promise.all(
        parent.assigneeIds.map((id: string) => context.loaders.userLoader.load(id))
      );
    },
    subTasks: async (parent: any, _: any, context: any) => {
      // DataLoader batches subtask queries to eliminate N+1 queries
      return context.loaders.subTaskLoader.load(parent._id.toString());
    }
  },

  Workspace: {
    id: (parent: any) => parent._id.toString(),
  },

  User: {
    id: (parent: any) => parent._id.toString(),
  }
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

// Setup Apollo Server instance
export const createApolloServer = async () => {
  const server = new ApolloServer({
    schema,
  });
  await server.start();
  return server;
};

// Setup GraphQL Subscriptions over WebSockets
export function setupGraphQLSubscriptions(httpServer: any, apolloServer: ApolloServer) {
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  const serverCleanup = useServer(
    {
      schema,
      onConnect: async (ctx) => {
        // Authenticate subscription socket connections if needed
        console.log("GraphQL Subscription connected");
      },
      onDisconnect: () => {
        console.log("GraphQL Subscription disconnected");
      }
    },
    wsServer
  );

  return serverCleanup;
}

// Apollo express middleware config
export const apolloExpressMiddleware = (server: ApolloServer) => {
  return expressMiddleware(server, {
    context: async ({ req }) => {
      return {
        token: req.cookies?.jwt,
        user: req.user,
        loaders: {
          userLoader: createUserLoader(),
          subTaskLoader: createSubTaskLoader(),
        }
      };
    }
  });
};
