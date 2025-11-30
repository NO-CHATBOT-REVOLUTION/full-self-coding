import { describe, it, expect, beforeEach, afterEach, jest } from 'bun:test';
import { globalStateManager } from './globalStateManager.js';
import type { GlobalStateEntry, GlobalStateQueryOptions } from '../types/index.js';

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

    it('should return null for non-existent keys', () => {
      const result = globalStateManager.get('non-existent-key');
      expect(result).toBeNull();
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
      expect(globalStateManager.get(key)).toBeNull();
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
        { key: 'null', value: null },
        { key: 'undefined', value: undefined }
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
      const updateFn = (current: any) => ({ count: current.count + 1 });

      globalStateManager.set(key, initialValue);

      const result = globalStateManager.update(key, updateFn);

      expect(result).toEqual({ count: 2 });
      expect(globalStateManager.get(key)).toEqual({ count: 2 });
    });

    it('should return null when updating non-existent entries', () => {
      const result = globalStateManager.update('non-existent', () => 'new-value');
      expect(result).toBeNull();
    });

    it('should handle update functions that throw', () => {
      const key = 'error-key';
      globalStateManager.set(key, 'initial');

      const errorFn = () => {
        throw new Error('Update failed');
      };

      expect(() => globalStateManager.update(key, errorFn)).toThrow('Update failed');
    });
  });

  describe('delete()', () => {
    it('should delete existing entries', () => {
      const key = 'delete-key';
      globalStateManager.set(key, 'value-to-delete');

      const deleted = globalStateManager.delete(key);

      expect(deleted).toBe(true);
      expect(globalStateManager.get(key)).toBeNull();
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

    it('should return null for non-existent entries', () => {
      const entry = globalStateManager.getEntry('non-existent');
      expect(entry).toBeNull();
    });
  });

  describe('query()', () => {
    beforeEach(() => {
      // Set up test data
      globalStateManager.set('user:1', { name: 'Alice', active: true });
      globalStateManager.set('user:2', { name: 'Bob', active: false });
      globalStateManager.set('session:abc', { userId: 1, data: 'session-data' });
      globalStateManager.set('temp:xyz', { temporary: true }, { ttl: 5000 });
    });

    it('should query all entries when no options provided', () => {
      const results = globalStateManager.query();
      expect(results).toHaveLength(4);
    });

    it('should filter by prefix', () => {
      const userResults = globalStateManager.query({ prefix: 'user:' });
      expect(userResults).toHaveLength(2);
      expect(userResults.every(entry => entry.key.startsWith('user:'))).toBe(true);
    });

    it('should limit results', () => {
      const limited = globalStateManager.query({ limit: 2 });
      expect(limited).toHaveLength(2);
    });

    it('should offset results', () => {
      const offset = globalStateManager.query({ offset: 2 });
      expect(offset).toHaveLength(2);
    });

    it('should exclude expired entries by default', async () => {
      const key = 'quick-expire';
      globalStateManager.set(key, 'value', { ttl: 10 });

      await new Promise(resolve => setTimeout(resolve, 20));

      const results = globalStateManager.query();
      expect(results.some(entry => entry.key === key)).toBe(false);
    });

    it('should include expired entries when requested', async () => {
      const key = 'quick-expire-2';
      globalStateManager.set(key, 'value', { ttl: 10 });

      await new Promise(resolve => setTimeout(resolve, 20));

      const results = globalStateManager.query({ includeExpired: true });
      expect(results.some(entry => entry.key === key)).toBe(true);
    });

    it('should combine multiple query options', () => {
      const results = globalStateManager.query({
        prefix: 'user:',
        limit: 1,
        offset: 1
      });

      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('user:2');
    });
  });

  describe('array operations', () => {
    const arrayKey = 'test-array';

    beforeEach(() => {
      globalStateManager.set(arrayKey, [1, 2, 3]);
    });

    it('should push items to arrays', () => {
      const result = globalStateManager.arrayPush(arrayKey, 4, 5);
      expect(result).toBe(5); // new length
      expect(globalStateManager.get(arrayKey)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should pop items from arrays', () => {
      const result = globalStateManager.arrayPop(arrayKey);
      expect(result).toBe(3);
      expect(globalStateManager.get(arrayKey)).toEqual([1, 2]);
    });

    it('should handle array operations on non-arrays', () => {
      const nonArrayKey = 'non-array';
      globalStateManager.set(nonArrayKey, 'not-an-array');

      expect(() => globalStateManager.arrayPush(nonArrayKey, 1)).toThrow();
      expect(() => globalStateManager.arrayPop(nonArrayKey)).toThrow();
    });

    it('should handle array operations on non-existent keys', () => {
      const result = globalStateManager.arrayPop('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('numeric operations', () => {
    const numberKey = 'test-number';

    beforeEach(() => {
      globalStateManager.set(numberKey, 10);
    });

    it('should increment numbers', () => {
      const result = globalStateManager.increment(numberKey, 5);
      expect(result).toBe(15);
      expect(globalStateManager.get(numberKey)).toBe(15);
    });

    it('should decrement numbers', () => {
      const result = globalStateManager.increment(numberKey, -3);
      expect(result).toBe(7);
      expect(globalStateManager.get(numberKey)).toBe(7);
    });

    it('should handle missing keys with default value', () => {
      const result = globalStateManager.increment('missing', 5, 10);
      expect(result).toBe(15);
      expect(globalStateManager.get('missing')).toBe(15);
    });

    it('should throw on non-numeric values', () => {
      globalStateManager.set('string-value', 'not-a-number');

      expect(() => globalStateManager.increment('string-value', 1)).toThrow();
    });
  });

  describe('cleanup()', () => {
    it('should remove expired entries', async () => {
      globalStateManager.set('permanent', 'stays-forever');
      globalStateManager.set('short-lived', 'expires-soon', { ttl: 50 });
      globalStateManager.set('medium-lived', 'expires-later', { ttl: 200 });

      await new Promise(resolve => setTimeout(resolve, 100));

      const cleaned = globalStateManager.cleanup();

      expect(cleaned).toBe(1); // Only short-lived should be cleaned
      expect(globalStateManager.has('permanent')).toBe(true);
      expect(globalStateManager.has('short-lived')).toBe(false);
      expect(globalStateManager.has('medium-lived')).toBe(true);
    });

    it('should return 0 when no expired entries', () => {
      globalStateManager.set('permanent', 'stays-forever');

      const cleaned = globalStateManager.cleanup();

      expect(cleaned).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should remove all entries', () => {
      globalStateManager.set('key1', 'value1');
      globalStateManager.set('key2', 'value2');
      globalStateManager.set('key3', 'value3');

      expect(globalStateManager.query()).toHaveLength(3);

      globalStateManager.clear();

      expect(globalStateManager.query()).toHaveLength(0);
    });
  });

  describe('getStats()', () => {
    it('should return accurate statistics', () => {
      globalStateManager.set('key1', 'value1');
      globalStateManager.set('key2', 'value2');
      globalStateManager.set('key3', 'value3');

      const stats = globalStateManager.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
      expect(stats.newestEntry).toBeInstanceOf(Date);
      expect(stats.oldestEntry!.getTime()).toBeLessThanOrEqual(stats.newestEntry!.getTime());
    });

    it('should handle expired entries in stats', async () => {
      globalStateManager.set('permanent', 'value');
      globalStateManager.set('expired', 'value', { ttl: 50 });

      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = globalStateManager.getStats();

      expect(stats.totalEntries).toBe(1);
      expect(stats.expiredEntries).toBe(1);
    });
  });
});