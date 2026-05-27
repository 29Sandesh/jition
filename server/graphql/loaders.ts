import DataLoader from "dataloader";
import { UserModel } from "../models/User";
import { WorkItemModel } from "../models/WorkItem";

/**
 * Creates user dataloader to batch fetch users in a single query.
 */
export const createUserLoader = () => {
  return new DataLoader<string, any>(async (userIds) => {
    // Cast userIds to string array
    const ids = userIds.map((id) => id.toString());
    const users = await UserModel.find({ _id: { $in: ids } }).lean();
    
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    return ids.map((id) => userMap.get(id) || null);
  });
};

/**
 * Creates sub-tasks dataloader to batch query subtasks by their parent task IDs.
 */
export const createSubTaskLoader = () => {
  return new DataLoader<string, any[]>(async (parentTaskIds) => {
    const ids = parentTaskIds.map((id) => id.toString());
    const subtasks = await WorkItemModel.find({ parentTaskId: { $in: ids } }).lean();

    const subtasksMap = new Map<string, any[]>();
    for (const sub of subtasks) {
      if (sub.parentTaskId) {
        const pId = sub.parentTaskId.toString();
        if (!subtasksMap.has(pId)) {
          subtasksMap.set(pId, []);
        }
        subtasksMap.get(pId)!.push(sub);
      }
    }

    return ids.map((id) => subtasksMap.get(id) || []);
  });
};
