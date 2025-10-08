"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ValidateSchemaUseCase_1 = require("./ValidateSchemaUseCase");
const SchemaAnalyzer_1 = require("../../domain/services/SchemaAnalyzer");
const DatabaseConfig_1 = require("../../infrastructure/config/DatabaseConfig");
const Environment_1 = require("../../domain/value-objects/Environment");
const DatabaseSchema_1 = require("../../domain/entities/DatabaseSchema");
const TableInfo_1 = require("../../domain/entities/TableInfo");
const Column_1 = require("../../domain/entities/Column");
const ForeignKey_1 = require("../../domain/entities/ForeignKey");
(0, vitest_1.describe)('ValidateSchemaUseCase', () => {
    let useCase;
    let mockRepository;
    let mockCache;
    let schemaAnalyzer;
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
        // Real schema analyzer
        schemaAnalyzer = new SchemaAnalyzer_1.SchemaAnalyzer();
        // Mock database config
        const databases = new Map();
        databases.set(Environment_1.Environment.DEVELOPMENT, { name: 'dev_db', id: 'dev-123' });
        databases.set(Environment_1.Environment.PRODUCTION, { name: 'prod_db', id: 'prod-789' });
        mockDatabaseConfig = new DatabaseConfig_1.DatabaseConfig(databases);
        useCase = new ValidateSchemaUseCase_1.ValidateSchemaUseCase(mockRepository, schemaAnalyzer, mockDatabaseConfig, mockCache);
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create use case and freeze instance', () => {
            (0, vitest_1.expect)(Object.isFrozen(useCase)).toBe(true);
        });
    });
    (0, vitest_1.describe)('execute()', () => {
        (0, vitest_1.it)('should validate schema with no issues', async () => {
            mockCache.get.mockResolvedValue(undefined);
            // Create valid schema
            const columns = [new Column_1.Column('id', 'INTEGER', true, false, null)];
            const table = new TableInfo_1.TableInfo('users', 'table', columns, [], []);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            (0, vitest_1.expect)(result.isValid).toBe(true);
            (0, vitest_1.expect)(result.errorCount).toBe(0);
            (0, vitest_1.expect)(result.warningCount).toBe(0);
            (0, vitest_1.expect)(result.infoCount).toBe(1); // No indexes info
            (0, vitest_1.expect)(result.issues).toHaveLength(1);
            (0, vitest_1.expect)(result.issues[0].category).toBe('No Indexes');
        });
        (0, vitest_1.it)('should detect table without primary key', async () => {
            mockCache.get.mockResolvedValue(undefined);
            // Table with no primary key
            const columns = [new Column_1.Column('name', 'TEXT', false, false, null)];
            const table = new TableInfo_1.TableInfo('users', 'table', columns, [], []);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            (0, vitest_1.expect)(result.isValid).toBe(true); // No errors, just warnings
            (0, vitest_1.expect)(result.warningCount).toBe(1);
            const pkIssue = result.issues.find((i) => i.category === 'Missing Primary Key');
            (0, vitest_1.expect)(pkIssue).toBeDefined();
            (0, vitest_1.expect)(pkIssue?.severity).toBe(ValidateSchemaUseCase_1.ValidationSeverity.WARNING);
            (0, vitest_1.expect)(pkIssue?.table).toBe('users');
        });
        (0, vitest_1.it)('should detect orphaned foreign key', async () => {
            mockCache.get.mockResolvedValue(undefined);
            // Foreign key references non-existent table
            const columns = [
                new Column_1.Column('id', 'INTEGER', true, false, null),
                new Column_1.Column('user_id', 'INTEGER', false, false, null),
            ];
            const foreignKeys = [new ForeignKey_1.ForeignKey('orders', 'user_id', 'users', 'id', 'CASCADE', null)];
            const table = new TableInfo_1.TableInfo('orders', 'table', columns, [], foreignKeys);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [table], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            (0, vitest_1.expect)(result.isValid).toBe(false); // Has errors
            (0, vitest_1.expect)(result.errorCount).toBe(1);
            const fkIssue = result.issues.find((i) => i.category === 'Orphaned Foreign Key');
            (0, vitest_1.expect)(fkIssue).toBeDefined();
            (0, vitest_1.expect)(fkIssue?.severity).toBe(ValidateSchemaUseCase_1.ValidationSeverity.ERROR);
            (0, vitest_1.expect)(fkIssue?.table).toBe('orders');
            (0, vitest_1.expect)(fkIssue?.column).toBe('user_id');
        });
        (0, vitest_1.it)('should detect invalid foreign key column reference', async () => {
            mockCache.get.mockResolvedValue(undefined);
            // Foreign key references non-existent column
            const usersColumns = [new Column_1.Column('id', 'INTEGER', true, false, null)];
            const usersTable = new TableInfo_1.TableInfo('users', 'table', usersColumns, [], []);
            const ordersColumns = [
                new Column_1.Column('id', 'INTEGER', true, false, null),
                new Column_1.Column('user_id', 'INTEGER', false, false, null),
            ];
            const foreignKeys = [
                new ForeignKey_1.ForeignKey('orders', 'user_id', 'users', 'nonexistent_id', 'CASCADE', null),
            ];
            const ordersTable = new TableInfo_1.TableInfo('orders', 'table', ordersColumns, [], foreignKeys);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [usersTable, ordersTable], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            (0, vitest_1.expect)(result.isValid).toBe(false);
            (0, vitest_1.expect)(result.errorCount).toBe(1);
            const fkIssue = result.issues.find((i) => i.category === 'Invalid Foreign Key');
            (0, vitest_1.expect)(fkIssue).toBeDefined();
            (0, vitest_1.expect)(fkIssue?.severity).toBe(ValidateSchemaUseCase_1.ValidationSeverity.ERROR);
            (0, vitest_1.expect)(fkIssue?.table).toBe('orders');
            (0, vitest_1.expect)(fkIssue?.details?.referencedColumn).toBe('nonexistent_id');
        });
        (0, vitest_1.it)('should detect nullable foreign key without SET NULL', async () => {
            mockCache.get.mockResolvedValue(undefined);
            const usersColumns = [new Column_1.Column('id', 'INTEGER', true, false, null)];
            const usersTable = new TableInfo_1.TableInfo('users', 'table', usersColumns, [], []);
            const ordersColumns = [
                new Column_1.Column('id', 'INTEGER', true, false, null),
                new Column_1.Column('user_id', 'INTEGER', false, true, null), // Nullable
            ];
            const foreignKeys = [new ForeignKey_1.ForeignKey('orders', 'user_id', 'users', 'id', 'CASCADE', null)];
            const ordersTable = new TableInfo_1.TableInfo('orders', 'table', ordersColumns, [], foreignKeys);
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [usersTable, ordersTable], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            (0, vitest_1.expect)(result.isValid).toBe(true); // Warning, not error
            (0, vitest_1.expect)(result.warningCount).toBeGreaterThan(0);
            const fkIssue = result.issues.find((i) => i.category === 'Nullable Foreign Key');
            (0, vitest_1.expect)(fkIssue).toBeDefined();
            (0, vitest_1.expect)(fkIssue?.severity).toBe(ValidateSchemaUseCase_1.ValidationSeverity.WARNING);
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
        (0, vitest_1.it)('should count issues by severity correctly', async () => {
            mockCache.get.mockResolvedValue(undefined);
            // Create schema with multiple issues
            const usersColumns = [
                new Column_1.Column('id', 'INTEGER', true, false, null),
                new Column_1.Column('name', 'TEXT', false, true, null),
            ];
            const usersTable = new TableInfo_1.TableInfo('users', 'table', usersColumns, [], []);
            const ordersColumns = [
                new Column_1.Column('id', 'INTEGER', true, false, null),
                new Column_1.Column('user_id', 'INTEGER', false, true, null), // Nullable FK
            ];
            const foreignKeys = [
                new ForeignKey_1.ForeignKey('orders', 'user_id', 'nonexistent', 'id', 'CASCADE', null), // Orphaned FK
            ];
            const ordersTable = new TableInfo_1.TableInfo('orders', 'table', ordersColumns, [], foreignKeys);
            const noPkColumns = [new Column_1.Column('value', 'TEXT', false, false, null)];
            const noPkTable = new TableInfo_1.TableInfo('settings', 'table', noPkColumns, [], []); // No primary key
            const schema = new DatabaseSchema_1.DatabaseSchema('dev_db', Environment_1.Environment.DEVELOPMENT, [usersTable, ordersTable, noPkTable], new Date());
            mockRepository.fetchDatabaseSchema.mockResolvedValue(schema);
            const result = await useCase.execute({
                environment: Environment_1.Environment.DEVELOPMENT,
            });
            (0, vitest_1.expect)(result.isValid).toBe(false); // Has errors
            (0, vitest_1.expect)(result.errorCount).toBe(1); // Orphaned FK
            (0, vitest_1.expect)(result.warningCount).toBeGreaterThan(0); // No PK warnings
            (0, vitest_1.expect)(result.infoCount).toBeGreaterThan(0); // No indexes info
        });
    });
});
//# sourceMappingURL=ValidateSchemaUseCase.test.js.map