import mongoose, { Schema, Document } from "mongoose";

interface BiDirectionalRefOptions {
  parentModelName: string;
  parentKey: string;
  parentArrayName: string;
}

export function biDirectionalRefPlugin(schema: Schema, options: BiDirectionalRefOptions) {
  const { parentModelName, parentKey, parentArrayName } = options;

  // Post save hook to handle creation and updates of parent references
  schema.post("save", async function (doc: any) {
    const parentId = doc[parentKey];
    if (!parentId) return;

    try {
      const ParentModel = mongoose.model(parentModelName);
      
      // If it's a new document, add to the parent's array
      if (doc.$isNew) {
        await ParentModel.updateOne(
          { _id: parentId },
          { $addToSet: { [parentArrayName]: doc._id } }
        );
      } else {
        // If parent reference changed, pull from old and push to new
        const modifiedPaths = doc.modifiedPaths();
        if (modifiedPaths.includes(parentKey)) {
          const originalParentId = doc._original ? doc._original[parentKey] : null;
          if (originalParentId && originalParentId.toString() !== parentId.toString()) {
            // Remove from original parent
            await ParentModel.updateOne(
              { _id: originalParentId },
              { $pull: { [parentArrayName]: doc._id } }
            );
          }
          // Add to new parent
          await ParentModel.updateOne(
            { _id: parentId },
            { $addToSet: { [parentArrayName]: doc._id } }
          );
        }
      }
    } catch (err) {
      console.error(`Error in biDirectionalRefPlugin save hook for ${parentModelName}:`, err);
    }
  });

  // Helper function to remove reference from parent
  const removeRef = async (doc: any) => {
    const parentId = doc[parentKey];
    if (!parentId) return;

    try {
      const ParentModel = mongoose.model(parentModelName);
      await ParentModel.updateOne(
        { _id: parentId },
        { $pull: { [parentArrayName]: doc._id } }
      );
    } catch (err) {
      console.error(`Error in biDirectionalRefPlugin remove hook for ${parentModelName}:`, err);
    }
  };



  // Post hooks for model-level deletion queries (like findOneAndDelete)
  schema.post("findOneAndDelete", async function (doc: any) {
    if (doc) {
      await removeRef(doc);
    }
  });

  schema.post("deleteOne", async function (doc: any) {
    if (doc) {
      await removeRef(doc);
    }
  });
}
