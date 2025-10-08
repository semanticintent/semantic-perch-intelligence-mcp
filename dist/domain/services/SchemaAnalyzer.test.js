"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Column_1 = require("../entities/Column");
const ForeignKey_1 = require("../entities/ForeignKey");
const Index_1 = require("../entities/Index");
const TableInfo_1 = require("../entities/TableInfo");
const SchemaAnalyzer_1 = require("./SchemaAnalyzer");
(0, vitest_1.describe)('SchemaAnalyzer', () => {
    let analyzer;
    let usersTable;
    let postsTable;
    let logsTable;
    let userView;
    (0, vitest_1.beforeEach)(() => {
        analyzer = new SchemaAnalyzer_1.SchemaAnalyzer();
        // Users table - well-designed with PK
        usersTable = new TableInfo_1.TableInfo('users', 'table', [
            new Column_1.Column('id', 'INTEGER', true, false),
            new Column_1.Column('name', 'TEXT', false, false),
            new Column_1.Column('email', 'TEXT', false, true),
        ], [new Index_1.Index('idx_users_email', 'users', ['email'], true)]);
        // Posts table - has FK and index
        postsTable = new TableInfo_1.TableInfo('posts', 'table', [
            new Column_1.Column('id', 'INTEGER', true, false),
            new Column_1.Column('user_id', 'INTEGER', false, false),
            new Column_1.Column('title', 'TEXT', false, false),
            new Column_1.Column('content', 'TEXT', false, true),
        ], [new Index_1.Index('idx_posts_user_id', 'posts', ['user_id'])], [new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id', 'CASCADE')]);
        // Logs table - no PK (problematic)
        logsTable = new TableInfo_1.TableInfo('logs', 'table', [
            new Column_1.Column('timestamp', 'TEXT', false, true),
            new Column_1.Column('message', 'TEXT', false, true),
        ]);
        // User view
        userView = new TableInfo_1.TableInfo('user_view', 'view', [
            new Column_1.Column('id', 'INTEGER'),
            new Column_1.Column('name', 'TEXT'),
        ]);
    });
    (0, vitest_1.describe)('analyzeSchema()', () => {
        (0, vitest_1.it)('should analyze overall schema statistics', () => {
            const result = analyzer.analyzeSchema([usersTable, postsTable, logsTable, userView]);
            (0, vitest_1.expect)(result.totalTables).toBe(4);
            (0, vitest_1.expect)(result.totalColumns).toBe(11);
            (0, vitest_1.expect)(result.tablesWithPrimaryKeys).toBe(2); // users, posts
            (0, vitest_1.expect)(result.tablesWithoutPrimaryKeys).toBe(2); // logs, user_view
            (0, vitest_1.expect)(result.tablesWithForeignKeys).toBe(1); // posts
            (0, vitest_1.expect)(result.tablesWithIndexes).toBe(2); // users, posts
            (0, vitest_1.expect)(result.totalIndexes).toBe(2);
            (0, vitest_1.expect)(result.totalForeignKeys).toBe(1);
            (0, vitest_1.expect)(result.totalViews).toBe(1);
        });
        (0, vitest_1.it)('should handle empty table array', () => {
            const result = analyzer.analyzeSchema([]);
            (0, vitest_1.expect)(result.totalTables).toBe(0);
            (0, vitest_1.expect)(result.totalColumns).toBe(0);
            (0, vitest_1.expect)(result.tablesWithPrimaryKeys).toBe(0);
        });
        (0, vitest_1.it)('should count all columns correctly', () => {
            const result = analyzer.analyzeSchema([usersTable, postsTable]);
            (0, vitest_1.expect)(result.totalColumns).toBe(7); // 3 + 4
        });
    });
    (0, vitest_1.describe)('analyzeTable()', () => {
        (0, vitest_1.it)('should analyze table with primary key', () => {
            const analysis = analyzer.analyzeTable(usersTable);
            (0, vitest_1.expect)(analysis.tableName).toBe('users');
            (0, vitest_1.expect)(analysis.columnCount).toBe(3);
            (0, vitest_1.expect)(analysis.hasPrimaryKey).toBe(true);
            (0, vitest_1.expect)(analysis.primaryKeyColumns).toEqual(['id']);
            (0, vitest_1.expect)(analysis.requiredColumns).toEqual(['id', 'name']);
            (0, vitest_1.expect)(analysis.foreignKeyCount).toBe(0);
            (0, vitest_1.expect)(analysis.indexCount).toBe(1);
            (0, vitest_1.expect)(analysis.isView).toBe(false);
        });
        (0, vitest_1.it)('should analyze table without primary key', () => {
            const analysis = analyzer.analyzeTable(logsTable);
            (0, vitest_1.expect)(analysis.hasPrimaryKey).toBe(false);
            (0, vitest_1.expect)(analysis.primaryKeyColumns).toEqual([]);
        });
        (0, vitest_1.it)('should analyze table with foreign keys', () => {
            const analysis = analyzer.analyzeTable(postsTable);
            (0, vitest_1.expect)(analysis.foreignKeyCount).toBe(1);
            (0, vitest_1.expect)(analysis.hasPrimaryKey).toBe(true);
        });
        (0, vitest_1.it)('should identify views', () => {
            const analysis = analyzer.analyzeTable(userView);
            (0, vitest_1.expect)(analysis.isView).toBe(true);
        });
    });
    (0, vitest_1.describe)('analyzeColumnTypes()', () => {
        (0, vitest_1.it)('should count column type distribution', () => {
            const typeDistribution = analyzer.analyzeColumnTypes([usersTable, postsTable]);
            (0, vitest_1.expect)(typeDistribution.get('INTEGER')).toBe(3); // id columns
            (0, vitest_1.expect)(typeDistribution.get('TEXT')).toBe(4); // name, email, title, content
        });
        (0, vitest_1.it)('should handle empty tables', () => {
            const typeDistribution = analyzer.analyzeColumnTypes([]);
            (0, vitest_1.expect)(typeDistribution.size).toBe(0);
        });
        (0, vitest_1.it)('should aggregate types across multiple tables', () => {
            const table1 = new TableInfo_1.TableInfo('t1', 'table', [
                new Column_1.Column('id', 'INTEGER', true),
                new Column_1.Column('name', 'TEXT'),
            ]);
            const table2 = new TableInfo_1.TableInfo('t2', 'table', [
                new Column_1.Column('id', 'INTEGER', true),
                new Column_1.Column('value', 'REAL'),
            ]);
            const typeDistribution = analyzer.analyzeColumnTypes([table1, table2]);
            (0, vitest_1.expect)(typeDistribution.get('INTEGER')).toBe(2);
            (0, vitest_1.expect)(typeDistribution.get('TEXT')).toBe(1);
            (0, vitest_1.expect)(typeDistribution.get('REAL')).toBe(1);
        });
    });
    (0, vitest_1.describe)('identifyProblematicTables()', () => {
        (0, vitest_1.it)('should identify tables without primary keys', () => {
            const problematic = analyzer.identifyProblematicTables([
                usersTable,
                postsTable,
                logsTable,
            ]);
            (0, vitest_1.expect)(problematic.length).toBe(1);
            (0, vitest_1.expect)(problematic[0].name).toBe('logs');
        });
        (0, vitest_1.it)('should identify tables with unindexed foreign keys', () => {
            const badTable = new TableInfo_1.TableInfo('comments', 'table', [
                new Column_1.Column('id', 'INTEGER', true),
                new Column_1.Column('post_id', 'INTEGER'),
                new Column_1.Column('text', 'TEXT'),
            ], [], // No indexes!
            [new ForeignKey_1.ForeignKey('comments', 'post_id', 'posts', 'id')]);
            const problematic = analyzer.identifyProblematicTables([usersTable, badTable]);
            (0, vitest_1.expect)(problematic.length).toBe(1);
            (0, vitest_1.expect)(problematic[0].name).toBe('comments');
        });
        (0, vitest_1.it)('should return empty array for well-designed schema', () => {
            const problematic = analyzer.identifyProblematicTables([usersTable, postsTable]);
            (0, vitest_1.expect)(problematic.length).toBe(0);
        });
        (0, vitest_1.it)('should not flag views as problematic', () => {
            const problematic = analyzer.identifyProblematicTables([userView]);
            // Views without PKs are acceptable
            (0, vitest_1.expect)(problematic.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('analyzeNullability()', () => {
        (0, vitest_1.it)('should analyze nullable columns', () => {
            const analysis = analyzer.analyzeNullability(usersTable);
            (0, vitest_1.expect)(analysis.nullableColumns.length).toBe(1); // email
            (0, vitest_1.expect)(analysis.nullableColumns[0].name).toBe('email');
            (0, vitest_1.expect)(analysis.requiredColumns.length).toBe(2); // id, name
            (0, vitest_1.expect)(analysis.nullablePercentage).toBeCloseTo(33.33, 1);
        });
        (0, vitest_1.it)('should handle all required columns', () => {
            const strictTable = new TableInfo_1.TableInfo('strict', 'table', [
                new Column_1.Column('id', 'INTEGER', true, false),
                new Column_1.Column('name', 'TEXT', false, false),
            ]);
            const analysis = analyzer.analyzeNullability(strictTable);
            (0, vitest_1.expect)(analysis.nullableColumns.length).toBe(0);
            (0, vitest_1.expect)(analysis.requiredColumns.length).toBe(2);
            (0, vitest_1.expect)(analysis.nullablePercentage).toBe(0);
        });
        (0, vitest_1.it)('should handle all nullable columns', () => {
            const analysis = analyzer.analyzeNullability(logsTable);
            (0, vitest_1.expect)(analysis.nullableColumns.length).toBe(2);
            (0, vitest_1.expect)(analysis.requiredColumns.length).toBe(0);
            (0, vitest_1.expect)(analysis.nullablePercentage).toBe(100);
        });
    });
    (0, vitest_1.describe)('getTablesByComplexity()', () => {
        (0, vitest_1.it)('should sort tables by complexity', () => {
            const sorted = analyzer.getTablesByComplexity([usersTable, postsTable, logsTable]);
            // posts: 4 columns + 1 index + 1 FK = 6
            // users: 3 columns + 1 index + 0 FK = 4
            // logs: 2 columns + 0 index + 0 FK = 2
            (0, vitest_1.expect)(sorted[0].table.name).toBe('posts');
            (0, vitest_1.expect)(sorted[0].complexity).toBe(6);
            (0, vitest_1.expect)(sorted[1].table.name).toBe('users');
            (0, vitest_1.expect)(sorted[1].complexity).toBe(4);
            (0, vitest_1.expect)(sorted[2].table.name).toBe('logs');
            (0, vitest_1.expect)(sorted[2].complexity).toBe(2);
        });
        (0, vitest_1.it)('should handle single table', () => {
            const sorted = analyzer.getTablesByComplexity([usersTable]);
            (0, vitest_1.expect)(sorted.length).toBe(1);
            (0, vitest_1.expect)(sorted[0].table.name).toBe('users');
        });
        (0, vitest_1.it)('should handle empty array', () => {
            const sorted = analyzer.getTablesByComplexity([]);
            (0, vitest_1.expect)(sorted.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('identifyOrphanedTables()', () => {
        (0, vitest_1.it)('should identify tables with no relationships', () => {
            const orphaned = analyzer.identifyOrphanedTables([usersTable, postsTable, logsTable]);
            (0, vitest_1.expect)(orphaned.length).toBe(1);
            (0, vitest_1.expect)(orphaned[0].name).toBe('logs');
        });
        (0, vitest_1.it)('should not flag tables with incoming foreign keys', () => {
            // users is referenced by posts, so not orphaned
            const orphaned = analyzer.identifyOrphanedTables([usersTable, postsTable]);
            (0, vitest_1.expect)(orphaned.length).toBe(0);
        });
        (0, vitest_1.it)('should not flag tables with outgoing foreign keys', () => {
            // posts references users, so not orphaned
            const orphaned = analyzer.identifyOrphanedTables([postsTable]);
            (0, vitest_1.expect)(orphaned.length).toBe(0);
        });
        (0, vitest_1.it)('should not flag views as orphaned', () => {
            const orphaned = analyzer.identifyOrphanedTables([userView]);
            (0, vitest_1.expect)(orphaned.length).toBe(0);
        });
        (0, vitest_1.it)('should handle complex relationship networks', () => {
            const commentsTable = new TableInfo_1.TableInfo('comments', 'table', [new Column_1.Column('id', 'INTEGER', true), new Column_1.Column('post_id', 'INTEGER')], [], [new ForeignKey_1.ForeignKey('comments', 'post_id', 'posts', 'id')]);
            const tagsTable = new TableInfo_1.TableInfo('tags', 'table', [
                new Column_1.Column('id', 'INTEGER', true),
                new Column_1.Column('name', 'TEXT'),
            ]);
            const orphaned = analyzer.identifyOrphanedTables([
                usersTable,
                postsTable,
                commentsTable,
                tagsTable,
            ]);
            // Only tags is orphaned (no FK in/out)
            (0, vitest_1.expect)(orphaned.length).toBe(1);
            (0, vitest_1.expect)(orphaned[0].name).toBe('tags');
        });
    });
});
//# sourceMappingURL=SchemaAnalyzer.test.js.map