"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const CloudflareConfig_1 = require("../config/CloudflareConfig");
const CloudflareAPIClient_1 = require("./CloudflareAPIClient");
// Mock fetch globally
global.fetch = vitest_1.vi.fn();
(0, vitest_1.describe)('CloudflareAPIClient', () => {
    let client;
    let config;
    (0, vitest_1.beforeEach)(() => {
        config = new CloudflareConfig_1.CloudflareConfig('test-account-id', 'test-api-token');
        client = new CloudflareAPIClient_1.CloudflareAPIClient(config);
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create client with config', () => {
            (0, vitest_1.expect)(client).toBeInstanceOf(CloudflareAPIClient_1.CloudflareAPIClient);
        });
    });
    (0, vitest_1.describe)('query()', () => {
        (0, vitest_1.it)('should execute SQL query successfully', async () => {
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
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponse,
            });
            const result = await client.query('db-123', 'SELECT * FROM users');
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.results).toHaveLength(2);
            (0, vitest_1.expect)(result.meta?.duration).toBe(10);
        });
        (0, vitest_1.it)('should include authentication headers', async () => {
            const mockResponse = {
                success: true,
                result: [{ success: true, results: [] }],
                errors: [],
                messages: [],
            };
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });
            await client.query('db-123', 'SELECT 1');
            (0, vitest_1.expect)(global.fetch).toHaveBeenCalledWith(vitest_1.expect.stringContaining('/d1/database/db-123/query'), vitest_1.expect.objectContaining({
                headers: vitest_1.expect.objectContaining({
                    'Authorization': 'Bearer test-api-token',
                    'Content-Type': 'application/json',
                }),
            }));
        });
        (0, vitest_1.it)('should send SQL in request body', async () => {
            const mockResponse = {
                success: true,
                result: [{ success: true, results: [] }],
                errors: [],
                messages: [],
            };
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });
            await client.query('db-123', 'SELECT * FROM users WHERE id = 1');
            (0, vitest_1.expect)(global.fetch).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ sql: 'SELECT * FROM users WHERE id = 1' }),
            }));
        });
        (0, vitest_1.it)('should throw error for HTTP error response', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: async () => ({
                    success: false,
                    errors: [{ code: 7003, message: 'Database not found' }],
                }),
            });
            await (0, vitest_1.expect)(client.query('invalid-db', 'SELECT 1')).rejects.toThrow(CloudflareAPIClient_1.CloudflareAPIError);
        });
        (0, vitest_1.it)('should throw error when API returns success: false', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    success: false,
                    result: [],
                    errors: [{ code: 1000, message: 'SQL syntax error' }],
                    messages: [],
                }),
            });
            await (0, vitest_1.expect)(client.query('db-123', 'INVALID SQL')).rejects.toThrow('D1 query failed');
        });
        (0, vitest_1.it)('should handle network errors', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));
            await (0, vitest_1.expect)(client.query('db-123', 'SELECT 1')).rejects.toThrow('Network error');
        });
    });
    (0, vitest_1.describe)('getDatabaseInfo()', () => {
        (0, vitest_1.it)('should get database information', async () => {
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
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });
            const info = await client.getDatabaseInfo('db-123');
            (0, vitest_1.expect)(info).toEqual({
                uuid: 'db-123',
                name: 'my-database',
                version: '1.0',
            });
        });
        (0, vitest_1.it)('should use GET method', async () => {
            const mockResponse = {
                success: true,
                result: {},
                errors: [],
                messages: [],
            };
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });
            await client.getDatabaseInfo('db-123');
            (0, vitest_1.expect)(global.fetch).toHaveBeenCalledWith(vitest_1.expect.stringContaining('/d1/database/db-123'), vitest_1.expect.objectContaining({
                method: 'GET',
            }));
        });
        (0, vitest_1.it)('should throw error for failed request', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
                json: async () => ({
                    success: false,
                    errors: [{ code: 10000, message: 'Authentication failed' }],
                }),
            });
            await (0, vitest_1.expect)(client.getDatabaseInfo('db-123')).rejects.toThrow(CloudflareAPIClient_1.CloudflareAPIError);
        });
    });
    (0, vitest_1.describe)('CloudflareAPIError', () => {
        (0, vitest_1.it)('should include status code in error', () => {
            const error = new CloudflareAPIClient_1.CloudflareAPIError('Test error', 404);
            (0, vitest_1.expect)(error.message).toBe('Test error');
            (0, vitest_1.expect)(error.statusCode).toBe(404);
            (0, vitest_1.expect)(error.name).toBe('CloudflareAPIError');
        });
        (0, vitest_1.it)('should include errors array', () => {
            const errors = [{ code: 1000, message: 'Error message' }];
            const error = new CloudflareAPIClient_1.CloudflareAPIError('Test error', 400, errors);
            (0, vitest_1.expect)(error.errors).toEqual(errors);
        });
    });
});
//# sourceMappingURL=CloudflareAPIClient.test.js.map