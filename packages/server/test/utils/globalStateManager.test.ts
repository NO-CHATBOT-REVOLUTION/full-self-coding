import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { globalStateManager } from '../../src/utils/globalStateManager.js';
import type { GlobalStateEntry, GlobalStateQueryOptions } from '../../src/types/index.js';

describe('GlobalStateManager', () => {
  beforeEach(() => {
    // Clear the state manager before each test
    globalStateManager.clear();
  });

  afterEach(() => {
    // Clear the state manager after each test
    globalStateManager.clear();
  });

  describe('set() and get()', () => {
    it('should store and retrieve a value', () => {
      const key = 'test-key';
      const value = { message: 'Hello World' };

      globalStateManager.set(key, value);
      const retrieved = globalStateManager.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return undefined for non-existent keys', () => {
      const result = globalStateManager.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should handle TTL (time to live)', async () => {
      const key = 'ttl-key';
      const value = { data: 'expires-soon' };
      const ttl = 100; // 100ms

      globalStateManager.set(key, value, { ttl });

      // Should be available immediately
      expect(globalStateManager.get(key)).toEqual(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(globalStateManager.get(key)).toBeUndefined();
    });

    it('should support metadata', () => {
      const key = 'metadata-key';
      const value = { data: 'test' };
      const metadata = { type: 'test', version: 1 };

      globalStateManager.set(key, value, { metadata });

      const entry = globalStateManager.getEntry(key);
      expect(entry?.metadata).toEqual(metadata);
    });

    it('should overwrite existing values', () => {
      const key = 'overwrite-key';

      globalStateManager.set(key, 'first-value');
      expect(globalStateManager.get(key)).toBe('first-value');

      globalStateManager.set(key, 'second-value');
      expect(globalStateManager.get(key)).toBe('second-value');
    });

    it('should handle different value types', () => {
      const testCases = [
        { key: 'string', value: 'hello world' },
        { key: 'number', value: 42 },
        { key: 'boolean', value: true },
        { key: 'object', value: { nested: 'data' } },
        { key: 'array', value: [1, 2, 3] },
        { key: 'null', value: null }
      ];

      testCases.forEach(({ key, value }) => {
        globalStateManager.set(key, value);
        expect(globalStateManager.get(key)).toBe(value);
      });
    });
  });

  describe('update()', () => {
    it('should update existing entries', () => {
      const key = 'update-key';
      const initialValue = { count: 1 };
      const newValue = { count: 2 };

      globalStateManager.set(key, initialValue);

      const result = globalStateManager.update(key, newValue);

      expect(result).toBe(true);
      expect(globalStateManager.get(key)).toEqual(newValue);
    });

    it('should return false when updating non-existent entries', () => {
      const result = globalStateManager.update('non-existent', 'new-value');
      expect(result).toBe(false);
    });
  });

  describe('delete()', () => {
    it('should delete existing entries', () => {
      const key = 'delete-key';
      globalStateManager.set(key, 'value-to-delete');

      const deleted = globalStateManager.delete(key);

      expect(deleted).toBe(true);
      expect(globalStateManager.get(key)).toBeUndefined();
    });

    it('should return false for non-existent entries', () => {
      const deleted = globalStateManager.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('has()', () => {
    it('should return true for existing entries', () => {
      const key = 'exists-key';
      globalStateManager.set(key, 'value');

      expect(globalStateManager.has(key)).toBe(true);
    });

    it('should return false for non-existent entries', () => {
      expect(globalStateManager.has('non-existent')).toBe(false);
    });

    it('should return false for expired entries', async () => {
      const key = 'expired-key';
      globalStateManager.set(key, 'value', { ttl: 50 });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(globalStateManager.has(key)).toBe(false);
    });
  });

  describe('getEntry()', () => {
    it('should return complete entry information', () => {
      const key = 'entry-key';
      const value = { data: 'test' };
      const metadata = { type: 'test' };

      globalStateManager.set(key, value, { metadata });

      const entry = globalStateManager.getEntry(key);

      expect(entry).toBeDefined();
      expect(entry!.key).toBe(key);
      expect(entry!.value).toEqual(value);
      expect(entry!.metadata).toEqual(metadata);
      expect(entry!.createdAt).toBeInstanceOf(Date);
      expect(entry!.updatedAt).toBeInstanceOf(Date);
    });

    it('should return undefined for non-existent entries', () => {
      const entry = globalStateManager.getEntry('non-existent');
      expect(entry).toBeUndefined();
    });
  });

  describe('query()', () => {
    beforeEach(() => {
      // Set up test data
      globalStateManager.set('user:1', { name: 'Alice', active: true });
      globalStateManager.set('user:2', { name: 'Bob', active: false });
      globalStateManager.set('session:abc', { userId: 1, data: 'session-data' });
    });

    it('should query all entries when no options provided', () => {
      const results = globalStateManager.query();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by prefix', () => {
      const userResults = globalStateManager.query({ prefix: 'user:' });
      expect(userResults.length).toBe(2);
      expect(userResults.every(entry => entry.key.startsWith('user:'))).toBe(true);
    });

    it('should limit results', () => {
      const limited = globalStateManager.query({ limit: 2 });
      expect(limited.length).toBeLessThanOrEqual(2);
    });

    it('should offset results', () => {
      const offset = globalStateManager.query({ offset: 1 });
      expect(offset.length).toBeLessThanOrEqual(2);
    });

    it('should combine multiple query options', () => {
      const results = globalStateManager.query({
        prefix: 'user:',
        limit: 1,
        offset: 1
      });

      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('cleanupExpiredEntries()', () => {
    it('should remove expired entries', async () => {
      globalStateManager.set('permanent', 'stays-forever');
      globalStateManager.set('short-lived', 'expires-soon', { ttl: 50 });

      await new Promise(resolve => setTimeout(resolve, 100));

      const cleaned = globalStateManager.cleanupExpiredEntries();

      expect(cleaned).toBeGreaterThanOrEqual(1);
      expect(globalStateManager.has('permanent')).toBe(true);
      expect(globalStateManager.has('short-lived')).toBe(false);
    });

    it('should return 0 when no expired entries', () => {
      globalStateManager.set('permanent', 'stays-forever');

      const cleaned = globalStateManager.cleanupExpiredEntries();

      expect(cleaned).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should remove all entries', () => {
      globalStateManager.set('key1', 'value1');
      globalStateManager.set('key2', 'value2');

      const beforeCount = globalStateManager.query().length;
      expect(beforeCount).toBeGreaterThan(0);

      globalStateManager.clear();

      const afterCount = globalStateManager.query().length;
      expect(afterCount).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should return accurate statistics', () => {
      globalStateManager.set('key1', 'value1');
      globalStateManager.set('key2', 'value2');
      globalStateManager.set('key3', 'value3');

      const stats = globalStateManager.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
      expect(stats.newestEntry).toBeInstanceOf(Date);
    });

    it('should handle expired entries in stats', async () => {
      globalStateManager.set('permanent', 'value');
      globalStateManager.set('expired', 'value', { ttl: 50 });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Clean up expired entries first
      globalStateManager.cleanupExpiredEntries();

      const stats = globalStateManager.getStats();

      expect(stats.totalEntries).toBe(1);
    });
  });
});