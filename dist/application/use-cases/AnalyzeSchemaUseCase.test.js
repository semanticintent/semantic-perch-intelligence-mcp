"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const AnalyzeSchemaUseCase_1 = require("./AnalyzeSchemaUseCase");
const SchemaAnalyzer_1 = require("../../domain/services/SchemaAnalyzer");
const DatabaseConfig_1 = require("../../infrastructure/config/DatabaseConfig");
const Environment_1 = require("../../domain/value-objects/Environment");
const DatabaseSchema_1 = require("../../domain/entities/DatabaseSchema");
const TableInfo_1 = require("../../domain/entities/TableInfo");
const Column_1 = require("../../domain/entities/Column");
const Index_1 = require("../../domain/entities/Index");
const ForeignKey_1 = require("../../domain/entities/ForeignKey");
(0, vitest_1.describe)('AnalyzeSchemaUseCase', () => {
    let useCase;
    let mockRepository;
    let mockCache;
    let mockSchemaAnalyzer;
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
        // Mock schema analyzer
        mockSchemaAnalyzer = new SchemaAnalyzer_1.SchemaAnalyzer();
        // Mock database config
        const databases = new Map();
        databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev_db', id: 'dev-123' });
        databases.set(Environment_1.Environment.STAGING, { name: 'staging_db', id: 'staging-456' });
        databases.set(Environment_1.Environment.PRODUCTION, { name: 'prod_db', id: 'prod-789' });
        mockDatabaseConfig = new DatabaseConfig_1.DatabaseConfig(databases);
        useCase = new AnalyzeSchemaUseCase_1.AnalyzeSchemaUseCase(mockRepository, mockSchemaAnalyzer, mockDatabaseConfig, mockCache);
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create use case and freeze instance', () => {
            (0, vitest_1.expect)(Object.isFrozen(useCase)).toBe(true);
        });
    });
    (0, vitest_1.describe)('execute()', () => {
        (0, vitest_1.it)('should fetch schema and return analysis when cache is empty', async () => {
            // Mock cache miss
            mockCache.get.mockResolvedValue(undefined);
            // Mock schema
            const columns = [
                new Column_1.Column('id', 'INTEGER', false, true, null),
                new Column_1.Column('name', 'TEXT', false, false, null),
            ];
            const indexes = [new Index_1.Index('idx_name', 'users', ['name'], false, false)];
            const foreignKeys = [];
            const table = new TableInfo_1.TableInfo('users', 'table', columns, indexes, foreignKeys);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            mockRepository.executeSQLQuery.mockResolvedValue({
                success: true,
                results: [{ id: 1, name: 'Alice' }],
            });
            // Execute
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
                includeSamples: true,
                maxSampleRows: 5,
            });
            // Verify repository was called with correct database ID
            (0, vitest_1.expect)(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('dev-123');
            // Verify cache was set with 10-minute TTL
            (0, vitest_1.expect)(mockCache.set).toHaveBeenCalledWith('schema:development', schema, 600);
            // Verify response structure
            (0, vitest_1.expect)(result.databaseName).toBe('dev_db');
            (0, vitest_1.expect)(result.environment).toBe(Environment_1.Environment.DEVELOPMENT);
            (0, vitest_1.expect)(result.tableCount).toBe(1);
            (0, vitest_1.expect)(result.tables).toHaveLength(1);
            // Verify table analysis
            const tableAnalysis = result.tables[0];
            (0, vitest_1.expect)(tableAnalysis.name).toBe('users');
            (0, vitest_1.expect)(tableAnalysis.type).toBe('table');
            (0, vitest_1.expect)(tableAnalysis.columnCount).toBe(2);
            (0, vitest_1.expect)(tableAnalysis.columns).toHaveLength(2);
            (0, vitest_1.expect)(tableAnalysis.indexes).toHaveLength(1);
            (0, vitest_1.expect)(tableAnalysis.samples).toEqual([{ id: 1, name: 'Alice' }]);
        });
        (0, vitest_1.it)('should return cached schema when available', async () => {
            // Mock cached schema
            const columns = [new Column_1.Column('id', 'INTEGER', false, true, null)];
            const table = new TableInfo_1.TableInfo('products', 'table', columns, [], []);
            const cachedSchema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockCache.get.mockResolvedValue(cachedSchema);
            // Execute
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
                includeSamples: false,
            });
            // Verify cache was checked
            (0, vitest_1.expect)(mockCache.get).toHaveBeenCalledWith('schema:development');
            // Verify repository was NOT called
            (0, vitest_1.expect)(mockRepository.fetchDatabaseSchema).not.toHaveBeenCalled();
            // Verify cache was NOT set again
            (0, vitest_1.expect)(mockCache.set).not.toHaveBeenCalled();
            // Verify response uses cached data
            (0, vitest_1.expect)(result.databaseName).toBe('dev_db');
            (0, vitest_1.expect)(result.tableCount).toBe(1);
        });
        (0, vitest_1.it)('should handle different environments correctly', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const columns = [new Column_1.Column('id', 'INTEGER', false, true, null)];
            const table = new TableInfo_1.TableInfo('orders', 'table', columns, [], []);
            const schema = new DatabaseSchema_1.DatabaseSchema('prod_db', Environment_1.Environment.PRODUCTION, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            // Execute with production environment
            await useCase.execute({
                environment: Environment_1.Environment.PRODUCTION,
                includeSamples: false,
            });
            // Verify correct database ID used
            (0, vitest_1.expect)(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('prod-789');
            // Verify correct cache key
            (0, vitest_1.expect)(mockCache.set).toHaveBeenCalledWith('schema:production', schema, 600);
        });
        (0, vitest_1.it)('should include samples when includeSamples is true', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const columns = [new Column_1.Column('id', 'INTEGER', false, true, null)];
            const table = new TableInfo_1.TableInfo('items', 'table', columns, [], []);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            mockRepository.executeSQLQuery.mockResolvedValue({
                success: true,
                results: [{ id: 1 }, { id: 2 }],
            });
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
                includeSamples: true,
                maxSampleRows: 2,
            });
            // Verify sample query was executed
            (0, vitest_1.expect)(mockRepository.executeSQLQuery).toHaveBeenCalledWith('dev-123', 'SELECT * FROM "items" LIMIT 2');
            // Verify samples are included
            (0, vitest_1.expect)(result.tables[0].samples).toEqual([{ id: 1 }, { id: 2 }]);
        });
        (0, vitest_1.it)('should exclude samples when includeSamples is false', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const columns = [new Column_1.Column('id', 'INTEGER', false, true, null)];
            const table = new TableInfo_1.TableInfo('items', 'table', columns, [], []);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
                includeSamples: false,
            });
            // Verify sample query was NOT executed
            (0, vitest_1.expect)(mockRepository.executeSQLQuery).not.toHaveBeenCalled();
            // Verify samples are not included
            (0, vitest_1.expect)(result.tables[0].samples).toBeUndefined();
        });
        (0, vitest_1.it)('should use default values for optional parameters', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const columns = [new Column_1.Column('id', 'INTEGER', false, true, null)];
            const table = new TableInfo_1.TableInfo('items', 'table', columns, [], []);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            mockRepository.executeSQLQuery.mockResolvedValue({
                success: true,
                results: [],
            });
            // Execute with minimal request (no optional params)
            await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            // Verify default includeSamples=true and maxSampleRows=5
            (0, vitest_1.expect)(mockRepository.executeSQLQuery).toHaveBeenCalledWith('dev-123', 'SELECT * FROM "items" LIMIT 5');
        });
        (0, vitest_1.it)('should handle sample fetch errors gracefully', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const columns = [new Column_1.Column('id', 'INTEGER', false, true, null)];
            const table = new TableInfo_1.TableInfo('items', 'table', columns, [], []);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            mockRepository.executeSQLQuery.mockRejectedValue(new Error('Table not found'));
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
                includeSamples: true,
            });
            // Verify sample fetch was attempted
            (0, vitest_1.expect)(mockRepository.executeSQLQuery).toHaveBeenCalled();
            // Verify empty array returned on error (doesn't fail entire analysis)
            (0, vitest_1.expect)(result.tables[0].samples).toEqual([]);
        });
        (0, vitest_1.it)('should correctly format all table metadata', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const columns = [
                new Column_1.Column('id', 'INTEGER', true, false, null),
                new Column_1.Column('name', 'TEXT', false, true, "'unknown'"),
            ];
            const indexes = [
                new Index_1.Index('pk_users', 'users', ['id'], true, true),
                new Index_1.Index('idx_name', 'users', ['name'], false, false),
            ];
            const foreignKeys = [
                new ForeignKey_1.ForeignKey('users', 'department_id', 'departments', 'id', 'CASCADE', 'RESTRICT'),
            ];
            const table = new TableInfo_1.TableInfo('users', 'table', columns, indexes, foreignKeys);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
                includeSamples: false,
            });
            const tableAnalysis = result.tables[0];
            // Verify columns
            (0, vitest_1.expect)(tableAnalysis.columns).toHaveLength(2);
            (0, vitest_1.expect)(tableAnalysis.columns[0]).toEqual({
                name: 'id',
                type: 'INTEGER',
                nullable: false,
                isPrimaryKey: true,
                defaultValue: null,
            });
            (0, vitest_1.expect)(tableAnalysis.columns[1]).toEqual({
                name: 'name',
                type: 'TEXT',
                nullable: true,
                isPrimaryKey: false,
                defaultValue: "'unknown'",
            });
            // Verify indexes
            (0, vitest_1.expect)(tableAnalysis.indexes).toHaveLength(2);
            (0, vitest_1.expect)(tableAnalysis.indexes[0]).toEqual({
                name: 'pk_users',
                columns: ['id'],
                isUnique: true,
                isPrimaryKey: true,
            });
            // Verify foreign keys
            (0, vitest_1.expect)(tableAnalysis.foreignKeys).toHaveLength(1);
            (0, vitest_1.expect)(tableAnalysis.foreignKeys[0]).toEqual({
                column: 'department_id',
                referencedTable: 'departments',
                referencedColumn: 'id',
                onDelete: 'CASCADE',
                onUpdate: 'RESTRICT',
            });
        });
    });
});
//# sourceMappingURL=AnalyzeSchemaUseCase.test.js.map