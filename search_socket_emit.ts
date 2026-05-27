import fs from "fs";
import path from "path";

function search(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== "node_modules" && file !== ".git" && file !== "dist") {
        search(fullPath);
      }
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.includes("task-created-c") || content.includes("task-updated-c")) {
        console.log("Found in:", fullPath);
      }
    }
  }
}

search(".");
