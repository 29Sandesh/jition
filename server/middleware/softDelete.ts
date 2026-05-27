import { Schema, Model } from "mongoose";

export function softDeletePlugin(schema: Schema) {
  schema.pre(["find", "findOne", "findOneAndUpdate", "updateMany", "updateOne", "countDocuments"], async function () {
    const query: any = this;
    const currentFilter = query.getFilter();
    if (currentFilter.deletedAt === undefined) {
      query.setQuery({ ...currentFilter, deletedAt: null });
    }
  });

  schema.pre(["deleteOne", "deleteMany", "findOneAndDelete"], async function () {
    const query: any = this;
    const currentFilter = query.getFilter();
  });

  schema.static("softDelete", async function (filter: any, session?: any) {
    return this.updateMany(filter, { $set: { deletedAt: new Date() } }, { session });
  });
  
  schema.static("restore", async function (filter: any, session?: any) {
    return this.updateMany(filter, { $set: { deletedAt: null } }, { session });
  });
}
