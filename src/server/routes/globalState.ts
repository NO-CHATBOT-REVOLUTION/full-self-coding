import { Router, type Request, type Response } from 'express';
import { createResponse } from '../utils';
import { globalStateManager } from '../state/globalStateManager';
import type { GlobalStateQuery } from '../types/globalState';

const router = Router();

/**
 * Global state management endpoints (must come before /:key routes)
 */

// Query and search endpoints
router.post('/query', (req: Request, res: Response) => {
  try {
    const query: GlobalStateQuery = req.body;
    const results = globalStateManager.query(query);
    res.json(createResponse(true, results));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

router.post('/search', (req: Request, res: Response) => {
  try {
    const { searchTerm } = req.body;

    if (!searchTerm) {
      return res.status(400).json(createResponse(false, null, 'Search term is required'));
    }

    const results = globalStateManager.searchByValue(searchTerm);
    res.json(createResponse(true, results));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

router.post('/batch', (req: Request, res: Response) => {
  try {
    const { operations } = req.body;

    if (!Array.isArray(operations)) {
      return res.status(400).json(createResponse(false, null, 'Operations must be an array'));
    }

    const results: any[] = [];

    for (const op of operations) {
      try {
        let result;

        switch (op.type) {
          case 'set':
            result = globalStateManager.set(op.key, op.value, op.metadata);
            break;
          case 'get':
            result = globalStateManager.get(op.key);
            break;
          case 'delete':
            result = { deleted: globalStateManager.delete(op.key) };
            break;
          case 'increment':
            result = { value: globalStateManager.increment(op.key, op.amount || 1) };
            break;
          case 'decrement':
            result = { value: globalStateManager.decrement(op.key, op.amount || 1) };
            break;
          default:
            throw new Error(`Unknown operation type: ${op.type}`);
        }

        results.push({ success: true, operation: op.type, key: op.key, result });
      } catch (error) {
        results.push({
          success: false,
          operation: op.type,
          key: op.key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json(createResponse(true, results));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

// List and management endpoints
router.get('/keys/list', (req: Request, res: Response) => {
  try {
    const keys = globalStateManager.getAllKeys();
    res.json(createResponse(true, keys));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

router.get('/entries/list', (req: Request, res: Response) => {
  try {
    const entries = globalStateManager.getAllEntries();
    res.json(createResponse(true, entries));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

router.get('/snapshot', (req: Request, res: Response) => {
  try {
    const snapshot = globalStateManager.getSnapshot();
    res.json(createResponse(true, snapshot));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = globalStateManager.getStats();
    res.json(createResponse(true, stats));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

router.get('/operations', (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const operations = globalStateManager.getOperations(limit ? parseInt(limit as string) : undefined);
    res.json(createResponse(true, operations));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

router.delete('/operations', (req: Request, res: Response) => {
  try {
    globalStateManager.clearOperations();
    res.json(createResponse(true, { message: 'Operations history cleared' }));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

router.delete('/', (req: Request, res: Response) => {
  try {
    const { category } = req.body;
    const deletedCount = globalStateManager.clear(category);
    res.json(createResponse(true, { deletedCount }));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Key-based operations (must come last)
 */

/**
 * Get a value by key
 */
router.get('/:key', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const entry = globalStateManager.get(key);

    if (!entry) {
      return res.status(404).json(createResponse(false, null, 'Key not found'));
    }

    res.json(createResponse(true, entry));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Set a value
 */
router.post('/:key', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value, metadata } = req.body;

    const entry = globalStateManager.set(key, value, metadata);
    res.json(createResponse(true, entry));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Update a value (only if it exists)
 */
router.put('/:key', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value, metadata } = req.body;

    if (!globalStateManager.has(key)) {
      return res.status(404).json(createResponse(false, null, 'Key not found'));
    }

    const entry = globalStateManager.set(key, value, metadata);
    res.json(createResponse(true, entry));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Delete a value
 */
router.delete('/:key', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const deleted = globalStateManager.delete(key);

    if (!deleted) {
      return res.status(404).json(createResponse(false, null, 'Key not found'));
    }

    res.json(createResponse(true, { deleted }));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Check if a key exists
 */
router.head('/:key', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const exists = globalStateManager.has(key);

    res.status(exists ? 200 : 404).end();
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get or set with default value
 */
router.get('/:key/or-default/:defaultValue', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    let defaultValue: any = req.params.defaultValue;

    // Try to parse default value as JSON
    try {
      defaultValue = JSON.parse(defaultValue);
    } catch {
      // Keep as string if not valid JSON
    }

    const entry = globalStateManager.getOrDefault(key, defaultValue);
    res.json(createResponse(true, entry));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Increment a numeric value
 */
router.post('/:key/increment', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { amount = 1 } = req.body;

    const newValue = globalStateManager.increment(key, amount);
    res.json(createResponse(true, { key, value: newValue }));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Decrement a numeric value
 */
router.post('/:key/decrement', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { amount = 1 } = req.body;

    const newValue = globalStateManager.decrement(key, amount);
    res.json(createResponse(true, { key, value: newValue }));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Append to an array value
 */
router.post('/:key/append', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    globalStateManager.append(key, value);
    const entry = globalStateManager.get(key);
    res.json(createResponse(true, entry));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Extend an object value
 */
router.post('/:key/extend', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { object } = req.body;

    if (typeof object !== 'object' || object === null) {
      return res.status(400).json(createResponse(false, null, 'Value must be an object'));
    }

    globalStateManager.extend(key, object);
    const entry = globalStateManager.get(key);
    res.json(createResponse(true, entry));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Query multiple values
 */
router.post('/query', (req: Request, res: Response) => {
  try {
    const query: GlobalStateQuery = req.body;
    const results = globalStateManager.query(query);
    res.json(createResponse(true, results));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Search values by content
 */
router.post('/search', (req: Request, res: Response) => {
  try {
    const { searchTerm } = req.body;

    if (!searchTerm) {
      return res.status(400).json(createResponse(false, null, 'Search term is required'));
    }

    const results = globalStateManager.searchByValue(searchTerm);
    res.json(createResponse(true, results));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get all keys
 */
router.get('/keys/list', (req: Request, res: Response) => {
  try {
    const keys = globalStateManager.getAllKeys();
    res.json(createResponse(true, keys));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get all entries
 */
router.get('/entries/list', (req: Request, res: Response) => {
  try {
    const entries = globalStateManager.getAllEntries();
    res.json(createResponse(true, entries));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get a snapshot of current state
 */
router.get('/snapshot', (req: Request, res: Response) => {
  try {
    const snapshot = globalStateManager.getSnapshot();
    res.json(createResponse(true, snapshot));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = globalStateManager.getStats();
    res.json(createResponse(true, stats));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Get operations history
 */
router.get('/operations', (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const operations = globalStateManager.getOperations(limit ? parseInt(limit as string) : undefined);
    res.json(createResponse(true, operations));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Clear operations history
 */
router.delete('/operations', (req: Request, res: Response) => {
  try {
    globalStateManager.clearOperations();
    res.json(createResponse(true, { message: 'Operations history cleared' }));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Clear all values (optionally by category)
 */
router.delete('/', (req: Request, res: Response) => {
  try {
    const { category } = req.body;
    const deletedCount = globalStateManager.clear(category);
    res.json(createResponse(true, { deletedCount }));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

/**
 * Batch operations
 */
router.post('/batch', (req: Request, res: Response) => {
  try {
    const { operations } = req.body;

    if (!Array.isArray(operations)) {
      return res.status(400).json(createResponse(false, null, 'Operations must be an array'));
    }

    const results: any[] = [];

    for (const op of operations) {
      try {
        let result;

        switch (op.type) {
          case 'set':
            result = globalStateManager.set(op.key, op.value, op.metadata);
            break;
          case 'get':
            result = globalStateManager.get(op.key);
            break;
          case 'delete':
            result = { deleted: globalStateManager.delete(op.key) };
            break;
          case 'increment':
            result = { value: globalStateManager.increment(op.key, op.amount || 1) };
            break;
          case 'decrement':
            result = { value: globalStateManager.decrement(op.key, op.amount || 1) };
            break;
          default:
            throw new Error(`Unknown operation type: ${op.type}`);
        }

        results.push({ success: true, operation: op.type, key: op.key, result });
      } catch (error) {
        results.push({
          success: false,
          operation: op.type,
          key: op.key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json(createResponse(true, results));
  } catch (error) {
    res.status(500).json(createResponse(false, null, error instanceof Error ? error.message : 'Unknown error'));
  }
});

export default router;