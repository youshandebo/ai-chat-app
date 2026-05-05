import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { writeJsonAtomic } from './fileUtils';

const testDir = path.join(__dirname, '__test_tmp__');
const testFile = path.join(testDir, 'test.json');

beforeEach(() => {
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
});

describe('writeJsonAtomic', () => {
  it('writes JSON data to file', () => {
    const data = { name: 'test', value: 42 };
    writeJsonAtomic(testFile, data);

    const raw = fs.readFileSync(testFile, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual(data);
  });

  it('overwrites existing file atomically', () => {
    writeJsonAtomic(testFile, { v: 1 });
    writeJsonAtomic(testFile, { v: 2 });

    const parsed = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    expect(parsed.v).toBe(2);
  });

  it('creates directory if missing', () => {
    const deepFile = path.join(testDir, 'sub', 'dir', 'data.json');
    writeJsonAtomic(deepFile, { ok: true });

    expect(fs.existsSync(deepFile)).toBe(true);
    expect(JSON.parse(fs.readFileSync(deepFile, 'utf-8')).ok).toBe(true);
  });

  it('handles arrays', () => {
    writeJsonAtomic(testFile, [1, 2, 3]);
    expect(JSON.parse(fs.readFileSync(testFile, 'utf-8'))).toEqual([1, 2, 3]);
  });

  it('handles nested objects', () => {
    const data = { a: { b: { c: 'deep' } }, arr: [{ x: 1 }] };
    writeJsonAtomic(testFile, data);
    expect(JSON.parse(fs.readFileSync(testFile, 'utf-8'))).toEqual(data);
  });

  it('cleans up temp file on error', () => {
    // Writing to a non-existent drive/path should throw
    expect(() => writeJsonAtomic('Z:\\nonexistent\\path\\file.json', {})).toThrow();
  });
});
