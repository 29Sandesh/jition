import mongoose, { Model, SortOrder } from "mongoose";

export interface PaginationOptions {
  limit?: number;
  cursor?: string;
  sort?: string;
  fields?: string;
}

export async function paginate<T>(
  model: Model<T>,
  query: any,
  options: PaginationOptions
) {
  const limit = Math.min(options.limit || 25, 100);
  let sortObj: Record<string, SortOrder> = { _id: -1 };
  
  if (options.sort) {
    sortObj = {};
    const sorts = options.sort.split(",");
    for (const sortStr of sorts) {
      const [field, dir] = sortStr.split(":");
      sortObj[field] = dir === "asc" ? 1 : -1;
    }
    // Always append _id for deterministic sorting
    if (!sortObj._id) sortObj._id = -1;
  }

  // Handle cursor decoding (assuming it's a base64 encoded JSON string of the last document's sort field values)
  if (options.cursor) {
    try {
      const decoded = Buffer.from(options.cursor, "base64").toString("utf-8");
      const cursorData = JSON.parse(decoded);
      
      const sortKeys = Object.keys(sortObj);
      if (sortKeys.length > 0) {
        const mainSortField = sortKeys[0];
        const mainSortDir = sortObj[mainSortField];
        
        if (mainSortField === "_id") {
          query._id = mainSortDir === 1 ? { $gt: cursorData._id } : { $lt: cursorData._id };
        } else {
          // Compound sort query
          query.$or = [
            { [mainSortField]: mainSortDir === 1 ? { $gt: cursorData[mainSortField] } : { $lt: cursorData[mainSortField] } },
            { 
              [mainSortField]: cursorData[mainSortField], 
              _id: sortObj._id === 1 ? { $gt: cursorData._id } : { $lt: cursorData._id } 
            }
          ];
        }
      }
    } catch (e) {
      // Invalid cursor, ignore
    }
  }

  const select = options.fields ? options.fields.split(",").join(" ") : "-__v -deletedAt";

  const data = await model.find(query)
    .sort(sortObj)
    .limit(limit + 1)
    .select(select);

  const hasMore = data.length > limit;
  if (hasMore) data.pop();

  let nextCursor = null;
  if (data.length > 0) {
    const lastDoc = data[data.length - 1] as any;
    const cursorObj: any = { _id: lastDoc._id };
    const sortKeys = Object.keys(sortObj);
    if (sortKeys.length > 0 && sortKeys[0] !== "_id") {
      cursorObj[sortKeys[0]] = lastDoc[sortKeys[0]];
    }
    nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString("base64");
  }

  return {
    data,
    nextCursor,
    hasMore
  };
}
