"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const GetRelationshipsUseCase_1 = require("./GetRelationshipsUseCase");
const RelationshipAnalyzer_1 = require("../../domain/services/RelationshipAnalyzer");
const DatabaseConfig_1 = require("../../infrastructure/config/DatabaseConfig");
const Environment_1 = require("../../domain/value-objects/Environment");
const DatabaseSchema_1 = require("../../domain/entities/DatabaseSchema");
const TableInfo_1 = require("../../domain/entities/TableInfo");
const Column_1 = require("../../domain/entities/Column");
const ForeignKey_1 = require("../../domain/entities/ForeignKey");
(0, vitest_1.describe)('GetRelationshipsUseCase', () => {
    let useCase;
    let mockRepository;
    let mockCache;
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
        // Real relationship analyzer
        relationshipAnalyzer = new RelationshipAnalyzer_1.RelationshipAnalyzer();
        // Mock database config
        const databases = new Map();
        databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev_db', id: 'dev-123' });
        databases.set(Environment_1.Environment.PRODUCTION, { name: 'prod_db', id: 'prod-789' });
        mockDatabaseConfig = new DatabaseConfig_1.DatabaseConfig(databases);
        useCase = new GetRelationshipsUseCase_1.GetRelationshipsUseCase(mockRepository, relationshipAnalyzer, mockDatabaseConfig, mockCache);
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create use case and freeze instance', () => {
            (0, vitest_1.expect)(Object.isFrozen(useCase)).toBe(true);
        });
    });
    (0, vitest_1.describe)('execute()', () => {
        (0, vitest_1.it)('should extract all relationships from schema', async () => {
            // Mock cache miss
            mockCache.get.mockResolvedValue(undefined);
            // Create schema with relationships
            const usersColumns = [new Column_1.Column('id', 'INTEGER', false, true, null)];
            const ordersColumns = [
                new Column_1.Column('id', 'INTEGER', false, true, null),
                new Column_1.Column('user_id', 'INTEGER', false, false, null),
            ];
            const ordersForeignKeys = [new ForeignKey_1.ForeignKey('orders', 'user_id', 'users', 'id', 'CASCADE', 'RESTRICT')];
            const usersTable = new TableInfo_1.TableInfo('users', 'table', usersColumns, [], []);
            const ordersTable = new TableInfo_1.TableInfo('orders', 'table', ordersColumns, [], ordersForeignKeys);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [usersTable, ordersTable], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            // Execute
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            // Verify repository was called
            (0, vitest_1.expect)(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('dev-123');
            // Verify cache was set
            (0, vitest_1.expect)(mockCache.set).toHaveBeenCalledWith('schema:development', schema, 600);
            // Verify response
            (0, vitest_1.expect)(result.databaseName).toBe('dev_db');
            (0, vitest_1.expect)(result.environment).toBe(Environment_1.Environment.DEVELOPMENT);
            (0, vitest_1.expect)(result.relationshipCount).toBe(1);
            (0, vitest_1.expect)(result.relationships).toHaveLength(1);
            // Verify relationship details
            const rel = result.relationships[0];
            (0, vitest_1.expect)(rel.fromTable).toBe('orders');
            (0, vitest_1.expect)(rel.fromColumn).toBe('user_id');
            (0, vitest_1.expect)(rel.toTable).toBe('users');
            (0, vitest_1.expect)(rel.toColumn).toBe('id');
            (0, vitest_1.expect)(rel.onDelete).toBe('CASCADE');
            (0, vitest_1.expect)(rel.onUpdate).toBe('RESTRICT');
            (0, vitest_1.expect)(rel.isRequired).toBe(true);
        });
        (0, vitest_1.it)('should return cached schema when available', async () => {
            // Create and cache schema
            const table = new TableInfo_1.TableInfo('products', 'table', [new Column_1.Column('id', 'INTEGER', false, true, null)], [], []);
            const cachedSchema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockCache.get.mockResolvedValue(cachedSchema);
            // Execute
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
        (0, vitest_1.it)('should filter relationships by table name when specified', async () => {
            mockCache.get.mockResolvedValue(undefined);
            // Create schema with multiple relationships
            const usersTable = new TableInfo_1.TableInfo('users', 'table', [new Column_1.Column('id', 'INTEGER', false, true, null)], [], []);
            const ordersTable = new TableInfo_1.TableInfo('orders', 'table', [new Column_1.Column('id', 'INTEGER', false, true, null)], [], [new ForeignKey_1.ForeignKey('orders', 'user_id', 'users', 'id', 'CASCADE', null)]);
            const paymentsTable = new TableInfo_1.TableInfo('payments', 'table', [new Column_1.Column('id', 'INTEGER', false, true, null)], [], [new ForeignKey_1.ForeignKey('payments', 'order_id', 'orders', 'id', 'RESTRICT', null)]);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [usersTable, ordersTable, paymentsTable], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            // Execute with table filter
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
                tableName: 'orders',
            });
            // Should return relationships where orders is either fromTable or toTable
            (0, vitest_1.expect)(result.relationshipCount).toBe(2);
            const fromOrders = result.relationships.find((r) => r.fromTable === 'orders');
            const toOrders = result.relationships.find((r) => r.toTable === 'orders');
            (0, vitest_1.expect)(fromOrders).toBeDefined();
            (0, vitest_1.expect)(fromOrders?.toTable).toBe('users');
            (0, vitest_1.expect)(toOrders).toBeDefined();
            (0, vitest_1.expect)(toOrders?.fromTable).toBe('payments');
        });
        (0, vitest_1.it)('should handle schema with no relationships', async () => {
            mockCache.get.mockResolvedValue(undefined);
            // Create schema without foreign keys
            const table = new TableInfo_1.TableInfo('standalone', 'table', [new Column_1.Column('id', 'INTEGER', false, true, null)], [], []);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            (0, vitest_1.expect)(result.relationshipCount).toBe(0);
            (0, vitest_1.expect)(result.relationships).toHaveLength(0);
        });
        (0, vitest_1.it)('should handle different environments correctly', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const table = new TableInfo_1.TableInfo('items', 'table', [new Column_1.Column('id', 'INTEGER', false, true, null)], [], []);
            const schema = new DatabaseSchema_1.DatabaseSchema('prod_db', Environment_1.Environment.PRODUCTION, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.PRODUCTION,
            });
            // Verify correct database ID used
            (0, vitest_1.expect)(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('prod-789');
            // Verify correct cache key
            (0, vitest_1.expect)(mockCache.set).toHaveBeenCalledWith('schema:production', schema, 600);
            // Verify response environment
            (0, vitest_1.expect)(result.environment).toBe(Environment_1.Environment.PRODUCTION);
            (0, vitest_1.expect)(result.databaseName).toBe('prod_db');
        });
        (0, vitest_1.it)('should correctly identify required relationships', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const table1 = new TableInfo_1.TableInfo('table1', 'table', [new Column_1.Column('id', 'INTEGER', false, true, null)], [], []);
            const table2 = new TableInfo_1.TableInfo('table2', 'table', [new Column_1.Column('id', 'INTEGER', false, true, null)], [], [
                new ForeignKey_1.ForeignKey('table2', 'fk1', 'table1', 'id', 'CASCADE', null), // Required (CASCADE)
                new ForeignKey_1.ForeignKey('table2', 'fk2', 'table1', 'id', 'SET NULL', null), // Not required
            ]);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table1, table2], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            (0, vitest_1.expect)(result.relationshipCount).toBe(2);
            const cascadeRel = result.relationships.find((r) => r.onDelete === 'CASCADE');
            const setNullRel = result.relationships.find((r) => r.onDelete === 'SET NULL');
            (0, vitest_1.expect)(cascadeRel?.isRequired).toBe(true);
            (0, vitest_1.expect)(setNullRel?.isRequired).toBe(false);
        });
        (0, vitest_1.it)('should return empty array when filtering by non-existent table', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const table = new TableInfo_1.TableInfo('users', 'table', [new Column_1.Column('id', 'INTEGER', false, true, null)], [], [new ForeignKey_1.ForeignKey('users', 'dept_id', 'departments', 'id', null, null)]);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
                tableName: 'nonexistent',
            });
            (0, vitest_1.expect)(result.relationshipCount).toBe(0);
            (0, vitest_1.expect)(result.relationships).toHaveLength(0);
        });
    });
});
//# sourceMappingURL=GetRelationshipsUseCase.test.js.map