import mongoose from "mongoose";
import { 
  OrganisationModel, WorkspaceModel, ProjectModel, 
  EpicModel, StoryModel, WorkItemModel, WorkspaceMemberModel 
} from "../models";

// Cascades soft-deletes across the entire hierarchy atomically using MongoDB transactions
export async function executeCascadingSoftDelete(
  targetModelName: "Organisation" | "Workspace" | "Project" | "Epic" | "Story" | "WorkItem",
  targetId: string,
  organisationId: string
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const deletedAt = new Date();

    if (targetModelName === "Organisation") {
      // 1. Soft-delete the Organisation
      await OrganisationModel.updateOne(
        { _id: targetId },
        { $set: { deletedAt } },
        { session }
      );

      // 2. Cascade to Workspaces
      const workspaces = await WorkspaceModel.find({ organisationId: targetId }).session(session);
      const workspaceIds = workspaces.map(w => w._id.toString());

      if (workspaceIds.length > 0) {
        await WorkspaceModel.updateMany(
          { organisationId: targetId },
          { $set: { deletedAt } },
          { session }
        );
        // Cascade projects in workspaces
        await ProjectModel.updateMany(
          { workspaceId: { $in: workspaceIds } },
          { $set: { deletedAt } },
          { session }
        );
        // Cascade epics
        await EpicModel.updateMany(
          { workspaceId: { $in: workspaceIds } },
          { $set: { deletedAt } },
          { session }
        );
        // Cascade stories
        await StoryModel.updateMany(
          { workspaceId: { $in: workspaceIds } },
          { $set: { deletedAt } },
          { session }
        );
        // Cascade work items (tasks and subtasks)
        await WorkItemModel.updateMany(
          { workspaceId: { $in: workspaceIds } },
          { $set: { deletedAt } },
          { session }
        );
      }
    } 
    
    else if (targetModelName === "Workspace") {
      // 1. Soft-delete the Workspace
      await WorkspaceModel.updateOne(
        { _id: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );

      // 2. Cascade to Projects, Epics, Stories, WorkItems under Workspace
      await ProjectModel.updateMany(
        { workspaceId: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );
      await EpicModel.updateMany(
        { workspaceId: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );
      await StoryModel.updateMany(
        { workspaceId: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );
      await WorkItemModel.updateMany(
        { workspaceId: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );
    } 
    
    else if (targetModelName === "Project") {
      // 1. Soft-delete the Project
      await ProjectModel.updateOne(
        { _id: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );

      // 2. Cascade to Epics, Stories, WorkItems under Project
      await EpicModel.updateMany(
        { projectId: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );
      await StoryModel.updateMany(
        { projectId: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );
      await WorkItemModel.updateMany(
        { projectId: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );
    } 
    
    else if (targetModelName === "Epic") {
      // 1. Soft-delete the Epic
      await EpicModel.updateOne(
        { _id: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );

      // 2. Cascade to Stories and WorkItems under Epic
      await StoryModel.updateMany(
        { epicId: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );
      await WorkItemModel.updateMany(
        { epicId: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );
    } 
    
    else if (targetModelName === "Story") {
      // 1. Soft-delete the Story
      await StoryModel.updateOne(
        { _id: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );

      // 2. Cascade to WorkItems under Story
      await WorkItemModel.updateMany(
        { storyId: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );
    } 
    
    else if (targetModelName === "WorkItem") {
      // 1. Soft-delete the Task
      await WorkItemModel.updateOne(
        { _id: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );

      // 2. Cascade to subtasks
      await WorkItemModel.updateMany(
        { parentTaskId: targetId, organisationId },
        { $set: { deletedAt } },
        { session }
      );
    }

    await session.commitTransaction();
    console.log(`Successfully completed cascading soft-delete for ${targetModelName} ID: ${targetId}`);
  } catch (error) {
    await session.abortTransaction();
    console.error(`Aborted transaction: Failed to cascade soft-delete for ${targetModelName}`, error);
    throw error;
  } finally {
    session.endSession();
  }
}
