import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock data directory to use a temp path
const testDataDir = path.join(__dirname, '__test_data__');
const testKeysFile = path.join(testDataDir, 'keys.json');

// We need to mock the data path. Since keyService uses process.cwd()/data/keys.json,
// we'll create the data dir in cwd for testing and clean up after.
const realDataDir = path.resolve(process.cwd(), 'data');
const realKeysFile = path.join(realDataDir, 'keys.json');
let backupData: string | null = null;

beforeEach(() => {
  // Backup existing keys.json
  if (fs.existsSync(realKeysFile)) {
    backupData = fs.readFileSync(realKeysFile, 'utf-8');
  }
  // Reset to empty state
  fs.mkdirSync(realDataDir, { recursive: true });
  fs.writeFileSync(realKeysFile, JSON.stringify({ unused: [], activated: {} }), 'utf-8');
});

afterEach(() => {
  // Restore backup
  if (backupData !== null) {
    fs.writeFileSync(realKeysFile, backupData, 'utf-8');
  } else if (fs.existsSync(realKeysFile)) {
    fs.unlinkSync(realKeysFile);
  }
  backupData = null;
});

// Re-import after setting up the data file to get fresh state
// Since keyService uses module-level state, we need dynamic import
async function loadKeyService() {
  // Clear module cache to force re-read
  vi.resetModules();
  const mod = await import('./keyService');
  return mod.KeyService;
}

describe('KeyService', () => {
  it('generates keys with correct format', async () => {
    const svc = await loadKeyService();
    const keys = svc.generate(3);
    expect(keys).toHaveLength(3);
    for (const key of keys) {
      expect(key).toMatch(/^Y[A-F0-9]{4}-S[A-F0-9]{4}-D[A-F0-9]{4}-B[A-F0-9]{4}$/);
    }
  });

  it('generates unique keys', async () => {
    const svc = await loadKeyService();
    const keys = svc.generate(10);
    const unique = new Set(keys);
    expect(unique.size).toBe(10);
  });

  it('activates an unused key', async () => {
    const svc = await loadKeyService();
    const [key] = svc.generate(1);
    const result = svc.activate(key);
    expect(result.success).toBe(true);
    expect(result.credits).toBe(25);
  });

  it('returns credits for already activated key', async () => {
    const svc = await loadKeyService();
    const [key] = svc.generate(1);
    svc.activate(key);
    const result = svc.activate(key);
    expect(result.success).toBe(true);
    expect(result.credits).toBe(25);
  });

  it('rejects invalid key activation', async () => {
    const svc = await loadKeyService();
    const result = svc.activate('INVALID-KEY-XXXX');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('uses credit from activated key', async () => {
    const svc = await loadKeyService();
    const [key] = svc.generate(1);
    svc.activate(key);
    const result = svc.useCredit(key, 1);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(24);
  });

  it('rejects credit use on unactivated key', async () => {
    const svc = await loadKeyService();
    const result = svc.useCredit('FAKE-KEY', 1);
    expect(result.success).toBe(false);
  });

  it('rejects credit use when balance insufficient', async () => {
    const svc = await loadKeyService();
    const [key] = svc.generate(1);
    svc.activate(key);
    const result = svc.useCredit(key, 100);
    expect(result.success).toBe(false);
    expect(result.error).toContain('余额不足');
  });

  it('deletes key when credits reach zero', async () => {
    const svc = await loadKeyService();
    const [key] = svc.generate(1);
    svc.activate(key);
    svc.useCredit(key, 25);
    expect(svc.getBalance(key)).toBe(0);
  });

  it('returns correct balance', async () => {
    const svc = await loadKeyService();
    const [key] = svc.generate(1);
    expect(svc.getBalance(key)).toBe(0);
    svc.activate(key);
    expect(svc.getBalance(key)).toBe(25);
  });

  it('getAll returns all keys', async () => {
    const svc = await loadKeyService();
    const keys = svc.generate(3);
    svc.activate(keys[0]);
    const all = svc.getAll();
    expect(all.unused).toHaveLength(2);
    expect(all.activated).toHaveLength(1);
  });
});
