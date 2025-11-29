// Global State Management Types

export type GlobalStateValue = string | number | boolean | object | null;

export interface GlobalStateEntry {
  key: string;
  value: GlobalStateValue;
  type: 'string' | 'number' | 'boolean' | 'object' | 'null';
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    description?: string;
    category?: string;
    tags?: string[];
    persistent?: boolean; // Should survive server restart
    ttl?: number; // Time to live in seconds
  };
}

export interface GlobalStateSnapshot {
  timestamp: Date;
  entries: GlobalStateEntry[];
  totalEntries: number;
  memoryUsage: number; // Estimated memory usage in bytes
}

export interface GlobalStateQuery {
  category?: string;
  tags?: string[];
  type?: string;
  keyPattern?: string; // Regex pattern for key matching
  limit?: number;
  offset?: number;
}

export interface GlobalStateOperation {
  type: 'set' | 'delete' | 'clear' | 'increment' | 'decrement' | 'append';
  key: string;
  value?: GlobalStateValue;
  oldValue?: GlobalStateValue;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface GlobalStateConfig {
  maxEntries?: number; // Maximum number of entries
  maxMemory?: number; // Maximum memory usage in bytes
  autoCleanup?: boolean; // Automatically cleanup expired entries
  persistentStorage?: boolean; // Persist to disk
  storagePath?: string; // Path for persistent storage
}

export interface GlobalStateStats {
  totalEntries: number;
  entriesByType: Record<string, number>;
  entriesByCategory: Record<string, number>;
  memoryUsage: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  operationsCount: number;
  lastCleanup?: Date;
}

export interface GlobalStateEvents {
  onSet?: (key: string, value: GlobalStateValue, oldValue?: GlobalStateValue) => void;
  onDelete?: (key: string, value: GlobalStateValue) => void;
  onClear?: () => void;
  onExpired?: (key: string, value: GlobalStateValue) => void;
  onMemoryLimit?: (usage: number, limit: number) => void;
}