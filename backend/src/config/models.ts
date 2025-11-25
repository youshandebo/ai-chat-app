import fs from "fs";
import path from "path";

let cached: any = null;

export function loadModels() {
  const p = path.resolve(process.cwd(), "config/models.json");
  console.log("Loading models from:", p, "CWD:", process.cwd());
  try {
    const raw = fs.readFileSync(p, "utf-8");
    cached = JSON.parse(raw);
    console.log("Models loaded:", cached?.models?.length);
  } catch (e) {
    console.error("Failed to load models:", e);
    throw e;
  }
}

export function getModelConfig() {
  if (!cached) loadModels();
  return cached;
}