import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fingerprintjs
vi.mock('@fingerprintjs/fingerprintjs', () => ({
  default: {
    load: vi.fn().mockResolvedValue({
      get: vi.fn().mockResolvedValue({ visitorId: 'test-visitor-id' }),
    }),
  },
}));

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => '12345678-1234-4567-8901-123456789012',
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.resetModules();
});

describe('getFingerprint', () => {
  it('returns cached ID on subsequent calls', async () => {
    const { getFingerprint } = await import('./fingerprint');
    const fp1 = await getFingerprint();
    const fp2 = await getFingerprint();
    expect(fp1).toBe(fp2);
  });

  it('stores fingerprint in localStorage', async () => {
    const { getFingerprint } = await import('./fingerprint');
    const fp = await getFingerprint();
    expect(fp).toBeTruthy();
    expect(localStorage.getItem('device_fp')).toBe(fp);
  });

  it('uses stored fingerprint from localStorage', async () => {
    localStorage.setItem('device_fp', 'stored-fp-value');
    const { getFingerprint } = await import('./fingerprint');
    const fp = await getFingerprint();
    expect(fp).toBe('stored-fp-value');
  });
});
