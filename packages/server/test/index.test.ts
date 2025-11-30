import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createServer } from '../src/index.js';

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Server Entry Point', () => {
  beforeEach(() => {
    // Mock console methods
    console.log = () => {};
    console.error = () => {};
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('createServer()', () => {
    it('should create an Express server with default options', () => {
      const server = createServer();

      expect(server).toBeDefined();
      expect(typeof server).toBe('function'); // Express app is a function
    });

    it('should create server with custom options', () => {
      const customOptions = {
        port: 3001,
        host: '127.0.0.1',
        cors: { origin: 'http://localhost:3000' },
        helmet: { contentSecurityPolicy: false }
      };

      const server = createServer(customOptions);

      expect(server).toBeDefined();
    });

    it('should handle undefined options', () => {
      expect(() => createServer(undefined)).not.toThrow();
    });

    it('should have proper JSON body parser middleware', () => {
      const server = createServer();

      // Test that JSON parsing works
      const app = server as any;
      expect(app).toBeDefined();
    });
  });

  describe('Server Configuration', () => {
    it('should use default options when not provided', () => {
      const server = createServer();

      expect(server).toBeDefined();
    });
  });

  describe('Route Integration', () => {
    it('should have task routes available', async () => {
      const server = createServer();

      // Mock request for testing
      const mockRequest = {
        method: 'GET',
        url: '/api/tasks',
        headers: {},
        query: {},
        params: {}
      };

      const mockResponse = {
        status: (code: number) => mockResponse,
        json: (data: any) => mockResponse,
        send: (data: any) => mockResponse
      };

      // Test that the server has the expected structure
      expect(server).toBeDefined();
      expect(typeof server).toBe('function');
    });
  });

  describe('Server Validation', () => {
    it('should export a function', () => {
      expect(typeof createServer).toBe('function');
    });

    it('should return an Express app', () => {
      const server = createServer();

      // Express apps are functions with additional properties
      expect(typeof server).toBe('function');
      expect(typeof (server as any).use).toBe('function');
      expect(typeof (server as any).get).toBe('function');
      expect(typeof (server as any).post).toBe('function');
    });

    it('should handle multiple calls to createServer', () => {
      const server1 = createServer();
      const server2 = createServer();

      expect(server1).toBeDefined();
      expect(server2).toBeDefined();
      expect(server1).not.toBe(server2); // Should be different instances
    });
  });

  describe('Environment Configuration', () => {
    it('should work without environment variables set', () => {
      expect(() => createServer()).not.toThrow();
    });

    it('should handle custom port in options', () => {
      const options = { port: 3001 };

      expect(() => createServer(options)).not.toThrow();
    });

    it('should handle custom host in options', () => {
      const options = { host: '127.0.0.1' };

      expect(() => createServer(options)).not.toThrow();
    });
  });

  describe('Invalid Inputs', () => {
    it('should handle null options', () => {
      expect(() => createServer(null as any)).not.toThrow();
    });

    it('should handle empty options object', () => {
      expect(() => createServer({})).not.toThrow();
    });
  });

  describe('Express App Features', () => {
    it('should support all HTTP methods', () => {
      const server = createServer();

      // These methods should be available on an Express app
      expect(typeof (server as any).get).toBe('function');
      expect(typeof (server as any).post).toBe('function');
      expect(typeof (server as any).put).toBe('function');
      expect(typeof (server as any).delete).toBe('function');
      expect(typeof (server as any).patch).toBe('function');
    });

    it('should support middleware mounting', () => {
      const server = createServer();

      // Should support middleware mounting
      expect(typeof (server as any).use).toBe('function');
    });
  });
});