"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Column_1 = require("./Column");
(0, vitest_1.describe)('Column', () => {
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create column with valid parameters', () => {
            const column = new Column_1.Column('id', 'INTEGER', true, false, null);
            (0, vitest_1.expect)(column.name).toBe('id');
            (0, vitest_1.expect)(column.type).toBe('INTEGER');
            (0, vitest_1.expect)(column.isPrimaryKey).toBe(true);
            (0, vitest_1.expect)(column.isNullable).toBe(false);
            (0, vitest_1.expect)(column.defaultValue).toBe(null);
        });
        (0, vitest_1.it)('should create column with default parameters', () => {
            const column = new Column_1.Column('name', 'TEXT');
            (0, vitest_1.expect)(column.name).toBe('name');
            (0, vitest_1.expect)(column.type).toBe('TEXT');
            (0, vitest_1.expect)(column.isPrimaryKey).toBe(false);
            (0, vitest_1.expect)(column.isNullable).toBe(true);
            (0, vitest_1.expect)(column.defaultValue).toBe(null);
        });
        (0, vitest_1.it)('should normalize column type to uppercase', () => {
            const column = new Column_1.Column('age', 'integer');
            (0, vitest_1.expect)(column.type).toBe('INTEGER');
        });
        (0, vitest_1.it)('should trim whitespace from column name', () => {
            const column = new Column_1.Column('  name  ', 'TEXT');
            (0, vitest_1.expect)(column.name).toBe('name');
        });
        (0, vitest_1.it)('should throw error for empty column name', () => {
            (0, vitest_1.expect)(() => new Column_1.Column('', 'TEXT')).toThrow('Column name cannot be empty');
        });
        (0, vitest_1.it)('should throw error for whitespace-only column name', () => {
            (0, vitest_1.expect)(() => new Column_1.Column('   ', 'TEXT')).toThrow('Column name cannot be empty');
        });
        (0, vitest_1.it)('should throw error for empty column type', () => {
            (0, vitest_1.expect)(() => new Column_1.Column('name', '')).toThrow('Column type cannot be empty');
        });
        (0, vitest_1.it)('should be immutable (frozen)', () => {
            const column = new Column_1.Column('id', 'INTEGER');
            (0, vitest_1.expect)(Object.isFrozen(column)).toBe(true);
        });
    });
    (0, vitest_1.describe)('isRequired()', () => {
        (0, vitest_1.it)('should return true for NOT NULL column without default', () => {
            const column = new Column_1.Column('id', 'INTEGER', false, false, null);
            (0, vitest_1.expect)(column.isRequired()).toBe(true);
        });
        (0, vitest_1.it)('should return false for nullable column', () => {
            const column = new Column_1.Column('name', 'TEXT', false, true, null);
            (0, vitest_1.expect)(column.isRequired()).toBe(false);
        });
        (0, vitest_1.it)('should return false for column with default value', () => {
            const column = new Column_1.Column('status', 'TEXT', false, false, "'active'");
            (0, vitest_1.expect)(column.isRequired()).toBe(false);
        });
        (0, vitest_1.it)('should return false for nullable column with default', () => {
            const column = new Column_1.Column('count', 'INTEGER', false, true, '0');
            (0, vitest_1.expect)(column.isRequired()).toBe(false);
        });
    });
    (0, vitest_1.describe)('hasDefault()', () => {
        (0, vitest_1.it)('should return true when default value is set', () => {
            const column = new Column_1.Column('status', 'TEXT', false, true, "'active'");
            (0, vitest_1.expect)(column.hasDefault()).toBe(true);
        });
        (0, vitest_1.it)('should return false when default value is null', () => {
            const column = new Column_1.Column('name', 'TEXT', false, true, null);
            (0, vitest_1.expect)(column.hasDefault()).toBe(false);
        });
    });
    (0, vitest_1.describe)('getTypeCategory()', () => {
        (0, vitest_1.it)('should categorize TEXT as text', () => {
            const column = new Column_1.Column('name', 'TEXT');
            (0, vitest_1.expect)(column.getTypeCategory()).toBe('text');
        });
        (0, vitest_1.it)('should categorize VARCHAR as text', () => {
            const column = new Column_1.Column('email', 'VARCHAR(255)');
            (0, vitest_1.expect)(column.getTypeCategory()).toBe('text');
        });
        (0, vitest_1.it)('should categorize CHAR as text', () => {
            const column = new Column_1.Column('code', 'CHAR(10)');
            (0, vitest_1.expect)(column.getTypeCategory()).toBe('text');
        });
        (0, vitest_1.it)('should categorize INTEGER as numeric', () => {
            const column = new Column_1.Column('age', 'INTEGER');
            (0, vitest_1.expect)(column.getTypeCategory()).toBe('numeric');
        });
        (0, vitest_1.it)('should categorize REAL as numeric', () => {
            const column = new Column_1.Column('price', 'REAL');
            (0, vitest_1.expect)(column.getTypeCategory()).toBe('numeric');
        });
        (0, vitest_1.it)('should categorize NUMERIC as numeric', () => {
            const column = new Column_1.Column('amount', 'NUMERIC(10,2)');
            (0, vitest_1.expect)(column.getTypeCategory()).toBe('numeric');
        });
        (0, vitest_1.it)('should categorize BLOB as blob', () => {
            const column = new Column_1.Column('data', 'BLOB');
            (0, vitest_1.expect)(column.getTypeCategory()).toBe('blob');
        });
        (0, vitest_1.it)('should categorize unknown type as unknown', () => {
            const column = new Column_1.Column('custom', 'CUSTOM_TYPE');
            (0, vitest_1.expect)(column.getTypeCategory()).toBe('unknown');
        });
    });
    (0, vitest_1.describe)('semantic properties', () => {
        (0, vitest_1.it)('should preserve primary key semantic', () => {
            const column = new Column_1.Column('id', 'INTEGER', true);
            (0, vitest_1.expect)(column.isPrimaryKey).toBe(true);
        });
        (0, vitest_1.it)('should preserve nullable semantic', () => {
            const column = new Column_1.Column('email', 'TEXT', false, true);
            (0, vitest_1.expect)(column.isNullable).toBe(true);
        });
        (0, vitest_1.it)('should preserve default value semantic', () => {
            const column = new Column_1.Column('created_at', 'TEXT', false, false, 'CURRENT_TIMESTAMP');
            (0, vitest_1.expect)(column.defaultValue).toBe('CURRENT_TIMESTAMP');
        });
    });
});
//# sourceMappingURL=Column.test.js.map