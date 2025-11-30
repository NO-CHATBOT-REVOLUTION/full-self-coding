import { Router } from 'express';
import { globalStateManager } from '../utils/globalStateManager.js';
import type { GlobalStateQueryOptions, GlobalStateStats } from '../types/index.js';

const router = Router();

/**
 * GET /api/state
 * Query global state entries
 */
router.get('/', (req, res) => {
  try {
    const {
      prefix,
      limit,
      offset,
      includeExpired
    } = req.query as any;

    const options: GlobalStateQueryOptions = {};

    if (prefix) options.prefix = prefix;
    if (limit) options.limit = parseInt(limit);
    if (offset) options.offset = parseInt(offset);
    if (includeExpired === 'true') options.includeExpired = true;

    const entries = globalStateManager.query(options);

    res.json({
      entries,
      count: entries.length,
      query: options
    });

  } catch (error) {
    console.error('Error querying global state:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/state/stats
 * Get global state statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats: GlobalStateStats = globalStateManager.getStats();

    res.json(stats);

  } catch (error) {
    console.error('Error getting global state stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/state/keys
 * Get all keys (optionally filtered by prefix)
 */
router.get('/keys', (req, res) => {
  try {
    const { prefix } = req.query;

    const keys = globalStateManager.getKeys(prefix as string);

    res.json({
      keys,
      count: keys.length,
      prefix: prefix || null
    });

  } catch (error) {
    console.error('Error getting global state keys:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/state/:key
 * Get a specific value by key
 */
router.get('/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { includeMetadata } = req.query;

    if (includeMetadata === 'true') {
      const entry = globalStateManager.getEntry(key);

      if (!entry) {
        return res.status(404).json({
          error: 'Key not found or expired'
        });
      }

      res.json(entry);
    } else {
      const value = globalStateManager.get(key);

      if (value === undefined) {
        return res.status(404).json({
          error: 'Key not found or expired'
        });
      }

      res.json({
        key,
        value
      });
    }

  } catch (error) {
    console.error('Error getting global state value:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/state/:key
 * Set a value by key
 */
router.post('/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { value, ttl, metadata } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        error: 'Value is required'
      });
    }

    globalStateManager.set(key, value, {
      ttl: ttl ? parseInt(ttl) : undefined,
      metadata
    });

    res.json({
      message: 'Value set successfully',
      key,
      ttl: ttl ? parseInt(ttl) : undefined,
      metadata
    });

  } catch (error) {
    console.error('Error setting global state value:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/state/:key
 * Update an existing value by key
 */
router.put('/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { value, ttl, metadata, mergeMetadata } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        error: 'Value is required'
      });
    }

    const updated = globalStateManager.update(key, value, {
      ttl: ttl ? parseInt(ttl) : undefined,
      metadata,
      mergeMetadata: mergeMetadata !== false // default to true
    });

    if (!updated) {
      return res.status(404).json({
        error: 'Key not found or expired'
      });
    }

    res.json({
      message: 'Value updated successfully',
      key,
      ttl: ttl ? parseInt(ttl) : undefined,
      metadata
    });

  } catch (error) {
    console.error('Error updating global state value:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/state/:key
 * Delete a value by key
 */
router.delete('/:key', (req, res) => {
  try {
    const { key } = req.params;

    const deleted = globalStateManager.delete(key);

    if (!deleted) {
      return res.status(404).json({
        error: 'Key not found'
      });
    }

    res.json({
      message: 'Key deleted successfully',
      key
    });

  } catch (error) {
    console.error('Error deleting global state value:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/state/cleanup
 * Clean up expired entries
 */
router.post('/cleanup', (req, res) => {
  try {
    const cleanedCount = globalStateManager.cleanupExpiredEntries();

    res.json({
      message: 'Cleanup completed',
      cleanedCount
    });

  } catch (error) {
    console.error('Error cleaning up global state:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/state
 * Clear all entries
 */
router.delete('/', (req, res) => {
  try {
    globalStateManager.clear();

    res.json({
      message: 'All entries cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing global state:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/state/increment/:key
 * Increment a numeric value
 */
router.post('/increment/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { amount = 1 } = req.body;

    const newValue = globalStateManager.increment(key, parseInt(amount));

    res.json({
      message: 'Value incremented successfully',
      key,
      newValue
    });

  } catch (error) {
    console.error('Error incrementing global state value:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/state/decrement/:key
 * Decrement a numeric value
 */
router.post('/decrement/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { amount = 1 } = req.body;

    const newValue = globalStateManager.decrement(key, parseInt(amount));

    res.json({
      message: 'Value decremented successfully',
      key,
      newValue
    });

  } catch (error) {
    console.error('Error decrementing global state value:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/state/push/:key
 * Add items to an array value
 */
router.post('/push/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        error: 'Items must be an array'
      });
    }

    const newArray = globalStateManager.pushToArray(key, ...items);

    res.json({
      message: 'Items added to array successfully',
      key,
      newArray,
      itemsAdded: items.length
    });

  } catch (error) {
    console.error('Error pushing to global state array:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/state/remove/:key
 * Remove items from an array value
 */
router.post('/remove/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        error: 'Items must be an array'
      });
    }

    const newArray = globalStateManager.removeFromArray(key, ...items);

    res.json({
      message: 'Items removed from array successfully',
      key,
      newArray,
      itemsRemoved: items.length
    });

  } catch (error) {
    console.error('Error removing from global state array:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;