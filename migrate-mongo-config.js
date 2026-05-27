// In this file you can configure migrate-mongo
import dotenv from 'dotenv';
dotenv.config();

const config = {
  mongodb: {
    // Change (or review) the url to your MongoDB:
    url: process.env.MONGODB_URI || "mongodb://localhost:27017",

    // Change this to your database name:
    databaseName: "jition",

    options: {}
  },

  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: 'esm',
};

export default config;
