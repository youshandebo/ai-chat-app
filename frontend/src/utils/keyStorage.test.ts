import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredKeys, addStoredKey, removeStoredKey } from './keyStorage';

beforeEach(() => {
  localStorage.clear();
});

describe('keyStorage', () => {
  it('returns empty array when no keys stored', () => {
    expect(getStoredKeys()).toEqual([]);
  });

  it('adds a key', () => {
    addStoredKey('KEY-001');
    expect(getStoredKeys()).toEqual(['KEY-001']);
  });

  it('does not add duplicate key', () => {
    addStoredKey('KEY-001');
    addStoredKey('KEY-001');
    expect(getStoredKeys()).toEqual(['KEY-001']);
  });

  it('adds multiple unique keys', () => {
    addStoredKey('KEY-001');
    addStoredKey('KEY-002');
    addStoredKey('KEY-003');
    expect(getStoredKeys()).toEqual(['KEY-001', 'KEY-002', 'KEY-003']);
  });

  it('removes a key', () => {
    addStoredKey('KEY-001');
    addStoredKey('KEY-002');
    removeStoredKey('KEY-001');
    expect(getStoredKeys()).toEqual(['KEY-002']);
  });

  it('handles removing non-existent key', () => {
    addStoredKey('KEY-001');
    removeStoredKey('KEY-999');
    expect(getStoredKeys()).toEqual(['KEY-001']);
  });

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('ai_chat_activation_keys', 'not-json!!!');
    expect(getStoredKeys()).toEqual([]);
  });
});
