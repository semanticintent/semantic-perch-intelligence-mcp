"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Optimization_1 = require("./Optimization");
(0, vitest_1.describe)('Optimization', () => {
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create optimization with all parameters', () => {
            const opt = new Optimization_1.Optimization('missing_index', 'posts', 'Foreign key without index', 'CREATE INDEX idx_posts_user_id ON posts(user_id)', 'high', 'user_id');
            (0, vitest_1.expect)(opt.type).toBe('missing_index');
            (0, vitest_1.expect)(opt.table).toBe('posts');
            (0, vitest_1.expect)(opt.column).toBe('user_id');
            (0, vitest_1.expect)(opt.reason).toBe('Foreign key without index');
            (0, vitest_1.expect)(opt.suggestion).toContain('CREATE INDEX');
            (0, vitest_1.expect)(opt.priority).toBe('high');
        });
        (0, vitest_1.it)('should create optimization without column', () => {
            const opt = new Optimization_1.Optimization('missing_primary_key', 'users', 'Table without primary key', 'ALTER TABLE users ADD PRIMARY KEY (id)', 'high');
            (0, vitest_1.expect)(opt.column).toBe(null);
        });
        (0, vitest_1.it)('should throw error for empty table', () => {
            (0, vitest_1.expect)(() => new Optimization_1.Optimization('missing_index', '', 'reason', 'suggestion', 'high')).toThrow('Optimization table cannot be empty');
        });
        (0, vitest_1.it)('should throw error for empty reason', () => {
            (0, vitest_1.expect)(() => new Optimization_1.Optimization('missing_index', 'users', '', 'suggestion', 'high')).toThrow('Optimization reason cannot be empty');
        });
        (0, vitest_1.it)('should throw error for empty suggestion', () => {
            (0, vitest_1.expect)(() => new Optimization_1.Optimization('missing_index', 'users', 'reason', '', 'high')).toThrow('Optimization suggestion cannot be empty');
        });
        (0, vitest_1.it)('should be immutable', () => {
            const opt = new Optimization_1.Optimization('missing_index', 'users', 'reason', 'suggestion', 'high');
            (0, vitest_1.expect)(Object.isFrozen(opt)).toBe(true);
        });
    });
    (0, vitest_1.describe)('isHighPriority()', () => {
        (0, vitest_1.it)('should return true for high priority', () => {
            const opt = new Optimization_1.Optimization('missing_primary_key', 'users', 'reason', 'suggestion', 'high');
            (0, vitest_1.expect)(opt.isHighPriority()).toBe(true);
        });
        (0, vitest_1.it)('should return false for medium priority', () => {
            const opt = new Optimization_1.Optimization('inefficient_type', 'users', 'reason', 'suggestion', 'medium');
            (0, vitest_1.expect)(opt.isHighPriority()).toBe(false);
        });
        (0, vitest_1.it)('should return false for low priority', () => {
            const opt = new Optimization_1.Optimization('redundant_index', 'users', 'reason', 'suggestion', 'low');
            (0, vitest_1.expect)(opt.isHighPriority()).toBe(false);
        });
    });
    (0, vitest_1.describe)('affectsColumn()', () => {
        (0, vitest_1.it)('should return true when column matches', () => {
            const opt = new Optimization_1.Optimization('missing_index', 'posts', 'reason', 'suggestion', 'high', 'user_id');
            (0, vitest_1.expect)(opt.affectsColumn('user_id')).toBe(true);
        });
        (0, vitest_1.it)('should return false when column does not match', () => {
            const opt = new Optimization_1.Optimization('missing_index', 'posts', 'reason', 'suggestion', 'high', 'user_id');
            (0, vitest_1.expect)(opt.affectsColumn('category_id')).toBe(false);
        });
        (0, vitest_1.it)('should return false when optimization has no column', () => {
            const opt = new Optimization_1.Optimization('missing_primary_key', 'users', 'reason', 'suggestion', 'high');
            (0, vitest_1.expect)(opt.affectsColumn('id')).toBe(false);
        });
    });
    (0, vitest_1.describe)('getDescription()', () => {
        (0, vitest_1.it)('should include column in description', () => {
            const opt = new Optimization_1.Optimization('missing_index', 'posts', 'Foreign key without index', 'CREATE INDEX...', 'high', 'user_id');
            (0, vitest_1.expect)(opt.getDescription()).toBe('[HIGH] missing_index on posts.user_id: Foreign key without index');
        });
        (0, vitest_1.it)('should format without column', () => {
            const opt = new Optimization_1.Optimization('missing_primary_key', 'users', 'No primary key defined', 'ALTER TABLE...', 'high');
            (0, vitest_1.expect)(opt.getDescription()).toBe('[HIGH] missing_primary_key on users: No primary key defined');
        });
        (0, vitest_1.it)('should format medium priority', () => {
            const opt = new Optimization_1.Optimization('inefficient_type', 'users', 'TEXT instead of INTEGER', 'ALTER...', 'medium');
            (0, vitest_1.expect)(opt.getDescription()).toContain('[MEDIUM]');
        });
    });
    (0, vitest_1.describe)('isIndexOptimization()', () => {
        (0, vitest_1.it)('should return true for missing_index', () => {
            const opt = new Optimization_1.Optimization('missing_index', 'users', 'reason', 'suggestion', 'high');
            (0, vitest_1.expect)(opt.isIndexOptimization()).toBe(true);
        });
        (0, vitest_1.it)('should return true for redundant_index', () => {
            const opt = new Optimization_1.Optimization('redundant_index', 'users', 'reason', 'suggestion', 'low');
            (0, vitest_1.expect)(opt.isIndexOptimization()).toBe(true);
        });
        (0, vitest_1.it)('should return false for missing_primary_key', () => {
            const opt = new Optimization_1.Optimization('missing_primary_key', 'users', 'reason', 'suggestion', 'high');
            (0, vitest_1.expect)(opt.isIndexOptimization()).toBe(false);
        });
    });
});
//# sourceMappingURL=Optimization.test.js.map