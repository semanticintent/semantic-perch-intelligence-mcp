"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Column_1 = require("./Column");
const ForeignKey_1 = require("./ForeignKey");
const Index_1 = require("./Index");
const TableInfo_1 = require("./TableInfo");
(0, vitest_1.describe)('TableInfo', () => {
    const createTestTable = () => {
        const columns = [
            new Column_1.Column('id', 'INTEGER', true, false),
            new Column_1.Column('name', 'TEXT', false, false),
            new Column_1.Column('email', 'TEXT', false, true),
        ];
        const indexes = [new Index_1.Index('idx_email', 'users', ['email'], true)];
        const foreignKeys = [];
        return new TableInfo_1.TableInfo('users', 'table', columns, indexes, foreignKeys);
    };
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create table with all metadata', () => {
            const table = createTestTable();
            (0, vitest_1.expect)(table.name).toBe('users');
            (0, vitest_1.expect)(table.type).toBe('table');
            (0, vitest_1.expect)(table.columns.length).toBe(3);
            (0, vitest_1.expect)(table.indexes.length).toBe(1);
            (0, vitest_1.expect)(table.foreignKeys.length).toBe(0);
        });
        (0, vitest_1.it)('should create table without indexes and foreign keys', () => {
            const columns = [new Column_1.Column('id', 'INTEGER', true)];
            const table = new TableInfo_1.TableInfo('simple', 'table', columns);
            (0, vitest_1.expect)(table.indexes.length).toBe(0);
            (0, vitest_1.expect)(table.foreignKeys.length).toBe(0);
        });
        (0, vitest_1.it)('should create view type', () => {
            const columns = [new Column_1.Column('id', 'INTEGER')];
            const table = new TableInfo_1.TableInfo('user_view', 'view', columns);
            (0, vitest_1.expect)(table.type).toBe('view');
            (0, vitest_1.expect)(table.isView()).toBe(true);
        });
        (0, vitest_1.it)('should throw error for empty table name', () => {
            const columns = [new Column_1.Column('id', 'INTEGER')];
            (0, vitest_1.expect)(() => new TableInfo_1.TableInfo('', 'table', columns)).toThrow('Table name cannot be empty');
        });
        (0, vitest_1.it)('should throw error for empty columns array', () => {
            (0, vitest_1.expect)(() => new TableInfo_1.TableInfo('users', 'table', [])).toThrow('Table must have at least one column');
        });
        (0, vitest_1.it)('should be immutable', () => {
            const table = createTestTable();
            (0, vitest_1.expect)(Object.isFrozen(table)).toBe(true);
            (0, vitest_1.expect)(Object.isFrozen(table.columns)).toBe(true);
            (0, vitest_1.expect)(Object.isFrozen(table.indexes)).toBe(true);
            (0, vitest_1.expect)(Object.isFrozen(table.foreignKeys)).toBe(true);
        });
    });
    (0, vitest_1.describe)('hasPrimaryKey()', () => {
        (0, vitest_1.it)('should return true when table has primary key', () => {
            const table = createTestTable();
            (0, vitest_1.expect)(table.hasPrimaryKey()).toBe(true);
        });
        (0, vitest_1.it)('should return false when table has no primary key', () => {
            const columns = [new Column_1.Column('name', 'TEXT')];
            const table = new TableInfo_1.TableInfo('users', 'table', columns);
            (0, vitest_1.expect)(table.hasPrimaryKey()).toBe(false);
        });
    });
    (0, vitest_1.describe)('getPrimaryKeyColumns()', () => {
        (0, vitest_1.it)('should return primary key columns', () => {
            const table = createTestTable();
            const pkColumns = table.getPrimaryKeyColumns();
            (0, vitest_1.expect)(pkColumns.length).toBe(1);
            (0, vitest_1.expect)(pkColumns[0].name).toBe('id');
        });
        (0, vitest_1.it)('should return empty array when no primary key', () => {
            const columns = [new Column_1.Column('name', 'TEXT')];
            const table = new TableInfo_1.TableInfo('users', 'table', columns);
            (0, vitest_1.expect)(table.getPrimaryKeyColumns()).toEqual([]);
        });
        (0, vitest_1.it)('should return multiple columns for composite primary key', () => {
            const columns = [
                new Column_1.Column('user_id', 'INTEGER', true),
                new Column_1.Column('role_id', 'INTEGER', true),
                new Column_1.Column('name', 'TEXT'),
            ];
            const table = new TableInfo_1.TableInfo('user_roles', 'table', columns);
            const pkColumns = table.getPrimaryKeyColumns();
            (0, vitest_1.expect)(pkColumns.length).toBe(2);
            (0, vitest_1.expect)(pkColumns[0].name).toBe('user_id');
            (0, vitest_1.expect)(pkColumns[1].name).toBe('role_id');
        });
    });
    (0, vitest_1.describe)('hasForeignKeys()', () => {
        (0, vitest_1.it)('should return true when table has foreign keys', () => {
            const columns = [new Column_1.Column('id', 'INTEGER'), new Column_1.Column('user_id', 'INTEGER')];
            const foreignKeys = [new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id')];
            const table = new TableInfo_1.TableInfo('posts', 'table', columns, [], foreignKeys);
            (0, vitest_1.expect)(table.hasForeignKeys()).toBe(true);
        });
        (0, vitest_1.it)('should return false when table has no foreign keys', () => {
            const table = createTestTable();
            (0, vitest_1.expect)(table.hasForeignKeys()).toBe(false);
        });
    });
    (0, vitest_1.describe)('hasIndexOnColumn()', () => {
        (0, vitest_1.it)('should return true when column is indexed', () => {
            const table = createTestTable();
            (0, vitest_1.expect)(table.hasIndexOnColumn('email')).toBe(true);
        });
        (0, vitest_1.it)('should return false when column is not indexed', () => {
            const table = createTestTable();
            (0, vitest_1.expect)(table.hasIndexOnColumn('name')).toBe(false);
        });
    });
    (0, vitest_1.describe)('getColumn()', () => {
        (0, vitest_1.it)('should return column by name', () => {
            const table = createTestTable();
            const column = table.getColumn('email');
            (0, vitest_1.expect)(column).toBeDefined();
            (0, vitest_1.expect)(column?.name).toBe('email');
        });
        (0, vitest_1.it)('should return undefined for non-existent column', () => {
            const table = createTestTable();
            (0, vitest_1.expect)(table.getColumn('nonexistent')).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('getForeignKeyColumns()', () => {
        (0, vitest_1.it)('should return foreign key column names', () => {
            const columns = [new Column_1.Column('id', 'INTEGER'), new Column_1.Column('user_id', 'INTEGER')];
            const foreignKeys = [
                new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id'),
                new ForeignKey_1.ForeignKey('posts', 'user_id', 'accounts', 'user_id'),
            ];
            const table = new TableInfo_1.TableInfo('posts', 'table', columns, [], foreignKeys);
            (0, vitest_1.expect)(table.getForeignKeyColumns()).toEqual(['user_id']);
        });
        (0, vitest_1.it)('should return empty array when no foreign keys', () => {
            const table = createTestTable();
            (0, vitest_1.expect)(table.getForeignKeyColumns()).toEqual([]);
        });
    });
    (0, vitest_1.describe)('isView()', () => {
        (0, vitest_1.it)('should return true for view', () => {
            const columns = [new Column_1.Column('id', 'INTEGER')];
            const table = new TableInfo_1.TableInfo('user_view', 'view', columns);
            (0, vitest_1.expect)(table.isView()).toBe(true);
        });
        (0, vitest_1.it)('should return false for table', () => {
            const table = createTestTable();
            (0, vitest_1.expect)(table.isView()).toBe(false);
        });
    });
    (0, vitest_1.describe)('getRequiredColumns()', () => {
        (0, vitest_1.it)('should return required columns', () => {
            const table = createTestTable();
            const required = table.getRequiredColumns();
            (0, vitest_1.expect)(required.length).toBe(2); // id and name (NOT NULL, no default)
            (0, vitest_1.expect)(required[0].name).toBe('id');
            (0, vitest_1.expect)(required[1].name).toBe('name');
        });
        (0, vitest_1.it)('should return empty array when no required columns', () => {
            const columns = [new Column_1.Column('name', 'TEXT', false, true)];
            const table = new TableInfo_1.TableInfo('users', 'table', columns);
            (0, vitest_1.expect)(table.getRequiredColumns()).toEqual([]);
        });
    });
    (0, vitest_1.describe)('getColumnCount()', () => {
        (0, vitest_1.it)('should return column count', () => {
            const table = createTestTable();
            (0, vitest_1.expect)(table.getColumnCount()).toBe(3);
        });
    });
    (0, vitest_1.describe)('getIndexCount()', () => {
        (0, vitest_1.it)('should return index count', () => {
            const table = createTestTable();
            (0, vitest_1.expect)(table.getIndexCount()).toBe(1);
        });
    });
    (0, vitest_1.describe)('getForeignKeyCount()', () => {
        (0, vitest_1.it)('should return foreign key count', () => {
            const columns = [new Column_1.Column('id', 'INTEGER'), new Column_1.Column('user_id', 'INTEGER')];
            const foreignKeys = [new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id')];
            const table = new TableInfo_1.TableInfo('posts', 'table', columns, [], foreignKeys);
            (0, vitest_1.expect)(table.getForeignKeyCount()).toBe(1);
        });
    });
    (0, vitest_1.describe)('getReferencedTables()', () => {
        (0, vitest_1.it)('should return referenced table names', () => {
            const columns = [
                new Column_1.Column('id', 'INTEGER'),
                new Column_1.Column('user_id', 'INTEGER'),
                new Column_1.Column('category_id', 'INTEGER'),
            ];
            const foreignKeys = [
                new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id'),
                new ForeignKey_1.ForeignKey('posts', 'category_id', 'categories', 'id'),
            ];
            const table = new TableInfo_1.TableInfo('posts', 'table', columns, [], foreignKeys);
            (0, vitest_1.expect)(table.getReferencedTables()).toEqual(['users', 'categories']);
        });
        (0, vitest_1.it)('should return unique table names', () => {
            const columns = [new Column_1.Column('id', 'INTEGER'), new Column_1.Column('user_id', 'INTEGER')];
            const foreignKeys = [
                new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id'),
                new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'account_id'),
            ];
            const table = new TableInfo_1.TableInfo('posts', 'table', columns, [], foreignKeys);
            (0, vitest_1.expect)(table.getReferencedTables()).toEqual(['users']);
        });
    });
});
//# sourceMappingURL=TableInfo.test.js.map