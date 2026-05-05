import { describe, it, expect } from 'vitest';
import { transformMessages } from './transform';

describe('transformMessages', () => {
  const messages = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there' },
    { role: 'user', content: 'How are you?' },
  ];

  it('returns empty array for non-array input', () => {
    expect(transformMessages(null as any, 'openai')).toEqual([]);
    expect(transformMessages(undefined as any, 'openai')).toEqual([]);
  });

  describe('openai format', () => {
    it('maps messages to role/content format', () => {
      const result = transformMessages(messages, 'openai');
      expect(result).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'user', content: 'How are you?' },
      ]);
    });

    it('defaults missing role to "user"', () => {
      const result = transformMessages([{ content: 'test' }], 'openai');
      expect(result[0].role).toBe('user');
    });

    it('defaults missing content to empty string', () => {
      const result = transformMessages([{ role: 'user' }], 'openai');
      expect(result[0].content).toBe('');
    });
  });

  describe('gemini format', () => {
    it('converts to contents with parts', () => {
      const result = transformMessages(messages, 'gemini');
      expect(result.contents).toHaveLength(3);
      expect(result.contents[0]).toEqual({ role: 'user', parts: [{ text: 'Hello' }] });
      expect(result.contents[1]).toEqual({ role: 'model', parts: [{ text: 'Hi there' }] });
    });

    it('converts system role to user with prefix', () => {
      const result = transformMessages([{ role: 'system', content: 'Be helpful' }], 'gemini');
      expect(result.contents[0].role).toBe('user');
      expect(result.contents[0].parts[0].text).toBe('System: Be helpful');
    });

    it('prepends user message if first message is from model', () => {
      const result = transformMessages([{ role: 'assistant', content: 'First' }], 'gemini');
      expect(result.contents[0].role).toBe('user');
      expect(result.contents[0].parts[0].text).toBe('System instructions provided.');
      expect(result.contents[1].role).toBe('model');
    });
  });

  describe('unknown format', () => {
    it('returns messages as-is', () => {
      const result = transformMessages(messages, 'unknown');
      expect(result).toEqual(messages);
    });
  });
});
