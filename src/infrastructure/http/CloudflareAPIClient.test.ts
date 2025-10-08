import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloudflareConfig } from '../config/CloudflareConfig';
import { CloudflareAPIClient, CloudflareAPIError } from './CloudflareAPIClient';

// Mock fetch globally
global.fetch = vi.fn();

describe('CloudflareAPIClient', () => {
  let client: CloudflareAPIClient;
  let config: CloudflareConfig;

  beforeEach(() => {
    config = new CloudflareConfig('test-account-id', 'test-api-token');
    client = new CloudflareAPIClient(config);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with config', () => {
      expect(client).toBeInstanceOf(CloudflareAPIClient);
    });
  });

  describe('query()', () => {
    it('should execute SQL query successfully', async () => {
      const mockResponse = {
        success: true,
        result: [
          {
            success: true,
            results: [
              { id: 1, name: 'test' },
              { id: 2, name: 'test2' },
            ],
            meta: {
              duration: 10,
              rows_read: 2,
            },
          },
        ],
        errors: [],
        messages: [],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.query('db-123', 'SELECT * FROM users');

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.meta?.duration).toBe(10);
    });

    it('should include authentication headers', async () => {
      const mockResponse = {
        success: true,
        result: [{ success: true, results: [] }],
        errors: [],
        messages: [],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await client.query('db-123', 'SELECT 1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/d1/database/db-123/query'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should send SQL in request body', async () => {
      const mockResponse = {
        success: true,
        result: [{ success: true, results: [] }],
        errors: [],
        messages: [],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await client.query('db-123', 'SELECT * FROM users WHERE id = 1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ sql: 'SELECT * FROM users WHERE id = 1' }),
        })
      );
    });

    it('should throw error for HTTP error response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({
          success: false,
          errors: [{ code: 7003, message: 'Database not found' }],
        }),
      });

      await expect(client.query('invalid-db', 'SELECT 1')).rejects.toThrow(CloudflareAPIError);
    });

    it('should throw error when API returns success: false', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          result: [],
          errors: [{ code: 1000, message: 'SQL syntax error' }],
          messages: [],
        }),
      });

      await expect(client.query('db-123', 'INVALID SQL')).rejects.toThrow('D1 query failed');
    });

    it('should handle network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      await expect(client.query('db-123', 'SELECT 1')).rejects.toThrow('Network error');
    });
  });

  describe('getDatabaseInfo()', () => {
    it('should get database information', async () => {
      const mockResponse = {
        success: true,
        result: {
          uuid: 'db-123',
          name: 'my-database',
          version: '1.0',
        },
        errors: [],
        messages: [],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const info = await client.getDatabaseInfo('db-123');

      expect(info).toEqual({
        uuid: 'db-123',
        name: 'my-database',
        version: '1.0',
      });
    });

    it('should use GET method', async () => {
      const mockResponse = {
        success: true,
        result: {},
        errors: [],
        messages: [],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await client.getDatabaseInfo('db-123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/d1/database/db-123'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should throw error for failed request', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          success: false,
          errors: [{ code: 10000, message: 'Authentication failed' }],
        }),
      });

      await expect(client.getDatabaseInfo('db-123')).rejects.toThrow(CloudflareAPIError);
    });
  });

  describe('CloudflareAPIError', () => {
    it('should include status code in error', () => {
      const error = new CloudflareAPIError('Test error', 404);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('CloudflareAPIError');
    });

    it('should include errors array', () => {
      const errors = [{ code: 1000, message: 'Error message' }];
      const error = new CloudflareAPIError('Test error', 400, errors);

      expect(error.errors).toEqual(errors);
    });
  });
});
