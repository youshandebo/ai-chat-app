import fs from "fs";
import path from "path";

let cached: any = null;

export function loadModels() {
  const paths = [
    path.resolve(process.cwd(), "config/models.json"),
    path.resolve(__dirname, "../../config/models.json"),
    path.resolve(__dirname, "../../../config/models.json")
  ];

  console.log("Attempting to load models. CWD:", process.cwd(), "__dirname:", __dirname);

  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        console.log("Found models config at:", p);
        const raw = fs.readFileSync(p, "utf-8");
        cached = JSON.parse(raw);
        console.log("Models loaded successfully:", cached?.models?.length);
        return;
      } catch (e) {
        console.error("Failed to parse models config at:", p, e);
      }
    }
  }

  console.error("Models config not found in any of:", paths);
  throw new Error("Failed to load models config");
}

export function getModelConfig() {
  if (!cached) loadModels();
  return cached;
}