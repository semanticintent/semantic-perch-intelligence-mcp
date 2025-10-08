"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Index_1 = require("./Index");
(0, vitest_1.describe)('Index', () => {
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create index with valid parameters', () => {
            const index = new Index_1.Index('idx_users_email', 'users', ['email'], true);
            (0, vitest_1.expect)(index.name).toBe('idx_users_email');
            (0, vitest_1.expect)(index.tableName).toBe('users');
            (0, vitest_1.expect)(index.columns).toEqual(['email']);
            (0, vitest_1.expect)(index.isUnique).toBe(true);
        });
        (0, vitest_1.it)('should create non-unique index by default', () => {
            const index = new Index_1.Index('idx_posts_user_id', 'posts', ['user_id']);
            (0, vitest_1.expect)(index.isUnique).toBe(false);
        });
        (0, vitest_1.it)('should create composite index with multiple columns', () => {
            const index = new Index_1.Index('idx_posts_user_created', 'posts', ['user_id', 'created_at']);
            (0, vitest_1.expect)(index.columns).toEqual(['user_id', 'created_at']);
            (0, vitest_1.expect)(index.columns.length).toBe(2);
        });
        (0, vitest_1.it)('should trim whitespace from index name', () => {
            const index = new Index_1.Index('  idx_test  ', 'users', ['id']);
            (0, vitest_1.expect)(index.name).toBe('idx_test');
        });
        (0, vitest_1.it)('should trim whitespace from table name', () => {
            const index = new Index_1.Index('idx_test', '  users  ', ['id']);
            (0, vitest_1.expect)(index.tableName).toBe('users');
        });
        (0, vitest_1.it)('should trim whitespace from column names', () => {
            const index = new Index_1.Index('idx_test', 'users', ['  email  ', '  name  ']);
            (0, vitest_1.expect)(index.columns).toEqual(['email', 'name']);
        });
        (0, vitest_1.it)('should throw error for empty index name', () => {
            (0, vitest_1.expect)(() => new Index_1.Index('', 'users', ['id'])).toThrow('Index name cannot be empty');
        });
        (0, vitest_1.it)('should throw error for empty table name', () => {
            (0, vitest_1.expect)(() => new Index_1.Index('idx_test', '', ['id'])).toThrow('Table name cannot be empty');
        });
        (0, vitest_1.it)('should throw error for empty columns array', () => {
            (0, vitest_1.expect)(() => new Index_1.Index('idx_test', 'users', [])).toThrow('Index must have at least one column');
        });
        (0, vitest_1.it)('should throw error for empty column name in array', () => {
            (0, vitest_1.expect)(() => new Index_1.Index('idx_test', 'users', ['id', ''])).toThrow('Index column names cannot be empty');
        });
        (0, vitest_1.it)('should be immutable (frozen)', () => {
            const index = new Index_1.Index('idx_test', 'users', ['id']);
            (0, vitest_1.expect)(Object.isFrozen(index)).toBe(true);
        });
        (0, vitest_1.it)('should have immutable columns array', () => {
            const index = new Index_1.Index('idx_test', 'users', ['id', 'name']);
            (0, vitest_1.expect)(Object.isFrozen(index.columns)).toBe(true);
        });
    });
    (0, vitest_1.describe)('isComposite()', () => {
        (0, vitest_1.it)('should return true for composite index', () => {
            const index = new Index_1.Index('idx_composite', 'users', ['email', 'name']);
            (0, vitest_1.expect)(index.isComposite()).toBe(true);
        });
        (0, vitest_1.it)('should return false for single-column index', () => {
            const index = new Index_1.Index('idx_single', 'users', ['email']);
            (0, vitest_1.expect)(index.isComposite()).toBe(false);
        });
        (0, vitest_1.it)('should return true for three-column index', () => {
            const index = new Index_1.Index('idx_multi', 'posts', ['user_id', 'status', 'created_at']);
            (0, vitest_1.expect)(index.isComposite()).toBe(true);
        });
    });
    (0, vitest_1.describe)('coversColumn()', () => {
        (0, vitest_1.it)('should return true when column is covered', () => {
            const index = new Index_1.Index('idx_test', 'users', ['email', 'name']);
            (0, vitest_1.expect)(index.coversColumn('email')).toBe(true);
            (0, vitest_1.expect)(index.coversColumn('name')).toBe(true);
        });
        (0, vitest_1.it)('should return false when column is not covered', () => {
            const index = new Index_1.Index('idx_test', 'users', ['email']);
            (0, vitest_1.expect)(index.coversColumn('name')).toBe(false);
        });
        (0, vitest_1.it)('should be case-sensitive', () => {
            const index = new Index_1.Index('idx_test', 'users', ['email']);
            (0, vitest_1.expect)(index.coversColumn('EMAIL')).toBe(false);
        });
    });
    (0, vitest_1.describe)('hasColumnAsPrefix()', () => {
        (0, vitest_1.it)('should return true when column is first in index', () => {
            const index = new Index_1.Index('idx_test', 'users', ['email', 'name']);
            (0, vitest_1.expect)(index.hasColumnAsPrefix('email')).toBe(true);
        });
        (0, vitest_1.it)('should return false when column is not first', () => {
            const index = new Index_1.Index('idx_test', 'users', ['email', 'name']);
            (0, vitest_1.expect)(index.hasColumnAsPrefix('name')).toBe(false);
        });
        (0, vitest_1.it)('should return true for single-column index', () => {
            const index = new Index_1.Index('idx_test', 'users', ['email']);
            (0, vitest_1.expect)(index.hasColumnAsPrefix('email')).toBe(true);
        });
        (0, vitest_1.it)('should return false when column not in index', () => {
            const index = new Index_1.Index('idx_test', 'users', ['email']);
            (0, vitest_1.expect)(index.hasColumnAsPrefix('name')).toBe(false);
        });
    });
    (0, vitest_1.describe)('getColumnCount()', () => {
        (0, vitest_1.it)('should return 1 for single-column index', () => {
            const index = new Index_1.Index('idx_test', 'users', ['email']);
            (0, vitest_1.expect)(index.getColumnCount()).toBe(1);
        });
        (0, vitest_1.it)('should return 2 for two-column index', () => {
            const index = new Index_1.Index('idx_test', 'users', ['email', 'name']);
            (0, vitest_1.expect)(index.getColumnCount()).toBe(2);
        });
        (0, vitest_1.it)('should return 3 for three-column index', () => {
            const index = new Index_1.Index('idx_test', 'posts', ['user_id', 'status', 'created_at']);
            (0, vitest_1.expect)(index.getColumnCount()).toBe(3);
        });
    });
    (0, vitest_1.describe)('semantic properties', () => {
        (0, vitest_1.it)('should preserve uniqueness semantic', () => {
            const uniqueIndex = new Index_1.Index('idx_unique', 'users', ['email'], true);
            const regularIndex = new Index_1.Index('idx_regular', 'posts', ['user_id'], false);
            (0, vitest_1.expect)(uniqueIndex.isUnique).toBe(true);
            (0, vitest_1.expect)(regularIndex.isUnique).toBe(false);
        });
        (0, vitest_1.it)('should preserve column order semantic for composite indexes', () => {
            const index = new Index_1.Index('idx_test', 'posts', ['user_id', 'created_at', 'status']);
            (0, vitest_1.expect)(index.columns[0]).toBe('user_id');
            (0, vitest_1.expect)(index.columns[1]).toBe('created_at');
            (0, vitest_1.expect)(index.columns[2]).toBe('status');
        });
    });
});
//# sourceMappingURL=Index.test.js.map