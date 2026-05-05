import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const realDataDir = path.resolve(process.cwd(), 'data');
const realUsageFile = path.join(realDataDir, 'usage.json');
let backupData: string | null = null;

beforeEach(() => {
  if (fs.existsSync(realUsageFile)) {
    backupData = fs.readFileSync(realUsageFile, 'utf-8');
  }
  fs.mkdirSync(realDataDir, { recursive: true });
  const today = new Date().toISOString().split('T')[0];
  fs.writeFileSync(realUsageFile, JSON.stringify({
    date: today,
    fingerprints: {},
    ipHistory: {}
  }), 'utf-8');
});

afterEach(() => {
  if (backupData !== null) {
    fs.writeFileSync(realUsageFile, backupData, 'utf-8');
  } else if (fs.existsSync(realUsageFile)) {
    fs.unlinkSync(realUsageFile);
  }
  backupData = null;
});

async function loadUsageService() {
  vi.resetModules();
  const mod = await import('./usageService');
  return mod.UsageService;
}

describe('UsageService', () => {
  it('allows new fingerprint as normal user', async () => {
    const svc = await loadUsageService();
    const result = svc.checkLimit('fp-new', '1.2.3.4');
    expect(result.allowed).toBe(true);
    expect(result.role).toBe('normal');
    expect(result.remaining).toBe(25);
  });

  it('restricts second fingerprint on same IP', async () => {
    const svc = await loadUsageService();
    svc.checkLimit('fp-first', '10.0.0.1');
    const result = svc.checkLimit('fp-second', '10.0.0.1');
    expect(result.role).toBe('restricted');
    expect(result.remaining).toBe(10);
    expect(result.showWarning).toBe(true);
  });

  it('increments usage count', async () => {
    const svc = await loadUsageService();
    svc.checkLimit('fp-inc', '2.2.2.2');
    svc.increment('fp-inc', 1);
    svc.increment('fp-inc', 1);
    expect(svc.get('fp-inc')).toBe(2);
  });

  it('blocks when daily limit exceeded for normal user', async () => {
    const svc = await loadUsageService();
    svc.checkLimit('fp-limit', '3.3.3.3');
    svc.increment('fp-limit', 25);
    const result = svc.checkLimit('fp-limit', '3.3.3.3');
    expect(result.allowed).toBe(false);
  });

  it('blocks when daily limit exceeded for restricted user', async () => {
    const svc = await loadUsageService();
    // Create restricted user
    svc.checkLimit('fp-a', '4.4.4.4');
    svc.checkLimit('fp-b', '4.4.4.4');
    svc.increment('fp-b', 10);
    const result = svc.checkLimit('fp-b', '4.4.4.4');
    expect(result.allowed).toBe(false);
  });

  it('allows zero-cost models regardless of usage', async () => {
    const svc = await loadUsageService();
    svc.checkLimit('fp-free', '5.5.5.5');
    svc.increment('fp-free', 50); // exceed limit
    const result = svc.checkLimit('fp-free', '5.5.5.5', 0);
    expect(result.allowed).toBe(true);
  });

  it('tracks IP history for new fingerprints', async () => {
    const svc = await loadUsageService();
    svc.checkLimit('fp-hist', '6.6.6.6');
    // Verify by checking a second fingerprint on same IP gets restricted
    const result = svc.checkLimit('fp-hist2', '6.6.6.6');
    expect(result.role).toBe('restricted');
  });

  it('returns 0 for unknown fingerprint usage', async () => {
    const svc = await loadUsageService();
    expect(svc.get('unknown-fp')).toBe(0);
  });
});
