import fs from "fs";
import path from "path";

type Range = "24h" | "7d" | "30d" | "365d";

const dataPath = path.resolve(process.cwd(), "data/metrics.json");

let active = 0;
let maxActive = 0;
let maxHistory: { ts: number; value: number }[] = [];
let calls: number[] = [];
let errors: number[] = [];
let visitors: Record<string, Set<string>> = {};

function ensureLoaded() {
  try {
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, "utf-8");
      const obj = JSON.parse(raw || "{}");
      active = obj.active || 0;
      maxActive = obj.maxActive || 0;
      maxHistory = Array.isArray(obj.maxHistory) ? obj.maxHistory : [];
      calls = Array.isArray(obj.calls) ? obj.calls : [];
      errors = Array.isArray(obj.errors) ? obj.errors : [];
      const v: Record<string, string[]> = obj.visitors || {};
      visitors = Object.fromEntries(Object.entries(v).map(([k, arr]) => [k, new Set(arr || [])]));
    }
  } catch {}
}

function persist() {
  try {
    const serializedVisitors: Record<string, string[]> = Object.fromEntries(
      Object.entries(visitors).map(([k, set]) => [k, Array.from(set)])
    );
    const obj = { active, maxActive, maxHistory, calls, errors, visitors: serializedVisitors };
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(obj));
  } catch {}
}

ensureLoaded();

export function recordStart(ip: string) {
  active += 1;
  if (active > maxActive) {
    maxActive = active;
    maxHistory.push({ ts: Date.now(), value: maxActive });
  }
  const d = new Date();
  const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!visitors[ds]) visitors[ds] = new Set();
  if (ip) visitors[ds].add(ip);
}

export function recordCall() {
  calls.push(Date.now());
}

export function recordFinish(status: number) {
  active = Math.max(0, active - 1);
  if (status >= 400) errors.push(Date.now());
  persist();
}

function rangeMs(r: Range) {
  if (r === "24h") return 24 * 60 * 60 * 1000;
  if (r === "7d") return 7 * 24 * 60 * 60 * 1000;
  if (r === "30d") return 30 * 24 * 60 * 60 * 1000;
  return 365 * 24 * 60 * 60 * 1000;
}

export function getMetrics(r: Range) {
  const now = Date.now();
  const since = now - rangeMs(r);
  const callsCount = calls.filter((t) => t >= since).length;
  const errorsCount = errors.filter((t) => t >= since).length;
  const maxInRange = maxHistory.filter((h) => h.ts >= since).reduce((m, h) => Math.max(m, h.value), 0);
  const days: string[] = [];
  for (let i = 0; i <= Math.ceil(rangeMs(r) / (24 * 60 * 60 * 1000)); i++) {
    const d = new Date(since + i * 24 * 60 * 60 * 1000);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push(ds);
  }
  let visitorsCount = 0;
  const seen = new Set<string>();
  for (const ds of days) {
    const set = visitors[ds];
    if (set) {
      for (const ip of set) if (!seen.has(ip)) { seen.add(ip); visitorsCount += 1; }
    }
  }
  return { range: r, active, maxConcurrency: Math.max(maxInRange, active), calls: callsCount, errors: errorsCount, visitors: visitorsCount };
}

export function metricsMiddleware(req: any, res: any, next: any) {
  recordStart(req.ip || "");
  const p = String(req.path || "");
  if (p.startsWith("/chat")) recordCall();
  res.on("finish", () => { recordFinish(res.statusCode || 0); });
  next();
}

function bucketize(range: Range) {
  const now = Date.now();
  const ms = rangeMs(range);
  const start = now - ms;
  const buckets: { label: string; from: number; to: number }[] = [];
  if (range === "24h") {
    for (let i = 0; i < 24; i++) {
      const from = start + i * 60 * 60 * 1000;
      const to = from + 60 * 60 * 1000;
      const d = new Date(from);
      const label = `${String(d.getHours()).padStart(2, "0")}:00`;
      buckets.push({ label, from, to });
    }
  } else {
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    for (let i = 0; i < days; i++) {
      const from = start + i * 24 * 60 * 60 * 1000;
      const to = from + 24 * 60 * 60 * 1000;
      const d = new Date(from);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      buckets.push({ label, from, to });
    }
  }
  return buckets;
}

export function getSeries(range: Range) {
  const buckets = bucketize(range);
  const series = buckets.map((b) => {
    const callsCount = calls.filter((t) => t >= b.from && t < b.to).length;
    const errorsCount = errors.filter((t) => t >= b.from && t < b.to).length;
    let visitorsCount = 0;
    const d = new Date(b.from);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const set = visitors[ds];
    if (set) visitorsCount = set.size;
    return { label: b.label, calls: callsCount, errors: errorsCount, visitors: visitorsCount };
  });
  return series;
}