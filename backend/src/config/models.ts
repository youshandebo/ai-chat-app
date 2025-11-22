import fs from "fs";
import path from "path";

let cached: any = null;

export function loadModels() {
  const p = path.resolve(process.cwd(), "config/models.json");
  const raw = fs.readFileSync(p, "utf-8");
  cached = JSON.parse(raw);
}

export function getModelConfig() {
  if (!cached) loadModels();
  return cached;
}