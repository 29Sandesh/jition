/**
 * @param db {import('mongodb').Db}
 * @param client {import('mongodb').MongoClient}
 * @returns {Promise<void>}
 */
export const up = async (db, client) => {
    console.log("Running initial migration: setting up collections...");
    await db.createCollection('workspaces').catch(() => console.log('workspaces already exists'));
    await db.collection('workspaces').createIndex({ organisationId: 1 });
};

/**
 * @param db {import('mongodb').Db}
 * @param client {import('mongodb').MongoClient}
 * @returns {Promise<void>}
 */
export const down = async (db, client) => {
    console.log("Rolling back initial migration...");
    // Usually we wouldn't drop a core collection on rollback, but for demonstration:
    await db.collection('workspaces').dropIndex({ organisationId: 1 }).catch(() => {});
};
