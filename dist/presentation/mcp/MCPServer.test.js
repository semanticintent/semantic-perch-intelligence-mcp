"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const MCPServer_1 = require("./MCPServer");
const Environment_1 = require("../../domain/value-objects/Environment");
(0, vitest_1.describe)('D1DatabaseMCPServer', () => {
    let server;
    let mockAnalyzeSchemaUseCase;
    let mockGetRelationshipsUseCase;
    let mockValidateSchemaUseCase;
    let mockSuggestOptimizationsUseCase;
    (0, vitest_1.beforeEach)(() => {
        // Mock use cases
        mockAnalyzeSchemaUseCase = {
            execute: vitest_1.vi.fn(),
        };
        mockGetRelationshipsUseCase = {
            execute: vitest_1.vi.fn(),
        };
        mockValidateSchemaUseCase = {
            execute: vitest_1.vi.fn(),
        };
        mockSuggestOptimizationsUseCase = {
            execute: vitest_1.vi.fn(),
        };
        server = new MCPServer_1.D1DatabaseMCPServer(mockAnalyzeSchemaUseCase, mockGetRelationshipsUseCase, mockValidateSchemaUseCase, mockSuggestOptimizationsUseCase);
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create server instance and freeze it', () => {
            (0, vitest_1.expect)(server).toBeDefined();
            (0, vitest_1.expect)(Object.isFrozen(server)).toBe(true);
        });
    });
    (0, vitest_1.describe)('handleAnalyzeSchema', () => {
        (0, vitest_1.it)('should call AnalyzeSchemaUseCase with correct parameters', async () => {
            const mockResponse = {
                databaseName: 'test_db',
                environment: Environment_1.Environment.DEVELOPMENT,
                tableCount: 1,
                tables: [],
                fetchedAt: new Date(),
            };
            mockAnalyzeSchemaUseCase.execute.mockResolvedValue(mockResponse);
            // Access private method via type assertion for testing
            const result = await server.handleAnalyzeSchema({
                environment: 'development',
                includeSamples: true,
                maxSampleRows: 5,
            });
            (0, vitest_1.expect)(mockAnalyzeSchemaUseCase.execute).toHaveBeenCalledWith({
                environment: Environment_1.Environment.DEVELOPMENT,
                includeSamples: true,
                maxSampleRows: 5,
            });
            (0, vitest_1.expect)(result.content).toHaveLength(1);
            (0, vitest_1.expect)(result.content[0].type).toBe('text');
            const parsedResult = JSON.parse(result.content[0].text);
            (0, vitest_1.expect)(parsedResult.databaseName).toBe(mockResponse.databaseName);
        });
        (0, vitest_1.it)('should use default values for optional parameters', async () => {
            const mockResponse = {
                databaseName: 'test_db',
                environment: Environment_1.Environment.PRODUCTION,
                tableCount: 0,
                tables: [],
                fetchedAt: new Date(),
            };
            mockAnalyzeSchemaUseCase.execute.mockResolvedValue(mockResponse);
            await server.handleAnalyzeSchema({
                environment: 'production',
            });
            (0, vitest_1.expect)(mockAnalyzeSchemaUseCase.execute).toHaveBeenCalledWith({
                environment: Environment_1.Environment.PRODUCTION,
                includeSamples: undefined,
                maxSampleRows: undefined,
            });
        });
    });
    (0, vitest_1.describe)('handleGetRelationships', () => {
        (0, vitest_1.it)('should call GetRelationshipsUseCase with correct parameters', async () => {
            const mockResponse = {
                databaseName: 'test_db',
                environment: Environment_1.Environment.DEVELOPMENT,
                relationships: [],
                relationshipCount: 0,
            };
            mockGetRelationshipsUseCase.execute.mockResolvedValue(mockResponse);
            const result = await server.handleGetRelationships({
                environment: 'development',
                tableName: 'users',
            });
            (0, vitest_1.expect)(mockGetRelationshipsUseCase.execute).toHaveBeenCalledWith({
                environment: Environment_1.Environment.DEVELOPMENT,
                tableName: 'users',
            });
            (0, vitest_1.expect)(result.content).toHaveLength(1);
            (0, vitest_1.expect)(result.content[0].type).toBe('text');
            const parsedResult = JSON.parse(result.content[0].text);
            (0, vitest_1.expect)(parsedResult.databaseName).toBe(mockResponse.databaseName);
        });
        (0, vitest_1.it)('should handle requests without tableName filter', async () => {
            const mockResponse = {
                databaseName: 'test_db',
                environment: Environment_1.Environment.STAGING,
                relationships: [],
                relationshipCount: 0,
            };
            mockGetRelationshipsUseCase.execute.mockResolvedValue(mockResponse);
            await server.handleGetRelationships({
                environment: 'staging',
            });
            (0, vitest_1.expect)(mockGetRelationshipsUseCase.execute).toHaveBeenCalledWith({
                environment: Environment_1.Environment.STAGING,
                tableName: undefined,
            });
        });
    });
    (0, vitest_1.describe)('handleValidateSchema', () => {
        (0, vitest_1.it)('should call ValidateSchemaUseCase with correct parameters', async () => {
            const mockResponse = {
                databaseName: 'test_db',
                environment: Environment_1.Environment.DEVELOPMENT,
                isValid: true,
                errorCount: 0,
                warningCount: 0,
                infoCount: 0,
                issues: [],
                validatedAt: new Date(),
            };
            mockValidateSchemaUseCase.execute.mockResolvedValue(mockResponse);
            const result = await server.handleValidateSchema({
                environment: 'development',
            });
            (0, vitest_1.expect)(mockValidateSchemaUseCase.execute).toHaveBeenCalledWith({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            (0, vitest_1.expect)(result.content).toHaveLength(1);
            (0, vitest_1.expect)(result.content[0].type).toBe('text');
            const parsedResult = JSON.parse(result.content[0].text);
            (0, vitest_1.expect)(parsedResult.databaseName).toBe(mockResponse.databaseName);
        });
        (0, vitest_1.it)('should handle validation with errors', async () => {
            const mockResponse = {
                databaseName: 'test_db',
                environment: Environment_1.Environment.PRODUCTION,
                isValid: false,
                errorCount: 2,
                warningCount: 1,
                infoCount: 0,
                issues: [
                    {
                        severity: 'ERROR',
                        category: 'Orphaned Foreign Key',
                        message: 'Test error',
                    },
                ],
                validatedAt: new Date(),
            };
            mockValidateSchemaUseCase.execute.mockResolvedValue(mockResponse);
            const result = await server.handleValidateSchema({
                environment: 'production',
            });
            const parsedResult = JSON.parse(result.content[0].text);
            (0, vitest_1.expect)(parsedResult.isValid).toBe(false);
            (0, vitest_1.expect)(parsedResult.errorCount).toBe(2);
        });
    });
    (0, vitest_1.describe)('handleSuggestOptimizations', () => {
        (0, vitest_1.it)('should call SuggestOptimizationsUseCase with correct parameters', async () => {
            const mockResponse = {
                databaseName: 'test_db',
                environment: Environment_1.Environment.DEVELOPMENT,
                optimizationCount: 1,
                optimizations: [
                    {
                        type: 'missing_index',
                        table: 'orders',
                        column: 'user_id',
                        reason: 'Foreign key without index',
                        suggestion: 'CREATE INDEX idx_user_id ON orders(user_id)',
                        priority: 'high',
                    },
                ],
                analyzedAt: new Date(),
            };
            mockSuggestOptimizationsUseCase.execute.mockResolvedValue(mockResponse);
            const result = await server.handleSuggestOptimizations({
                environment: 'development',
            });
            (0, vitest_1.expect)(mockSuggestOptimizationsUseCase.execute).toHaveBeenCalledWith({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            (0, vitest_1.expect)(result.content).toHaveLength(1);
            (0, vitest_1.expect)(result.content[0].type).toBe('text');
            const parsedResult = JSON.parse(result.content[0].text);
            (0, vitest_1.expect)(parsedResult.optimizationCount).toBe(1);
            (0, vitest_1.expect)(parsedResult.optimizations).toHaveLength(1);
        });
        (0, vitest_1.it)('should handle schema with no optimizations', async () => {
            const mockResponse = {
                databaseName: 'test_db',
                environment: Environment_1.Environment.PRODUCTION,
                optimizationCount: 0,
                optimizations: [],
                analyzedAt: new Date(),
            };
            mockSuggestOptimizationsUseCase.execute.mockResolvedValue(mockResponse);
            const result = await server.handleSuggestOptimizations({
                environment: 'production',
            });
            const parsedResult = JSON.parse(result.content[0].text);
            (0, vitest_1.expect)(parsedResult.optimizationCount).toBe(0);
            (0, vitest_1.expect)(parsedResult.optimizations).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('error handling', () => {
        (0, vitest_1.it)('should format JSON responses correctly', async () => {
            const mockResponse = {
                databaseName: 'test_db',
                environment: Environment_1.Environment.DEVELOPMENT,
                tableCount: 0,
                tables: [],
                fetchedAt: new Date('2024-01-01T00:00:00Z'),
            };
            mockAnalyzeSchemaUseCase.execute.mockResolvedValue(mockResponse);
            const result = await server.handleAnalyzeSchema({
                environment: 'development',
            });
            // Verify JSON is properly formatted
            (0, vitest_1.expect)(() => JSON.parse(result.content[0].text)).not.toThrow();
            const parsed = JSON.parse(result.content[0].text);
            (0, vitest_1.expect)(parsed.databaseName).toBe('test_db');
        });
        (0, vitest_1.it)('should handle use case execution errors gracefully', async () => {
            mockAnalyzeSchemaUseCase.execute.mockRejectedValue(new Error('Database connection failed'));
            // The error should propagate up to be caught by the CallToolRequestSchema handler
            await (0, vitest_1.expect)(server.handleAnalyzeSchema({ environment: 'development' })).rejects.toThrow('Database connection failed');
        });
    });
    (0, vitest_1.describe)('lifecycle', () => {
        (0, vitest_1.it)('should have start method', () => {
            (0, vitest_1.expect)(typeof server.start).toBe('function');
        });
        (0, vitest_1.it)('should have stop method', () => {
            (0, vitest_1.expect)(typeof server.stop).toBe('function');
        });
    });
});
//# sourceMappingURL=MCPServer.test.js.map