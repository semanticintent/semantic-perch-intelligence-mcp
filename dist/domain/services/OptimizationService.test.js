"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Column_1 = require("../entities/Column");
const ForeignKey_1 = require("../entities/ForeignKey");
const Index_1 = require("../entities/Index");
const Relationship_1 = require("../entities/Relationship");
const TableInfo_1 = require("../entities/TableInfo");
const Optimization_1 = require("../entities/Optimization");
const OptimizationService_1 = require("./OptimizationService");
(0, vitest_1.describe)('OptimizationService', () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        service = new OptimizationService_1.OptimizationService();
    });
    (0, vitest_1.describe)('checkMissingPrimaryKeys()', () => {
        (0, vitest_1.it)('should detect tables without primary keys', () => {
            const noPkTable = new TableInfo_1.TableInfo('logs', 'table', [
                new Column_1.Column('timestamp', 'TEXT'),
                new Column_1.Column('message', 'TEXT'),
            ]);
            const optimizations = service.checkMissingPrimaryKeys([noPkTable]);
            (0, vitest_1.expect)(optimizations.length).toBe(1);
            (0, vitest_1.expect)(optimizations[0].type).toBe('missing_primary_key');
            (0, vitest_1.expect)(optimizations[0].table).toBe('logs');
            (0, vitest_1.expect)(optimizations[0].priority).toBe('high');
        });
        (0, vitest_1.it)('should not flag tables with primary keys', () => {
            const withPk = new TableInfo_1.TableInfo('users', 'table', [
                new Column_1.Column('id', 'INTEGER', true),
                new Column_1.Column('name', 'TEXT'),
            ]);
            const optimizations = service.checkMissingPrimaryKeys([withPk]);
            (0, vitest_1.expect)(optimizations.length).toBe(0);
        });
        (0, vitest_1.it)('should not flag views', () => {
            const view = new TableInfo_1.TableInfo('user_view', 'view', [
                new Column_1.Column('id', 'INTEGER'),
                new Column_1.Column('name', 'TEXT'),
            ]);
            const optimizations = service.checkMissingPrimaryKeys([view]);
            (0, vitest_1.expect)(optimizations.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('checkMissingIndexes()', () => {
        (0, vitest_1.it)('should detect foreign keys without indexes', () => {
            const postsTable = new TableInfo_1.TableInfo('posts', 'table', [
                new Column_1.Column('id', 'INTEGER', true),
                new Column_1.Column('user_id', 'INTEGER'),
                new Column_1.Column('title', 'TEXT'),
            ], [], // No indexes!
            [new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id')]);
            const relationships = [new Relationship_1.Relationship('posts', 'user_id', 'users', 'id')];
            const optimizations = service.checkMissingIndexes([postsTable], relationships);
            (0, vitest_1.expect)(optimizations.length).toBe(1);
            (0, vitest_1.expect)(optimizations[0].type).toBe('missing_index');
            (0, vitest_1.expect)(optimizations[0].table).toBe('posts');
            (0, vitest_1.expect)(optimizations[0].column).toBe('user_id');
            (0, vitest_1.expect)(optimizations[0].priority).toBe('high');
        });
        (0, vitest_1.it)('should not flag foreign keys with indexes', () => {
            const postsTable = new TableInfo_1.TableInfo('posts', 'table', [new Column_1.Column('id', 'INTEGER', true), new Column_1.Column('user_id', 'INTEGER')], [new Index_1.Index('idx_user_id', 'posts', ['user_id'])], [new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id')]);
            const relationships = [new Relationship_1.Relationship('posts', 'user_id', 'users', 'id')];
            const optimizations = service.checkMissingIndexes([postsTable], relationships);
            (0, vitest_1.expect)(optimizations.length).toBe(0);
        });
        (0, vitest_1.it)('should check multiple foreign keys', () => {
            const commentsTable = new TableInfo_1.TableInfo('comments', 'table', [
                new Column_1.Column('id', 'INTEGER', true),
                new Column_1.Column('post_id', 'INTEGER'),
                new Column_1.Column('user_id', 'INTEGER'),
            ], [], [
                new ForeignKey_1.ForeignKey('comments', 'post_id', 'posts', 'id'),
                new ForeignKey_1.ForeignKey('comments', 'user_id', 'users', 'id'),
            ]);
            const relationships = [
                new Relationship_1.Relationship('comments', 'post_id', 'posts', 'id'),
                new Relationship_1.Relationship('comments', 'user_id', 'users', 'id'),
            ];
            const optimizations = service.checkMissingIndexes([commentsTable], relationships);
            (0, vitest_1.expect)(optimizations.length).toBe(2);
        });
    });
    (0, vitest_1.describe)('checkNullableForeignKeys()', () => {
        (0, vitest_1.it)('should detect nullable foreign keys', () => {
            const postsTable = new TableInfo_1.TableInfo('posts', 'table', [
                new Column_1.Column('id', 'INTEGER', true, false),
                new Column_1.Column('user_id', 'INTEGER', false, true), // Nullable!
            ], [], [new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id')]);
            const optimizations = service.checkNullableForeignKeys([postsTable]);
            (0, vitest_1.expect)(optimizations.length).toBe(1);
            (0, vitest_1.expect)(optimizations[0].type).toBe('nullable_foreign_key');
            (0, vitest_1.expect)(optimizations[0].priority).toBe('medium');
            (0, vitest_1.expect)(optimizations[0].column).toBe('user_id');
        });
        (0, vitest_1.it)('should not flag non-nullable foreign keys', () => {
            const postsTable = new TableInfo_1.TableInfo('posts', 'table', [
                new Column_1.Column('id', 'INTEGER', true, false),
                new Column_1.Column('user_id', 'INTEGER', false, false), // NOT nullable
            ], [], [new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id')]);
            const optimizations = service.checkNullableForeignKeys([postsTable]);
            (0, vitest_1.expect)(optimizations.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('checkRedundantIndexes()', () => {
        (0, vitest_1.it)('should detect redundant single-column index', () => {
            const table = new TableInfo_1.TableInfo('posts', 'table', [new Column_1.Column('id', 'INTEGER', true), new Column_1.Column('user_id', 'INTEGER')], [
                new Index_1.Index('idx_user_id', 'posts', ['user_id']),
                new Index_1.Index('idx_user_id_created', 'posts', ['user_id', 'created_at']),
            ]);
            const optimizations = service.checkRedundantIndexes(table);
            (0, vitest_1.expect)(optimizations.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(optimizations[0].type).toBe('redundant_index');
            (0, vitest_1.expect)(optimizations[0].priority).toBe('low');
        });
        (0, vitest_1.it)('should not flag non-redundant indexes', () => {
            const table = new TableInfo_1.TableInfo('posts', 'table', [new Column_1.Column('id', 'INTEGER', true), new Column_1.Column('user_id', 'INTEGER')], [
                new Index_1.Index('idx_user_id', 'posts', ['user_id']),
                new Index_1.Index('idx_created', 'posts', ['created_at']),
            ]);
            const optimizations = service.checkRedundantIndexes(table);
            (0, vitest_1.expect)(optimizations.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('analyzeSchema()', () => {
        (0, vitest_1.it)('should combine all optimization checks', () => {
            const noPkTable = new TableInfo_1.TableInfo('logs', 'table', [new Column_1.Column('message', 'TEXT')]);
            const postsTable = new TableInfo_1.TableInfo('posts', 'table', [new Column_1.Column('id', 'INTEGER', true), new Column_1.Column('user_id', 'INTEGER', false, true)], [], [new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id')]);
            const relationships = [new Relationship_1.Relationship('posts', 'user_id', 'users', 'id')];
            const optimizations = service.analyzeSchema([noPkTable, postsTable], relationships);
            // Should find: missing PK, missing index, nullable FK
            (0, vitest_1.expect)(optimizations.length).toBeGreaterThanOrEqual(3);
        });
    });
    (0, vitest_1.describe)('filterByPriority()', () => {
        (0, vitest_1.it)('should filter high priority optimizations', () => {
            const opts = [
                new Optimization_1.Optimization('missing_primary_key', 't1', 'r', 's', 'high'),
                new Optimization_1.Optimization('nullable_foreign_key', 't2', 'r', 's', 'medium'),
                new Optimization_1.Optimization('missing_index', 't3', 'r', 's', 'high'),
            ];
            const high = service.filterByPriority(opts, 'high');
            (0, vitest_1.expect)(high.length).toBe(2);
            (0, vitest_1.expect)(high.every((opt) => opt.priority === 'high')).toBe(true);
        });
    });
    (0, vitest_1.describe)('filterByType()', () => {
        (0, vitest_1.it)('should filter by optimization type', () => {
            const opts = [
                new Optimization_1.Optimization('missing_index', 't1', 'r', 's', 'high'),
                new Optimization_1.Optimization('missing_primary_key', 't2', 'r', 's', 'high'),
                new Optimization_1.Optimization('missing_index', 't3', 'r', 's', 'high'),
            ];
            const indexOpts = service.filterByType(opts, 'missing_index');
            (0, vitest_1.expect)(indexOpts.length).toBe(2);
            (0, vitest_1.expect)(indexOpts.every((opt) => opt.type === 'missing_index')).toBe(true);
        });
    });
    (0, vitest_1.describe)('filterByTable()', () => {
        (0, vitest_1.it)('should filter by table name', () => {
            const opts = [
                new Optimization_1.Optimization('missing_index', 'posts', 'r', 's', 'high'),
                new Optimization_1.Optimization('missing_primary_key', 'logs', 'r', 's', 'high'),
                new Optimization_1.Optimization('nullable_foreign_key', 'posts', 'r', 's', 'medium'),
            ];
            const postsOpts = service.filterByTable(opts, 'posts');
            (0, vitest_1.expect)(postsOpts.length).toBe(2);
            (0, vitest_1.expect)(postsOpts.every((opt) => opt.table === 'posts')).toBe(true);
        });
    });
    (0, vitest_1.describe)('sortByPriority()', () => {
        (0, vitest_1.it)('should sort by priority (high -> medium -> low)', () => {
            const opts = [
                new Optimization_1.Optimization('redundant_index', 't1', 'r', 's', 'low'),
                new Optimization_1.Optimization('missing_index', 't2', 'r', 's', 'high'),
                new Optimization_1.Optimization('nullable_foreign_key', 't3', 'r', 's', 'medium'),
            ];
            const sorted = service.sortByPriority(opts);
            (0, vitest_1.expect)(sorted[0].priority).toBe('high');
            (0, vitest_1.expect)(sorted[1].priority).toBe('medium');
            (0, vitest_1.expect)(sorted[2].priority).toBe('low');
        });
        (0, vitest_1.it)('should not mutate original array', () => {
            const opts = [
                new Optimization_1.Optimization('redundant_index', 't1', 'r', 's', 'low'),
                new Optimization_1.Optimization('missing_index', 't2', 'r', 's', 'high'),
            ];
            const original = [...opts];
            service.sortByPriority(opts);
            (0, vitest_1.expect)(opts).toEqual(original);
        });
    });
    (0, vitest_1.describe)('getSummary()', () => {
        (0, vitest_1.it)('should provide optimization summary', () => {
            const opts = [
                new Optimization_1.Optimization('missing_index', 't1', 'r', 's', 'high'),
                new Optimization_1.Optimization('missing_index', 't2', 'r', 's', 'high'),
                new Optimization_1.Optimization('missing_primary_key', 't3', 'r', 's', 'high'),
                new Optimization_1.Optimization('nullable_foreign_key', 't4', 'r', 's', 'medium'),
                new Optimization_1.Optimization('redundant_index', 't5', 'r', 's', 'low'),
            ];
            const summary = service.getSummary(opts);
            (0, vitest_1.expect)(summary.total).toBe(5);
            (0, vitest_1.expect)(summary.byPriority.high).toBe(3);
            (0, vitest_1.expect)(summary.byPriority.medium).toBe(1);
            (0, vitest_1.expect)(summary.byPriority.low).toBe(1);
            (0, vitest_1.expect)(summary.byType.get('missing_index')).toBe(2);
            (0, vitest_1.expect)(summary.byType.get('missing_primary_key')).toBe(1);
        });
    });
});
//# sourceMappingURL=OptimizationService.test.js.map