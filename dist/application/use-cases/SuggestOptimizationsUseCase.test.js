"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const SuggestOptimizationsUseCase_1 = require("./SuggestOptimizationsUseCase");
const OptimizationService_1 = require("../../domain/services/OptimizationService");
const RelationshipAnalyzer_1 = require("../../domain/services/RelationshipAnalyzer");
const DatabaseConfig_1 = require("../../infrastructure/config/DatabaseConfig");
const Environment_1 = require("../../domain/value-objects/Environment");
const DatabaseSchema_1 = require("../../domain/entities/DatabaseSchema");
const TableInfo_1 = require("../../domain/entities/TableInfo");
const Column_1 = require("../../domain/entities/Column");
const Index_1 = require("../../domain/entities/Index");
const ForeignKey_1 = require("../../domain/entities/ForeignKey");
(0, vitest_1.describe)('SuggestOptimizationsUseCase', () => {
    let useCase;
    let mockRepository;
    let mockCache;
    let optimizationService;
    let relationshipAnalyzer;
    let mockDatabaseConfig;
    (0, vitest_1.beforeEach)(() => {
        // Mock repository
        mockRepository = {
            fetchDatabaseSchema: vitest_1.vi.fn(),
            fetchTableDetails: vitest_1.vi.fn(),
            fetchIndexInformation: vitest_1.vi.fn(),
            executeSQLQuery: vitest_1.vi.fn(),
        };
        // Mock cache
        mockCache = {
            get: vitest_1.vi.fn(),
            set: vitest_1.vi.fn(),
            delete: vitest_1.vi.fn(),
            clear: vitest_1.vi.fn(),
            has: vitest_1.vi.fn(),
        };
        // Real optimization service and relationship analyzer
        optimizationService = new OptimizationService_1.OptimizationService();
        relationshipAnalyzer = new RelationshipAnalyzer_1.RelationshipAnalyzer();
        // Mock database config
        const databases = new Map();
        databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev_db', id: 'dev-123' });
        databases.set(Environment_1.Environment.PRODUCTION, { name: 'prod_db', id: 'prod-789' });
        mockDatabaseConfig = new DatabaseConfig_1.DatabaseConfig(databases);
        useCase = new SuggestOptimizationsUseCase_1.SuggestOptimizationsUseCase(mockRepository, optimizationService, relationshipAnalyzer, mockDatabaseConfig, mockCache);
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create use case and freeze instance', () => {
            (0, vitest_1.expect)(Object.isFrozen(useCase)).toBe(true);
        });
    });
    (0, vitest_1.describe)('execute()', () => {
        (0, vitest_1.it)('should suggest optimizations for schema', async () => {
            mockCache.get.mockResolvedValue(undefined);
            // Create schema with optimization opportunities - table without primary key
            const columns = [new Column_1.Column('name', 'TEXT', false, false, null)];
            const table = new TableInfo_1.TableInfo('users', 'table', columns, [], []);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            (0, vitest_1.expect)(result.databaseName).toBe('dev_db');
            (0, vitest_1.expect)(result.environment).toBe(Environment_1.Environment.DEVELOPMENT);
            (0, vitest_1.expect)(result.optimizationCount).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.optimizations).toBeInstanceOf(Array);
        });
        (0, vitest_1.it)('should suggest index on foreign key column', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const usersColumns = [new Column_1.Column('id', 'INTEGER', true, false, null)];
            const usersTable = new TableInfo_1.TableInfo('users', 'table', usersColumns, [], []);
            const ordersColumns = [
                new Column_1.Column('id', 'INTEGER', true, false, null),
                new Column_1.Column('user_id', 'INTEGER', false, false, null),
            ];
            const foreignKeys = [new ForeignKey_1.ForeignKey('orders', 'user_id', 'users', 'id', 'CASCADE', null)];
            // No index on user_id
            const ordersTable = new TableInfo_1.TableInfo('orders', 'table', ordersColumns, [], foreignKeys);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [usersTable, ordersTable], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            // Should suggest index on foreign key
            const fkIndexSuggestion = result.optimizations.find((opt) => opt.type === 'missing_index' && opt.column === 'user_id');
            (0, vitest_1.expect)(fkIndexSuggestion).toBeDefined();
            (0, vitest_1.expect)(fkIndexSuggestion?.table).toBe('orders');
        });
        (0, vitest_1.it)('should not suggest index if already exists', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const usersColumns = [new Column_1.Column('id', 'INTEGER', true, false, null)];
            const usersTable = new TableInfo_1.TableInfo('users', 'table', usersColumns, [], []);
            const ordersColumns = [
                new Column_1.Column('id', 'INTEGER', true, false, null),
                new Column_1.Column('user_id', 'INTEGER', false, false, null),
            ];
            const foreignKeys = [new ForeignKey_1.ForeignKey('orders', 'user_id', 'users', 'id', 'CASCADE', null)];
            const indexes = [new Index_1.Index('idx_user_id', 'orders', ['user_id'], false, false)];
            const ordersTable = new TableInfo_1.TableInfo('orders', 'table', ordersColumns, indexes, foreignKeys);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [usersTable, ordersTable], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            // Should NOT suggest index on user_id since it exists
            const fkIndexSuggestion = result.optimizations.find((opt) => opt.type === 'missing_index' && opt.column === 'user_id');
            (0, vitest_1.expect)(fkIndexSuggestion).toBeUndefined();
        });
        (0, vitest_1.it)('should use cached schema when available', async () => {
            const columns = [new Column_1.Column('id', 'INTEGER', true, false, null)];
            const table = new TableInfo_1.TableInfo('products', 'table', columns, [], []);
            const cachedSchema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockCache.get.mockResolvedValue(cachedSchema);
            await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            // Verify cache was checked
            (0, vitest_1.expect)(mockCache.get).toHaveBeenCalledWith('schema:development');
            // Verify repository was NOT called
            (0, vitest_1.expect)(mockRepository.fetchDatabaseSchema).not.toHaveBeenCalled();
            // Verify cache was NOT set again
            (0, vitest_1.expect)(mockCache.set).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should handle different environments correctly', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const columns = [new Column_1.Column('id', 'INTEGER', true, false, null)];
            const table = new TableInfo_1.TableInfo('items', 'table', columns, [], []);
            const schema = new DatabaseSchema_1.DatabaseSchema('prod_db', Environment_1.Environment.PRODUCTION, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.PRODUCTION,
            });
            // Verify correct database ID used
            (0, vitest_1.expect)(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('prod-789');
            // Verify correct cache key
            (0, vitest_1.expect)(mockCache.set).toHaveBeenCalledWith('schema:production', schema, 600);
            (0, vitest_1.expect)(result.environment).toBe(Environment_1.Environment.PRODUCTION);
            (0, vitest_1.expect)(result.databaseName).toBe('prod_db');
        });
        (0, vitest_1.it)('should include optimization details', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const columns = [
                new Column_1.Column('id', 'INTEGER', true, false, null),
                new Column_1.Column('email', 'TEXT', false, false, null),
            ];
            const table = new TableInfo_1.TableInfo('users', 'table', columns, [], []);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            if (result.optimizations.length > 0) {
                const opt = result.optimizations[0];
                (0, vitest_1.expect)(opt.type).toBeDefined();
                (0, vitest_1.expect)(opt.reason).toBeDefined();
                (0, vitest_1.expect)(opt.suggestion).toBeDefined();
                (0, vitest_1.expect)(opt.priority).toBeDefined();
            }
        });
        (0, vitest_1.it)('should handle schema with no optimization opportunities', async () => {
            mockCache.get.mockResolvedValue(undefined);
            // Well-optimized table
            const columns = [new Column_1.Column('id', 'INTEGER', true, false, null)];
            const indexes = [new Index_1.Index('pk_id', 'users', ['id'], true, true)];
            const table = new TableInfo_1.TableInfo('users', 'table', columns, indexes, []);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            (0, vitest_1.expect)(result.optimizationCount).toBe(0);
            (0, vitest_1.expect)(result.optimizations).toHaveLength(0);
        });
        (0, vitest_1.it)('should map optimization properties correctly', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const usersColumns = [new Column_1.Column('id', 'INTEGER', true, false, null)];
            const usersTable = new TableInfo_1.TableInfo('users', 'table', usersColumns, [], []);
            const ordersColumns = [
                new Column_1.Column('id', 'INTEGER', true, false, null),
                new Column_1.Column('user_id', 'INTEGER', false, false, null),
            ];
            const foreignKeys = [new ForeignKey_1.ForeignKey('orders', 'user_id', 'users', 'id', 'CASCADE', null)];
            const ordersTable = new TableInfo_1.TableInfo('orders', 'table', ordersColumns, [], foreignKeys);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [usersTable, ordersTable], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            const fkOpt = result.optimizations.find((opt) => opt.column === 'user_id');
            if (fkOpt) {
                (0, vitest_1.expect)(fkOpt.type).toBe('missing_index');
                (0, vitest_1.expect)(fkOpt.table).toBe('orders');
                (0, vitest_1.expect)(fkOpt.column).toBe('user_id');
                (0, vitest_1.expect)(['high', 'medium', 'low']).toContain(fkOpt.priority);
                (0, vitest_1.expect)(fkOpt.reason).toBeDefined();
                (0, vitest_1.expect)(fkOpt.suggestion).toBeDefined();
            }
        });
    });
});
//# sourceMappingURL=SuggestOptimizationsUseCase.test.js.map