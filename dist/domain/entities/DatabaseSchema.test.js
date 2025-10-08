"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Environment_1 = require("../value-objects/Environment");
const Column_1 = require("./Column");
const ForeignKey_1 = require("./ForeignKey");
const DatabaseSchema_1 = require("./DatabaseSchema");
const TableInfo_1 = require("./TableInfo");
(0, vitest_1.describe)('DatabaseSchema', () => {
    let testDate;
    let usersTable;
    let postsTable;
    (0, vitest_1.beforeEach)(() => {
        testDate = new Date('2025-01-01T12:00:00Z');
        usersTable = new TableInfo_1.TableInfo('users', 'table', [new Column_1.Column('id', 'INTEGER', true), new Column_1.Column('name', 'TEXT')]);
        postsTable = new TableInfo_1.TableInfo('posts', 'table', [
            new Column_1.Column('id', 'INTEGER', true),
            new Column_1.Column('user_id', 'INTEGER'),
            new Column_1.Column('title', 'TEXT'),
        ], [], [new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id', 'CASCADE')]);
    });
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create schema with all properties', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('my_database', Environment_1.Environment.DEVELOPMENT, [usersTable, postsTable], testDate);
            (0, vitest_1.expect)(schema.name).toBe('my_database');
            (0, vitest_1.expect)(schema.environment).toBe(Environment_1.Environment.DEVELOPMENT);
            (0, vitest_1.expect)(schema.tables.length).toBe(2);
            (0, vitest_1.expect)(schema.fetchedAt).toBe(testDate);
        });
        (0, vitest_1.it)('should trim database name', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('  my_database  ', Environment_1.Environment.PRODUCTION, [usersTable], testDate);
            (0, vitest_1.expect)(schema.name).toBe('my_database');
        });
        (0, vitest_1.it)('should throw error for empty database name', () => {
            (0, vitest_1.expect)(() => new DatabaseSchema_1.DatabaseSchema('', Environment_1.Environment.DEVELOPMENT, [usersTable], testDate)).toThrow('Database name cannot be empty');
        });
        (0, vitest_1.it)('should throw error for empty tables array', () => {
            (0, vitest_1.expect)(() => new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [], testDate)).toThrow('Database must have at least one table');
        });
        (0, vitest_1.it)('should be immutable', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable], testDate);
            (0, vitest_1.expect)(Object.isFrozen(schema)).toBe(true);
            (0, vitest_1.expect)(Object.isFrozen(schema.tables)).toBe(true);
        });
    });
    (0, vitest_1.describe)('getTable()', () => {
        (0, vitest_1.it)('should return table by name', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable], testDate);
            const table = schema.getTable('users');
            (0, vitest_1.expect)(table).toBeDefined();
            (0, vitest_1.expect)(table?.name).toBe('users');
        });
        (0, vitest_1.it)('should return undefined for non-existent table', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable], testDate);
            (0, vitest_1.expect)(schema.getTable('nonexistent')).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('getTablesThatReference()', () => {
        (0, vitest_1.it)('should return tables that reference specified table', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable, postsTable], testDate);
            const referencingTables = schema.getTablesThatReference('users');
            (0, vitest_1.expect)(referencingTables.length).toBe(1);
            (0, vitest_1.expect)(referencingTables[0].name).toBe('posts');
        });
        (0, vitest_1.it)('should return empty array when no tables reference specified table', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable], testDate);
            const referencingTables = schema.getTablesThatReference('users');
            (0, vitest_1.expect)(referencingTables).toEqual([]);
        });
    });
    (0, vitest_1.describe)('getTablesReferencedBy()', () => {
        (0, vitest_1.it)('should return tables referenced by specified table', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable, postsTable], testDate);
            const referenced = schema.getTablesReferencedBy('posts');
            (0, vitest_1.expect)(referenced).toEqual(['users']);
        });
        (0, vitest_1.it)('should return empty array when table has no references', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable, postsTable], testDate);
            const referenced = schema.getTablesReferencedBy('users');
            (0, vitest_1.expect)(referenced).toEqual([]);
        });
        (0, vitest_1.it)('should return empty array for non-existent table', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable], testDate);
            const referenced = schema.getTablesReferencedBy('nonexistent');
            (0, vitest_1.expect)(referenced).toEqual([]);
        });
    });
    (0, vitest_1.describe)('getTableCount()', () => {
        (0, vitest_1.it)('should return table count', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable, postsTable], testDate);
            (0, vitest_1.expect)(schema.getTableCount()).toBe(2);
        });
    });
    (0, vitest_1.describe)('getTablesWithoutPrimaryKey()', () => {
        (0, vitest_1.it)('should return tables without primary keys', () => {
            const noPkTable = new TableInfo_1.TableInfo('logs', 'table', [new Column_1.Column('message', 'TEXT')]);
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable, noPkTable], testDate);
            const tables = schema.getTablesWithoutPrimaryKey();
            (0, vitest_1.expect)(tables.length).toBe(1);
            (0, vitest_1.expect)(tables[0].name).toBe('logs');
        });
        (0, vitest_1.it)('should return empty array when all tables have primary keys', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable], testDate);
            (0, vitest_1.expect)(schema.getTablesWithoutPrimaryKey()).toEqual([]);
        });
    });
    (0, vitest_1.describe)('getTablesWithForeignKeys()', () => {
        (0, vitest_1.it)('should return tables with foreign keys', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable, postsTable], testDate);
            const tables = schema.getTablesWithForeignKeys();
            (0, vitest_1.expect)(tables.length).toBe(1);
            (0, vitest_1.expect)(tables[0].name).toBe('posts');
        });
        (0, vitest_1.it)('should return empty array when no tables have foreign keys', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable], testDate);
            (0, vitest_1.expect)(schema.getTablesWithForeignKeys()).toEqual([]);
        });
    });
    (0, vitest_1.describe)('getViews()', () => {
        (0, vitest_1.it)('should return all views', () => {
            const view = new TableInfo_1.TableInfo('user_view', 'view', [new Column_1.Column('id', 'INTEGER')]);
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable, view], testDate);
            const views = schema.getViews();
            (0, vitest_1.expect)(views.length).toBe(1);
            (0, vitest_1.expect)(views[0].name).toBe('user_view');
        });
        (0, vitest_1.it)('should return empty array when no views', () => {
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable], testDate);
            (0, vitest_1.expect)(schema.getViews()).toEqual([]);
        });
    });
    (0, vitest_1.describe)('getBaseTables()', () => {
        (0, vitest_1.it)('should return all base tables (non-views)', () => {
            const view = new TableInfo_1.TableInfo('user_view', 'view', [new Column_1.Column('id', 'INTEGER')]);
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable, view], testDate);
            const tables = schema.getBaseTables();
            (0, vitest_1.expect)(tables.length).toBe(1);
            (0, vitest_1.expect)(tables[0].name).toBe('users');
        });
    });
    (0, vitest_1.describe)('isFresh()', () => {
        (0, vitest_1.it)('should return true for freshly fetched schema', () => {
            const now = new Date();
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable], now);
            (0, vitest_1.expect)(schema.isFresh(10)).toBe(true);
        });
        (0, vitest_1.it)('should return false for stale schema', () => {
            const old = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable], old);
            (0, vitest_1.expect)(schema.isFresh(10)).toBe(false);
        });
        (0, vitest_1.it)('should use 10 minutes as default freshness threshold', () => {
            const old = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable], old);
            (0, vitest_1.expect)(schema.isFresh()).toBe(false);
        });
    });
    (0, vitest_1.describe)('getAgeInMinutes()', () => {
        (0, vitest_1.it)('should return age in minutes', () => {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const schema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable], tenMinutesAgo);
            const age = schema.getAgeInMinutes();
            (0, vitest_1.expect)(age).toBeGreaterThanOrEqual(9.9);
            (0, vitest_1.expect)(age).toBeLessThanOrEqual(10.1);
        });
    });
    (0, vitest_1.describe)('semantic intent preservation', () => {
        (0, vitest_1.it)('should preserve environment semantic', () => {
            const prodSchema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.PRODUCTION, [usersTable], testDate);
            const devSchema = new DatabaseSchema_1.DatabaseSchema('db', Environment_1.Environment.DEVELOPMENT, [usersTable], testDate);
            (0, vitest_1.expect)(prodSchema.environment).toBe(Environment_1.Environment.PRODUCTION);
            (0, vitest_1.expect)(devSchema.environment).toBe(Environment_1.Environment.DEVELOPMENT);
        });
    });
});
//# sourceMappingURL=DatabaseSchema.test.js.map