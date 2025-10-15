"use strict";
/**
 * Integration Tests
 *
 * @semantic-intent End-to-end tests verifying all layers work together
 * Tests the complete dependency graph from presentation to infrastructure
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const MCPServer_1 = require("./presentation/mcp/MCPServer");
const AnalyzeSchemaUseCase_1 = require("./application/use-cases/AnalyzeSchemaUseCase");
const GetRelationshipsUseCase_1 = require("./application/use-cases/GetRelationshipsUseCase");
const ValidateSchemaUseCase_1 = require("./application/use-cases/ValidateSchemaUseCase");
const SuggestOptimizationsUseCase_1 = require("./application/use-cases/SuggestOptimizationsUseCase");
const CompareSchemasUseCase_1 = require("./application/use-cases/CompareSchemasUseCase");
const SchemaAnalyzer_1 = require("./domain/services/SchemaAnalyzer");
const RelationshipAnalyzer_1 = require("./domain/services/RelationshipAnalyzer");
const OptimizationService_1 = require("./domain/services/OptimizationService");
const DatabaseConfig_1 = require("./infrastructure/config/DatabaseConfig");
const Environment_1 = require("./domain/value-objects/Environment");
const DatabaseSchema_1 = require("./domain/entities/DatabaseSchema");
const TableInfo_1 = require("./domain/entities/TableInfo");
(0, vitest_1.describe)('Integration Tests', () => {
    let mcpServer;
    let mockRepository;
    let mockCache;
    let databaseConfig;
    (0, vitest_1.beforeEach)(() => {
        // Mock infrastructure adapters (to avoid real HTTP calls)
        mockRepository = {
            fetchDatabaseSchema: vitest_1.vi.fn().mockResolvedValue({
                name: 'test_db',
                environment: Environment_1.Environment.DEVELOPMENT,
                tables: [],
                fetchedAt: new Date(),
            }),
            fetchTableDetails: vitest_1.vi.fn(),
            fetchIndexInformation: vitest_1.vi.fn(),
            executeSQLQuery: vitest_1.vi.fn(),
        };
        mockCache = {
            get: vitest_1.vi.fn().mockResolvedValue(undefined),
            set: vitest_1.vi.fn().mockResolvedValue(undefined),
            delete: vitest_1.vi.fn(),
            clear: vitest_1.vi.fn(),
            has: vitest_1.vi.fn(),
        };
        const databases = new Map();
        databases.set(Environment_1.Environment.DEVELOPMENT, { id: 'dev-db-123', name: 'test_dev' });
        databases.set(Environment_1.Environment.STAGING, { id: 'staging-db-456', name: 'test_staging' });
        databases.set(Environment_1.Environment.PRODUCTION, { id: 'prod-db-789', name: 'test_prod' });
        databaseConfig = new DatabaseConfig_1.DatabaseConfig(databases);
        // Domain layer
        const schemaAnalyzer = new SchemaAnalyzer_1.SchemaAnalyzer();
        const relationshipAnalyzer = new RelationshipAnalyzer_1.RelationshipAnalyzer();
        const optimizationService = new OptimizationService_1.OptimizationService();
        // Application layer
        const analyzeSchemaUseCase = new AnalyzeSchemaUseCase_1.AnalyzeSchemaUseCase(mockRepository, schemaAnalyzer, databaseConfig, mockCache);
        const getRelationshipsUseCase = new GetRelationshipsUseCase_1.GetRelationshipsUseCase(mockRepository, relationshipAnalyzer, databaseConfig, mockCache);
        const validateSchemaUseCase = new ValidateSchemaUseCase_1.ValidateSchemaUseCase(mockRepository, schemaAnalyzer, databaseConfig, mockCache);
        const suggestOptimizationsUseCase = new SuggestOptimizationsUseCase_1.SuggestOptimizationsUseCase(mockRepository, optimizationService, relationshipAnalyzer, databaseConfig, mockCache);
        const compareSchemasUseCase = new CompareSchemasUseCase_1.CompareSchemasUseCase(mockRepository);
        // Presentation layer
        mcpServer = new MCPServer_1.D1DatabaseMCPServer(analyzeSchemaUseCase, getRelationshipsUseCase, validateSchemaUseCase, suggestOptimizationsUseCase, compareSchemasUseCase);
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('Full Stack Integration', () => {
        (0, vitest_1.it)('should wire all dependencies correctly', () => {
            (0, vitest_1.expect)(mcpServer).toBeDefined();
            (0, vitest_1.expect)(Object.isFrozen(mcpServer)).toBe(true);
        });
        (0, vitest_1.it)('should successfully execute analyze schema through all layers', async () => {
            // Mock repository response
            vitest_1.vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue({
                name: 'test_dev',
                environment: Environment_1.Environment.DEVELOPMENT,
                tables: [],
                fetchedAt: new Date(),
            });
            const result = await mcpServer.handleAnalyzeSchema({
                environment: 'development',
                includeSamples: false,
            });
            (0, vitest_1.expect)(result.content).toHaveLength(1);
            (0, vitest_1.expect)(result.content[0].type).toBe('text');
            const parsed = JSON.parse(result.content[0].text);
            (0, vitest_1.expect)(parsed.databaseName).toBe('test_dev');
            (0, vitest_1.expect)(parsed.environment).toBe('development');
        });
        (0, vitest_1.it)('should successfully execute get relationships through all layers', async () => {
            vitest_1.vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue({
                name: 'test_dev',
                environment: Environment_1.Environment.DEVELOPMENT,
                tables: [],
                fetchedAt: new Date(),
            });
            const result = await mcpServer.handleGetRelationships({
                environment: 'development',
            });
            (0, vitest_1.expect)(result.content).toHaveLength(1);
            const parsed = JSON.parse(result.content[0].text);
            (0, vitest_1.expect)(parsed.databaseName).toBe('test_dev');
            (0, vitest_1.expect)(parsed.relationships).toBeDefined();
        });
        (0, vitest_1.it)('should successfully execute validate schema through all layers', async () => {
            vitest_1.vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue({
                name: 'test_dev',
                environment: Environment_1.Environment.DEVELOPMENT,
                tables: [],
                fetchedAt: new Date(),
            });
            const result = await mcpServer.handleValidateSchema({
                environment: 'development',
            });
            (0, vitest_1.expect)(result.content).toHaveLength(1);
            const parsed = JSON.parse(result.content[0].text);
            (0, vitest_1.expect)(parsed.isValid).toBeDefined();
            (0, vitest_1.expect)(parsed.issues).toBeDefined();
        });
        (0, vitest_1.it)('should successfully execute suggest optimizations through all layers', async () => {
            vitest_1.vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue({
                name: 'test_dev',
                environment: Environment_1.Environment.DEVELOPMENT,
                tables: [],
                fetchedAt: new Date(),
            });
            const result = await mcpServer.handleSuggestOptimizations({
                environment: 'development',
            });
            (0, vitest_1.expect)(result.content).toHaveLength(1);
            const parsed = JSON.parse(result.content[0].text);
            (0, vitest_1.expect)(parsed.optimizations).toBeDefined();
            (0, vitest_1.expect)(parsed.optimizationCount).toBeDefined();
        });
    });
    (0, vitest_1.describe)('Cache Integration', () => {
        (0, vitest_1.it)('should cache schema across multiple use case calls', async () => {
            const mockSchema = {
                name: 'test_dev',
                environment: Environment_1.Environment.DEVELOPMENT,
                tables: [],
                fetchedAt: new Date(),
            };
            // Set up cache mock to return undefined first time, then cached value
            let cacheValue = undefined;
            mockCache.get.mockImplementation(async () => cacheValue);
            mockCache.set.mockImplementation(async (key, value) => {
                cacheValue = value;
            });
            const fetchSpy = vitest_1.vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue(mockSchema);
            // First call - should fetch
            await mcpServer.handleAnalyzeSchema({
                environment: 'development',
                includeSamples: false,
            });
            (0, vitest_1.expect)(fetchSpy).toHaveBeenCalledTimes(1);
            // Second call - should use cache
            await mcpServer.handleAnalyzeSchema({
                environment: 'development',
                includeSamples: false,
            });
            // Should still be 1 (cached)
            (0, vitest_1.expect)(fetchSpy).toHaveBeenCalledTimes(1);
        });
        (0, vitest_1.it)('should share cache between different use cases', async () => {
            const mockSchema = {
                name: 'test_dev',
                environment: Environment_1.Environment.DEVELOPMENT,
                tables: [],
                fetchedAt: new Date(),
            };
            // Set up cache mock to simulate real caching
            let cacheValue = undefined;
            mockCache.get.mockImplementation(async () => cacheValue);
            mockCache.set.mockImplementation(async (key, value) => {
                cacheValue = value;
            });
            const fetchSpy = vitest_1.vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue(mockSchema);
            // Call analyze schema
            await mcpServer.handleAnalyzeSchema({
                environment: 'development',
                includeSamples: false,
            });
            (0, vitest_1.expect)(fetchSpy).toHaveBeenCalledTimes(1);
            // Call validate schema - should use same cache
            await mcpServer.handleValidateSchema({
                environment: 'development',
            });
            // Should still be 1 (cached)
            (0, vitest_1.expect)(fetchSpy).toHaveBeenCalledTimes(1);
        });
    });
    (0, vitest_1.describe)('Environment Configuration', () => {
        (0, vitest_1.it)('should route to correct database based on environment', async () => {
            const mockSchema = {
                name: 'test_prod',
                environment: Environment_1.Environment.PRODUCTION,
                tables: [],
                fetchedAt: new Date(),
            };
            const fetchSpy = vitest_1.vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue(mockSchema);
            await mcpServer.handleAnalyzeSchema({
                environment: 'production',
                includeSamples: false,
            });
            (0, vitest_1.expect)(fetchSpy).toHaveBeenCalledWith('prod-db-789');
        });
        (0, vitest_1.it)('should handle all three environments correctly', async () => {
            const fetchSpy = vitest_1.vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockImplementation(async (dbId) => {
                const envMap = {
                    'dev-db-123': Environment_1.Environment.DEVELOPMENT,
                    'staging-db-456': Environment_1.Environment.STAGING,
                    'prod-db-789': Environment_1.Environment.PRODUCTION,
                };
                const dummyColumn = { name: 'id', type: 'INTEGER', isPrimaryKey: true, isNullable: false, defaultValue: null };
                const dummyTable = new TableInfo_1.TableInfo('test_table', 'table', [dummyColumn], [], []);
                return new DatabaseSchema_1.DatabaseSchema('test', envMap[dbId], [dummyTable], new Date());
            });
            await mcpServer.handleAnalyzeSchema({ environment: 'development', includeSamples: false });
            (0, vitest_1.expect)(fetchSpy).toHaveBeenCalledWith('dev-db-123');
            await mcpServer.handleAnalyzeSchema({ environment: 'staging', includeSamples: false });
            (0, vitest_1.expect)(fetchSpy).toHaveBeenCalledWith('staging-db-456');
            await mcpServer.handleAnalyzeSchema({ environment: 'production', includeSamples: false });
            (0, vitest_1.expect)(fetchSpy).toHaveBeenCalledWith('prod-db-789');
        });
    });
    (0, vitest_1.describe)('Error Propagation', () => {
        (0, vitest_1.it)('should propagate repository errors through all layers', async () => {
            vitest_1.vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockRejectedValue(new Error('Database connection failed'));
            await (0, vitest_1.expect)(mcpServer.handleAnalyzeSchema({
                environment: 'development',
                includeSamples: false,
            })).rejects.toThrow('Database connection failed');
        });
        (0, vitest_1.it)('should handle invalid environment gracefully', async () => {
            await (0, vitest_1.expect)(mcpServer.handleAnalyzeSchema({
                environment: 'invalid',
                includeSamples: false,
            })).rejects.toThrow();
        });
    });
    (0, vitest_1.describe)('Dependency Injection', () => {
        (0, vitest_1.it)('should use injected cache provider', async () => {
            const setSpy = vitest_1.vi.spyOn(mockCache, 'set');
            const getSpy = vitest_1.vi.spyOn(mockCache, 'get');
            vitest_1.vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue({
                name: 'test',
                environment: Environment_1.Environment.DEVELOPMENT,
                tables: [],
                fetchedAt: new Date(),
            });
            await mcpServer.handleAnalyzeSchema({
                environment: 'development',
                includeSamples: false,
            });
            (0, vitest_1.expect)(getSpy).toHaveBeenCalled();
            (0, vitest_1.expect)(setSpy).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should use injected repository', async () => {
            const fetchSpy = vitest_1.vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue({
                name: 'test',
                environment: Environment_1.Environment.DEVELOPMENT,
                tables: [],
                fetchedAt: new Date(),
            });
            await mcpServer.handleAnalyzeSchema({
                environment: 'development',
                includeSamples: false,
            });
            (0, vitest_1.expect)(fetchSpy).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('Lifecycle', () => {
        (0, vitest_1.it)('should have start method', () => {
            (0, vitest_1.expect)(typeof mcpServer.start).toBe('function');
        });
        (0, vitest_1.it)('should have stop method', () => {
            (0, vitest_1.expect)(typeof mcpServer.stop).toBe('function');
        });
    });
});
//# sourceMappingURL=integration.test.js.map