"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const CompareSchemasUseCase_1 = require("../../../src/application/use-cases/CompareSchemasUseCase");
const DatabaseSchema_1 = require("../../../src/domain/entities/DatabaseSchema");
const TableInfo_1 = require("../../../src/domain/entities/TableInfo");
const Column_1 = require("../../../src/domain/entities/Column");
const Environment_1 = require("../../../src/domain/value-objects/Environment");
(0, vitest_1.describe)('CompareSchemasUseCase', () => {
    let useCase;
    let mockRepository;
    (0, vitest_1.beforeEach)(() => {
        mockRepository = {
            fetchDatabaseSchema: vitest_1.vi.fn(),
            executeQuery: vitest_1.vi.fn(),
            listDatabases: vitest_1.vi.fn(),
        };
        useCase = new CompareSchemasUseCase_1.CompareSchemasUseCase(mockRepository);
    });
    const createTestTable = (name, columns) => {
        return new TableInfo_1.TableInfo(name, 'table', columns, [], []);
    };
    const createTestColumn = (name, type, isPrimaryKey = false) => {
        return new Column_1.Column(name, type, isPrimaryKey);
    };
    (0, vitest_1.describe)('execute()', () => {
        (0, vitest_1.it)('should compare two different schemas successfully', async () => {
            const sourceTable = createTestTable('users', [
                createTestColumn('id', 'INTEGER', true),
                createTestColumn('email', 'TEXT'),
                createTestColumn('name', 'TEXT'),
            ]);
            const targetTable = createTestTable('users', [
                createTestColumn('id', 'INTEGER', true),
                createTestColumn('name', 'TEXT'),
            ]); // Missing email column
            const sourceSchema = new DatabaseSchema_1.DatabaseSchema('test-source', Environment_1.Environment.DEVELOPMENT, [sourceTable], new Date());
            const targetSchema = new DatabaseSchema_1.DatabaseSchema('test-target', Environment_1.Environment.PRODUCTION, [targetTable], new Date());
            vitest_1.vi.mocked(mockRepository.fetchDatabaseSchema)
                .mockResolvedValueOnce(sourceSchema)
                .mockResolvedValueOnce(targetSchema);
            const output = await useCase.execute({
                sourceDatabaseId: 'db1',
                sourceEnvironment: 'development',
                targetDatabaseId: 'db2',
                targetEnvironment: 'production',
            });
            (0, vitest_1.expect)(output.result).toBeDefined();
            (0, vitest_1.expect)(output.result.isIdentical()).toBe(false);
            (0, vitest_1.expect)(output.result.summary.missingColumns).toBe(1);
            (0, vitest_1.expect)(output.sourceTableCount).toBe(1);
            (0, vitest_1.expect)(output.targetTableCount).toBe(1);
            (0, vitest_1.expect)(output.executionTimeMs).toBeGreaterThanOrEqual(0);
        });
        (0, vitest_1.it)('should detect identical schemas', async () => {
            const table = createTestTable('users', [createTestColumn('id', 'INTEGER', true)]);
            const schema = new DatabaseSchema_1.DatabaseSchema('test-db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            vitest_1.vi.mocked(mockRepository.fetchDatabaseSchema).mockResolvedValue(schema);
            const output = await useCase.execute({
                sourceDatabaseId: 'db1',
                sourceEnvironment: 'development',
                targetDatabaseId: 'db2',
                targetEnvironment: 'production',
            });
            (0, vitest_1.expect)(output.result.isIdentical()).toBe(true);
            (0, vitest_1.expect)(output.result.summary.totalDifferences).toBe(0);
        });
        (0, vitest_1.it)('should throw error when comparing database with itself', async () => {
            await (0, vitest_1.expect)(useCase.execute({
                sourceDatabaseId: 'db1',
                sourceEnvironment: 'development',
                targetDatabaseId: 'db1',
                targetEnvironment: 'production',
            })).rejects.toThrow('Cannot compare a database with itself');
        });
        (0, vitest_1.it)('should fetch schemas from correct databases', async () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('test-db', Environment_1.Environment.DEVELOPMENT, [createTestTable('test', [createTestColumn('id', 'INTEGER', true)])], new Date());
            vitest_1.vi.mocked(mockRepository.fetchDatabaseSchema).mockResolvedValue(schema);
            await useCase.execute({
                sourceDatabaseId: 'source-db',
                sourceEnvironment: 'development',
                targetDatabaseId: 'target-db',
                targetEnvironment: 'production',
            });
            (0, vitest_1.expect)(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('source-db');
            (0, vitest_1.expect)(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('target-db');
            (0, vitest_1.expect)(mockRepository.fetchDatabaseSchema).toHaveBeenCalledTimes(2);
        });
        (0, vitest_1.it)('should detect missing tables', async () => {
            const sourceSchema = new DatabaseSchema_1.DatabaseSchema('test-source', Environment_1.Environment.DEVELOPMENT, [
                createTestTable('users', [createTestColumn('id', 'INTEGER', true)]),
                createTestTable('orders', [createTestColumn('id', 'INTEGER', true)]),
            ], new Date());
            const targetSchema = new DatabaseSchema_1.DatabaseSchema('test-target', Environment_1.Environment.PRODUCTION, [createTestTable('users', [createTestColumn('id', 'INTEGER', true)])], new Date());
            vitest_1.vi.mocked(mockRepository.fetchDatabaseSchema)
                .mockResolvedValueOnce(sourceSchema)
                .mockResolvedValueOnce(targetSchema);
            const output = await useCase.execute({
                sourceDatabaseId: 'db1',
                sourceEnvironment: 'development',
                targetDatabaseId: 'db2',
                targetEnvironment: 'production',
            });
            (0, vitest_1.expect)(output.result.summary.missingTables).toBe(1);
            (0, vitest_1.expect)(output.sourceTableCount).toBe(2);
            (0, vitest_1.expect)(output.targetTableCount).toBe(1);
        });
        (0, vitest_1.it)('should measure execution time', async () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('test-db', Environment_1.Environment.DEVELOPMENT, [createTestTable('test', [createTestColumn('id', 'INTEGER', true)])], new Date());
            vitest_1.vi.mocked(mockRepository.fetchDatabaseSchema).mockResolvedValue(schema);
            const output = await useCase.execute({
                sourceDatabaseId: 'db1',
                sourceEnvironment: 'development',
                targetDatabaseId: 'db2',
                targetEnvironment: 'production',
            });
            (0, vitest_1.expect)(output.executionTimeMs).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(typeof output.executionTimeMs).toBe('number');
        });
        (0, vitest_1.it)('should pass environment information to comparator', async () => {
            const table = createTestTable('users', [
                createTestColumn('id', 'INTEGER', true),
                createTestColumn('email', 'TEXT'),
            ]);
            const sourceSchema = new DatabaseSchema_1.DatabaseSchema('test-source', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            const targetSchema = new DatabaseSchema_1.DatabaseSchema('test-target', Environment_1.Environment.PRODUCTION, [createTestTable('users', [createTestColumn('id', 'INTEGER', true)])], new Date());
            vitest_1.vi.mocked(mockRepository.fetchDatabaseSchema)
                .mockResolvedValueOnce(sourceSchema)
                .mockResolvedValueOnce(targetSchema);
            const output = await useCase.execute({
                sourceDatabaseId: 'db1',
                sourceEnvironment: 'development',
                targetDatabaseId: 'db2',
                targetEnvironment: 'production',
            });
            // Verify ICE scoring reflects environment criticality
            const difference = output.result.differences[0];
            (0, vitest_1.expect)(difference.sourceEnvironment).toBe('development');
            (0, vitest_1.expect)(difference.targetEnvironment).toBe('production');
            (0, vitest_1.expect)(difference.iceScore.context).toBeGreaterThan(5); // Production target = high context
        });
        (0, vitest_1.it)('should handle complex multi-table comparison', async () => {
            const sourceSchema = new DatabaseSchema_1.DatabaseSchema('test-source', Environment_1.Environment.STAGING, [
                createTestTable('users', [
                    createTestColumn('id', 'INTEGER', true),
                    createTestColumn('email', 'TEXT'),
                    createTestColumn('name', 'TEXT'),
                ]),
                createTestTable('orders', [createTestColumn('id', 'INTEGER', true), createTestColumn('total', 'REAL')]),
                createTestTable('products', [createTestColumn('id', 'INTEGER', true)]),
            ], new Date());
            const targetSchema = new DatabaseSchema_1.DatabaseSchema('test-target', Environment_1.Environment.PRODUCTION, [
                createTestTable('users', [createTestColumn('id', 'INTEGER', true), createTestColumn('name', 'TEXT')]), // Missing email
                createTestTable('orders', [createTestColumn('id', 'INTEGER', true), createTestColumn('total', 'INTEGER')]), // Type mismatch
                // Missing products table
            ], new Date());
            vitest_1.vi.mocked(mockRepository.fetchDatabaseSchema)
                .mockResolvedValueOnce(sourceSchema)
                .mockResolvedValueOnce(targetSchema);
            const output = await useCase.execute({
                sourceDatabaseId: 'db1',
                sourceEnvironment: 'staging',
                targetDatabaseId: 'db2',
                targetEnvironment: 'production',
            });
            (0, vitest_1.expect)(output.result.summary.missingTables).toBe(1); // products
            (0, vitest_1.expect)(output.result.summary.missingColumns).toBe(1); // email
            (0, vitest_1.expect)(output.result.summary.typeMismatches).toBe(1); // total: REAL vs INTEGER
            (0, vitest_1.expect)(output.result.summary.totalDifferences).toBe(3);
        });
        (0, vitest_1.it)('should propagate repository errors', async () => {
            vitest_1.vi.mocked(mockRepository.fetchDatabaseSchema).mockRejectedValue(new Error('Network error'));
            await (0, vitest_1.expect)(useCase.execute({
                sourceDatabaseId: 'db1',
                sourceEnvironment: 'development',
                targetDatabaseId: 'db2',
                targetEnvironment: 'production',
            })).rejects.toThrow('Network error');
        });
    });
});
//# sourceMappingURL=CompareSchemasUseCase.test.js.map