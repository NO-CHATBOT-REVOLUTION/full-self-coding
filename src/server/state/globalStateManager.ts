import type {
  GlobalStateEntry,
  GlobalStateValue,
  GlobalStateQuery,
  GlobalStateSnapshot,
  GlobalStateOperation,
  GlobalStateConfig,
  GlobalStateStats,
  GlobalStateEvents
} from '../types/globalState';

class GlobalStateManager {
  private store: Map<string, GlobalStateEntry> = new Map();
  private operations: GlobalStateOperation[] = [];
  private config: GlobalStateConfig;
  private events: GlobalStateEvents = {};
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: GlobalStateConfig = {}) {
    this.config = {
      maxEntries: 10000,
      maxMemory: 100 * 1024 * 1024, // 100MB
      autoCleanup: true,
      persistentStorage: false,
      storagePath: './.fsc/global-state.json',
      ...config
    };

    if (this.config.autoCleanup) {
      this.startCleanupInterval();
    }
  }

  // Core Get/Set Operations
  set(key: string, value: GlobalStateValue, metadata?: GlobalStateEntry['metadata']): GlobalStateEntry {
    const now = new Date();
    const oldValue = this.store.get(key)?.value;
    const type = this.getValueType(value);

    const entry: GlobalStateEntry = {
      key,
      value,
      type,
      createdAt: this.store.get(key)?.createdAt || now,
      updatedAt: now,
      metadata: {
        persistent: false,
        ...metadata
      }
    };

    this.store.set(key, entry);
    this.recordOperation('set', key, value, oldValue);

    // Trigger event
    if (this.events.onSet) {
      this.events.onSet(key, value, oldValue);
    }

    // Check memory limits
    this.checkMemoryLimits();

    return entry;
  }

  get(key: string): GlobalStateEntry | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.delete(key);
      return undefined;
    }

    return entry;
  }

  getOrDefault(key: string, defaultValue: GlobalStateValue): GlobalStateEntry {
    const entry = this.get(key);
    return entry || this.set(key, defaultValue);
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    const entry = this.store.get(key);
    if (entry) {
      this.store.delete(key);
      this.recordOperation('delete', key, undefined, entry.value);

      if (this.events.onDelete) {
        this.events.onDelete(key, entry.value);
      }

      return true;
    }
    return false;
  }

  clear(category?: string): number {
    let deletedCount = 0;

    for (const [key, entry] of this.store.entries()) {
      if (!category || entry.metadata?.category === category) {
        this.store.delete(key);
        deletedCount++;

        if (this.events.onDelete) {
          this.events.onDelete(key, entry.value);
        }
      }
    }

    if (this.events.onClear) {
      this.events.onClear();
    }

    this.recordOperation('clear', '', undefined, undefined);
    return deletedCount;
  }

  // Advanced Operations
  increment(key: string, amount: number = 1): number {
    const current = this.get(key);
    const currentNum = (current?.value as number) || 0;
    const newValue = currentNum + amount;
    this.set(key, newValue);
    this.recordOperation('increment', key, newValue, currentNum);
    return newValue;
  }

  decrement(key: string, amount: number = 1): number {
    return this.increment(key, -amount);
  }

  append(key: string, value: any): void {
    const current = this.get(key);
    let currentArray = (current?.value as any[]) || [];

    if (!Array.isArray(currentArray)) {
      currentArray = [currentArray];
    }

    currentArray.push(value);
    this.set(key, currentArray);
    this.recordOperation('append', key, currentArray, current?.value);
  }

  extend(key: string, obj: Record<string, any>): void {
    const current = this.get(key);
    const currentObj = (current?.value as Record<string, any>) || {};
    const newValue = { ...currentObj, ...obj };
    this.set(key, newValue);
    this.recordOperation('set', key, newValue, current?.value);
  }

  // Query Operations
  query(query: GlobalStateQuery): GlobalStateEntry[] {
    let results: GlobalStateEntry[] = Array.from(this.store.values());

    // Filter by category
    if (query.category) {
      results = results.filter(entry =>
        entry.metadata?.category === query.category
      );
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(entry =>
        query.tags!.some(tag =>
          entry.metadata?.tags?.includes(tag)
        )
      );
    }

    // Filter by type
    if (query.type) {
      results = results.filter(entry => entry.type === query.type);
    }

    // Filter by key pattern
    if (query.keyPattern) {
      const regex = new RegExp(query.keyPattern);
      results = results.filter(entry => regex.test(entry.key));
    }

    // Sort by updated date (newest first)
    results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || results.length;
    return results.slice(offset, offset + limit);
  }

  // Search Operations
  searchByValue(searchTerm: string): GlobalStateEntry[] {
    const term = searchTerm.toLowerCase();
    return Array.from(this.store.values()).filter(entry => {
      if (typeof entry.value === 'string') {
        return entry.value.toLowerCase().includes(term);
      }
      if (typeof entry.value === 'object' && entry.value !== null) {
        return JSON.stringify(entry.value).toLowerCase().includes(term);
      }
      return false;
    });
  }

  // State Management
  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }

  getAllEntries(): GlobalStateEntry[] {
    return Array.from(this.store.values());
  }

  getSnapshot(): GlobalStateSnapshot {
    const entries = this.getAllEntries();
    return {
      timestamp: new Date(),
      entries,
      totalEntries: entries.length,
      memoryUsage: this.calculateMemoryUsage()
    };
  }

  // Statistics
  getStats(): GlobalStateStats {
    const entries = this.getAllEntries();
    const entriesByType: Record<string, number> = {};
    const entriesByCategory: Record<string, number> = {};

    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;

    for (const entry of entries) {
      // Count by type
      entriesByType[entry.type] = (entriesByType[entry.type] || 0) + 1;

      // Count by category
      if (entry.metadata?.category) {
        entriesByCategory[entry.metadata.category] =
          (entriesByCategory[entry.metadata.category] || 0) + 1;
      }

      // Track oldest and newest
      if (!oldestEntry || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
      if (!newestEntry || entry.updatedAt > newestEntry) {
        newestEntry = entry.updatedAt;
      }
    }

    return {
      totalEntries: entries.length,
      entriesByType,
      entriesByCategory,
      memoryUsage: this.calculateMemoryUsage(),
      oldestEntry,
      newestEntry,
      operationsCount: this.operations.length,
      lastCleanup: undefined // TODO: Track last cleanup time
    };
  }

  // Operations History
  getOperations(limit?: number): GlobalStateOperation[] {
    const ops = [...this.operations].reverse(); // Newest first
    return limit ? ops.slice(0, limit) : ops;
  }

  clearOperations(): void {
    this.operations = [];
  }

  // Event Management
  on(events: GlobalStateEvents): void {
    this.events = { ...this.events, ...events };
  }

  off(eventNames: (keyof GlobalStateEvents)[]): void {
    for (const eventName of eventNames) {
      delete this.events[eventName];
    }
  }

  // Persistence (TODO: Implement file-based persistence)
  async save(): Promise<void> {
    if (!this.config.persistentStorage) {
      return;
    }
    // TODO: Implement save to file
  }

  async load(): Promise<void> {
    if (!this.config.persistentStorage) {
      return;
    }
    // TODO: Implement load from file
  }

  // Utility Methods
  private getValueType(value: GlobalStateValue): GlobalStateEntry['type'] {
    if (value === null) return 'null';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'object';
  }

  private isExpired(entry: GlobalStateEntry): boolean {
    if (!entry.metadata?.ttl) {
      return false;
    }

    const now = new Date();
    const expiryTime = new Date(entry.updatedAt.getTime() + entry.metadata.ttl * 1000);
    return now > expiryTime;
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;

    for (const entry of this.store.values()) {
      // Rough estimation of memory usage
      totalSize += entry.key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 200; // Estimated metadata overhead
    }

    return totalSize;
  }

  private checkMemoryLimits(): void {
    const memoryUsage = this.calculateMemoryUsage();

    if (this.config.maxMemory && memoryUsage > this.config.maxMemory) {
      if (this.events.onMemoryLimit) {
        this.events.onMemoryLimit(memoryUsage, this.config.maxMemory);
      }

      // Auto-cleanup: Remove oldest non-persistent entries
      this.cleanupExpired();
    }

    if (this.config.maxEntries && this.store.size > this.config.maxEntries) {
      // Remove oldest entries
      const entries = Array.from(this.store.entries())
        .sort(([, a], [, b]) => a.updatedAt.getTime() - b.updatedAt.getTime());

      const toRemove = entries.slice(0, this.store.size - this.config.maxEntries);
      for (const [key] of toRemove) {
        const entry = this.store.get(key);
        if (entry && !entry.metadata?.persistent) {
          this.store.delete(key);
        }
      }
    }
  }

  private cleanupExpired(): void {
    const now = new Date();
    const toDelete: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (this.isExpired(entry)) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      const entry = this.store.get(key);
      this.store.delete(key);

      if (entry && this.events.onExpired) {
        this.events.onExpired(key, entry.value);
      }
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Run cleanup every minute
  }

  private recordOperation(
    type: GlobalStateOperation['type'],
    key: string,
    value?: GlobalStateValue,
    oldValue?: GlobalStateValue
  ): void {
    const operation: GlobalStateOperation = {
      type,
      key,
      value,
      oldValue,
      timestamp: new Date()
    };

    this.operations.push(operation);

    // Keep only last 1000 operations
    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-1000);
    }
  }

  // Cleanup
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
    this.operations = [];
  }
}

// Singleton instance for global access
export const globalStateManager = new GlobalStateManager();

export default GlobalStateManager;