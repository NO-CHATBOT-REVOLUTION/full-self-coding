import type { GlobalStateEntry, GlobalStateQueryOptions, GlobalStateStats } from '../types/index.js';

export class GlobalStateManager {
  private state: Map<string, GlobalStateEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor() {
    // Start cleanup interval to remove expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 60 * 1000); // Run cleanup every hour
  }

  /**
   * Set a value in the global state
   */
  public set<T = any>(
    key: string,
    value: T,
    options?: {
      ttl?: number; // Time to live in milliseconds
      metadata?: Record<string, any>;
    }
  ): void {
    const now = new Date();
    const entry: GlobalStateEntry<T> = {
      key,
      value,
      createdAt: now,
      updatedAt: now,
      expiresAt: options?.ttl ? new Date(now.getTime() + options.ttl) : undefined,
      metadata: options?.metadata
    };

    this.state.set(key, entry);
  }

  /**
   * Get a value from the global state
   */
  public get<T = any>(key: string): T | undefined {
    const entry = this.state.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.state.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Get a full entry with metadata
   */
  public getEntry<T = any>(key: string): GlobalStateEntry<T> | undefined {
    const entry = this.state.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.state.delete(key);
      return undefined;
    }

    return entry as GlobalStateEntry<T>;
  }

  /**
   * Check if a key exists
   */
  public has(key: string): boolean {
    const entry = this.state.get(key);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.state.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the global state
   */
  public delete(key: string): boolean {
    return this.state.delete(key);
  }

  /**
   * Clear all entries
   */
  public clear(): void {
    this.state.clear();
  }

  /**
   * Get all keys matching a prefix
   */
  public getKeys(prefix?: string): string[] {
    const keys: string[] = [];

    for (const [key, entry] of this.state.entries()) {
      // Skip expired entries
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        continue;
      }

      if (!prefix || key.startsWith(prefix)) {
        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Query entries with options
   */
  public query(options: GlobalStateQueryOptions = {}): GlobalStateEntry[] {
    const {
      prefix,
      limit,
      offset = 0,
      includeExpired = false
    } = options;

    const entries: GlobalStateEntry[] = [];
    let skipped = 0;

    for (const entry of this.state.values()) {
      // Skip expired entries unless included
      if (!includeExpired && entry.expiresAt && entry.expiresAt < new Date()) {
        continue;
      }

      // Filter by prefix
      if (prefix && !entry.key.startsWith(prefix)) {
        continue;
      }

      // Handle offset
      if (skipped < offset) {
        skipped++;
        continue;
      }

      // Handle limit
      if (limit && entries.length >= limit) {
        break;
      }

      entries.push(entry);
    }

    return entries;
  }

  /**
   * Update an existing entry
   */
  public update<T = any>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      metadata?: Record<string, any>;
      mergeMetadata?: boolean;
    }
  ): boolean {
    const existingEntry = this.state.get(key);

    if (!existingEntry) {
      return false;
    }

    // Check if entry has expired
    if (existingEntry.expiresAt && existingEntry.expiresAt < new Date()) {
      this.state.delete(key);
      return false;
    }

    const now = new Date();
    const updatedEntry: GlobalStateEntry<T> = {
      ...existingEntry,
      value,
      updatedAt: now,
      expiresAt: options?.ttl ? new Date(now.getTime() + options.ttl) : existingEntry.expiresAt,
      metadata: options?.mergeMetadata
        ? { ...existingEntry.metadata, ...options.metadata }
        : options?.metadata || existingEntry.metadata
    };

    this.state.set(key, updatedEntry);
    return true;
  }

  /**
   * Get statistics about the global state
   */
  public getStats(): GlobalStateStats {
    const now = new Date();
    let totalEntries = 0;
    let expiredEntries = 0;
    let memoryUsage = 0;
    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;

    for (const entry of this.state.values()) {
      totalEntries++;

      if (entry.expiresAt && entry.expiresAt < now) {
        expiredEntries++;
      }

      // Estimate memory usage (rough calculation)
      memoryUsage += JSON.stringify(entry.value).length +
                   JSON.stringify(entry.metadata || {}).length +
                   entry.key.length * 2;

      if (!oldestEntry || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }

      if (!newestEntry || entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt;
      }
    }

    return {
      totalEntries,
      expiredEntries,
      memoryUsage,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Clean up expired entries
   */
  public cleanupExpiredEntries(): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, entry] of this.state.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.state.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get or create a value (useful for counters, etc.)
   */
  public getOrCreate<T>(
    key: string,
    defaultValue: T | (() => T),
    options?: {
      ttl?: number;
      metadata?: Record<string, any>;
    }
  ): T {
    const existing = this.get<T>(key);

    if (existing !== undefined) {
      return existing;
    }

    const value = typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue;
    this.set(key, value, options);
    return value;
  }

  /**
   * Increment a numeric value
   */
  public increment(key: string, amount: number = 1): number {
    const current = this.get<number>(key) || 0;
    const newValue = current + amount;
    this.set(key, newValue);
    return newValue;
  }

  /**
   * Decrement a numeric value
   */
  public decrement(key: string, amount: number = 1): number {
    return this.increment(key, -amount);
  }

  /**
   * Add items to an array value
   */
  public pushToArray<T>(key: string, ...items: T[]): T[] {
    const current = this.get<T[]>(key) || [];
    const newArray = [...current, ...items];
    this.set(key, newArray);
    return newArray;
  }

  /**
   * Remove items from an array value
   */
  public removeFromArray<T>(key: string, ...items: T[]): T[] {
    const current = this.get<T[]>(key) || [];
    const newArray = current.filter(item => !items.includes(item));
    this.set(key, newArray);
    return newArray;
  }

  /**
   * Destroy the state manager and cleanup resources
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Create a singleton instance
export const globalStateManager = new GlobalStateManager();