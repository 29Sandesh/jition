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
      if (content.includes("framer-motion") || content.includes("motion/react")) {
        console.log("Found in:", fullPath);
        // print matching lines
        const lines = content.split("\n");
        lines.forEach((line, idx) => {
          if (line.includes("framer-motion") || line.includes("motion/react")) {
            console.log("  L" + (idx+1) + ": " + line.trim());
          }
        });
      }
    }
  }
}

search(".");
