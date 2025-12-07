import fs from "fs";
import path from "path";

type Range = "24h" | "7d" | "30d" | "365d";

const dataPath = path.resolve(process.cwd(), "data/metrics.json");

let active = 0;
let maxActive = 0;
let maxHistory: { ts: number; value: number }[] = [];
let calls: number[] = [];
let errors: number[] = [];
// New structure: log of all visits with timestamp
let visitorLog: { ts: number; ip: string }[] = [];

function persist() {
  try {
    const obj = { active, maxActive, maxHistory, calls, errors, visitorLog };
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(obj));
  } catch (e) {
    console.error("Persist failed:", e);
  }
}

function ensureLoaded() {
  console.log("Loading metrics from:", dataPath);
  if (fs.existsSync(dataPath)) {
    const raw = fs.readFileSync(dataPath, "utf-8");
    let obj;
    try {
      obj = JSON.parse(raw || "{}");
    } catch (e) {
      console.error("Failed to parse metrics.json, resetting to empty defaults", e);
      obj = {};
    }

    active = typeof obj.active === 'number' ? obj.active : 0;
    maxActive = typeof obj.maxActive === 'number' ? obj.maxActive : 0;
    maxHistory = Array.isArray(obj.maxHistory) ? obj.maxHistory : [];
    calls = Array.isArray(obj.calls) ? obj.calls : [];
    errors = Array.isArray(obj.errors) ? obj.errors : [];

    // Migration: Convert old visitors object to visitorLog if needed
    if (obj.visitors && !obj.visitorLog && typeof obj.visitors === 'object' && !Array.isArray(obj.visitors)) {
      console.log("Migrating old visitors data...");
      const oldVisitors: Record<string, string[]> = obj.visitors;
      visitorLog = [];
      Object.entries(oldVisitors).forEach(([dateStr, ips]) => {
        // Parse date string YYYY-MM-DD
        const [y, m, d] = dateStr.split('-').map(Number);
        // Set time to noon to be safe
        const ts = new Date(y, m - 1, d, 12, 0, 0).getTime();
        if (Array.isArray(ips)) {
          ips.forEach(ip => visitorLog.push({ ts, ip }));
        }
      });
      // Persist immediately after migration
      persist();
    } else {
      visitorLog = Array.isArray(obj.visitorLog) ? obj.visitorLog : [];
    }
  } else {
    console.log("Metrics file not found, using defaults");
    // File doesn't exist, ensure defaults
    active = 0;
    maxActive = 0;
    maxHistory = [];
    calls = [];
    errors = [];
    visitorLog = [];
  }
  console.log("Metrics loaded. VisitorLog length:", visitorLog?.length);
}

ensureLoaded();

export function logCall() {
  if (!calls) calls = [];
  calls.push(Date.now());
  // Keep last 10000 calls
  if (calls.length > 10000) calls.shift();
  persist();
}

export function logError() {
  if (!errors) errors = [];
  errors.push(Date.now());
  if (errors.length > 10000) errors.shift();
  persist();
}

export function logVisit(ip: string) {
  if (!visitorLog) {
    console.error("visitorLog is undefined in logVisit! Re-initializing.");
    visitorLog = [];
  }
  // Log every visit with timestamp
  visitorLog.push({ ts: Date.now(), ip });
  // Keep last 50000 visits to avoid unlimited growth
  if (visitorLog.length > 50000) visitorLog.shift();
  persist();
}

export function updateActive(count: number) {
  active = count;
  if (count > maxActive) {
    maxActive = count;
  }
  if (!maxHistory) maxHistory = [];
  maxHistory.push({ ts: Date.now(), value: count });
  // Keep last 1000 history points
  if (maxHistory.length > 1000) maxHistory.shift();
  persist();
}

export function getMetrics() {
  if (!visitorLog) {
    console.error("visitorLog is undefined in getMetrics!");
    return { visitors: 0, totalUniqueVisitors: 0, maxConcurrency: 0, calls: 0, errors: 0 };
  }
  // Calculate total unique visitors from the log
  const uniqueIPs = new Set(visitorLog.map(v => v.ip));

  return {
    visitors: uniqueIPs.size, // Total unique visitors ever
    totalUniqueVisitors: uniqueIPs.size,
    maxConcurrency: maxActive,
    calls: calls?.length || 0,
    errors: errors?.length || 0
  };
}

function bucketize(range: Range) {
  const now = Date.now();
  const buckets: { from: number; to: number; label: string }[] = [];

  if (range === "24h") {
    // Last 24 hours, hourly buckets
    for (let i = 23; i >= 0; i--) {
      const from = now - (i + 1) * 3600 * 1000;
      const to = now - i * 3600 * 1000;
      // Use 'to' time for label (the end of the bucket period)
      const date = new Date(to);
      buckets.push({ from, to, label: `${date.getHours()}:00` });
    }
  } else if (range === "7d") {
    // Last 7 days, daily buckets
    for (let i = 6; i >= 0; i--) {
      const from = now - (i + 1) * 24 * 3600 * 1000;
      const to = now - i * 24 * 3600 * 1000;
      const date = new Date(from);
      buckets.push({ from, to, label: `${date.getMonth() + 1}/${date.getDate()}` });
    }
  } else if (range === "30d") {
    // Last 30 days, daily buckets
    for (let i = 29; i >= 0; i--) {
      const from = now - (i + 1) * 24 * 3600 * 1000;
      const to = now - i * 24 * 3600 * 1000;
      const date = new Date(from);
      buckets.push({ from, to, label: `${date.getMonth() + 1}/${date.getDate()}` });
    }
  } else if (range === "365d") {
    // Last 12 months, monthly buckets
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      const from = d.getTime();

      const nextMonth = new Date(d);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const to = nextMonth.getTime();

      buckets.push({ from, to, label: `${d.getFullYear()}/${d.getMonth() + 1}` });
    }
  }
  return buckets;
}

export function getSeries(range: Range) {
  const buckets = bucketize(range);

  // Track cumulative unique visitors across buckets
  const cumulativeUniqueIPs = new Set<string>();

  const series = buckets.map((b) => {
    const callsCount = (calls || []).filter((t) => t >= b.from && t < b.to).length;
    const errorsCount = (errors || []).filter((t) => t >= b.from && t < b.to).length;

    // Visits (PV): Total entries in visitorLog for this bucket
    const visitsCount = (visitorLog || []).filter(v => v.ts >= b.from && v.ts < b.to).length;

    // Unique Visitors (UV) in this bucket
    const visitorsInBucket = new Set<string>();
    (visitorLog || []).filter(v => v.ts >= b.from && v.ts < b.to).forEach(v => {
      visitorsInBucket.add(v.ip);
      cumulativeUniqueIPs.add(v.ip);
    });

    // Find max concurrency in bucket
    let maxConcurrencyInBucket = 0;
    const bucketMaxHistory = (maxHistory || []).filter(h => h.ts >= b.from && h.ts < b.to);
    if (bucketMaxHistory.length > 0) {
      maxConcurrencyInBucket = Math.max(...bucketMaxHistory.map(h => h.value));
    }

    return {
      label: b.label,
      calls: callsCount,
      errors: errorsCount,
      visits: visitsCount, // PV
      visitors: visitorsInBucket.size, // Hourly/Daily UV
      cumulativeVisitors: cumulativeUniqueIPs.size, // Cumulative UV
      maxConcurrency: maxConcurrencyInBucket
    };
  });
  return series;
}

// Middleware to track visits (excludes admin routes)
export function metricsMiddleware(req: any, res: any, next: any) {
  // Skip admin routes
  if (req.path.startsWith('/admin')) {
    return next();
  }

  const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown';
  // Extract first IP if x-forwarded-for contains multiple
  const cleanIP = typeof ip === 'string' ? ip.split(',')[0].trim() : ip;

  console.log('[Metrics] Logging visit from IP:', cleanIP, 'Path:', req.path);
  logVisit(cleanIP);
  next();
}