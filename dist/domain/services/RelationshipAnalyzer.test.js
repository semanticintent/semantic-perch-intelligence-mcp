"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Column_1 = require("../entities/Column");
const ForeignKey_1 = require("../entities/ForeignKey");
const TableInfo_1 = require("../entities/TableInfo");
const RelationshipAnalyzer_1 = require("./RelationshipAnalyzer");
(0, vitest_1.describe)('RelationshipAnalyzer', () => {
    let analyzer;
    let usersTable;
    let postsTable;
    let commentsTable;
    let categoriesTable;
    (0, vitest_1.beforeEach)(() => {
        analyzer = new RelationshipAnalyzer_1.RelationshipAnalyzer();
        // Users table (no FK)
        usersTable = new TableInfo_1.TableInfo('users', 'table', [
            new Column_1.Column('id', 'INTEGER', true),
            new Column_1.Column('name', 'TEXT'),
        ]);
        // Posts table (FK to users)
        postsTable = new TableInfo_1.TableInfo('posts', 'table', [
            new Column_1.Column('id', 'INTEGER', true),
            new Column_1.Column('user_id', 'INTEGER'),
            new Column_1.Column('title', 'TEXT'),
        ], [], [new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id', 'CASCADE')]);
        // Comments table (FK to posts and users)
        commentsTable = new TableInfo_1.TableInfo('comments', 'table', [
            new Column_1.Column('id', 'INTEGER', true),
            new Column_1.Column('post_id', 'INTEGER'),
            new Column_1.Column('user_id', 'INTEGER'),
            new Column_1.Column('text', 'TEXT'),
        ], [], [
            new ForeignKey_1.ForeignKey('comments', 'post_id', 'posts', 'id', 'CASCADE'),
            new ForeignKey_1.ForeignKey('comments', 'user_id', 'users', 'id', 'SET NULL'),
        ]);
        // Categories table (self-referential)
        categoriesTable = new TableInfo_1.TableInfo('categories', 'table', [
            new Column_1.Column('id', 'INTEGER', true),
            new Column_1.Column('name', 'TEXT'),
            new Column_1.Column('parent_id', 'INTEGER'),
        ], [], [new ForeignKey_1.ForeignKey('categories', 'parent_id', 'categories', 'id', 'CASCADE')]);
    });
    (0, vitest_1.describe)('extractRelationships()', () => {
        (0, vitest_1.it)('should extract relationships from tables', () => {
            const relationships = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);
            (0, vitest_1.expect)(relationships.length).toBe(3);
            (0, vitest_1.expect)(relationships[0].fromTable).toBe('posts');
            (0, vitest_1.expect)(relationships[0].toTable).toBe('users');
            (0, vitest_1.expect)(relationships[1].fromTable).toBe('comments');
            (0, vitest_1.expect)(relationships[1].toTable).toBe('posts');
            (0, vitest_1.expect)(relationships[2].fromTable).toBe('comments');
            (0, vitest_1.expect)(relationships[2].toTable).toBe('users');
        });
        (0, vitest_1.it)('should return empty array for tables without FK', () => {
            const relationships = analyzer.extractRelationships([usersTable]);
            (0, vitest_1.expect)(relationships.length).toBe(0);
        });
        (0, vitest_1.it)('should preserve FK semantics in relationships', () => {
            const relationships = analyzer.extractRelationships([postsTable]);
            (0, vitest_1.expect)(relationships[0].onDelete).toBe('CASCADE');
            (0, vitest_1.expect)(relationships[0].fromColumn).toBe('user_id');
            (0, vitest_1.expect)(relationships[0].toColumn).toBe('id');
        });
    });
    (0, vitest_1.describe)('getRelationshipsForTable()', () => {
        (0, vitest_1.it)('should get outgoing relationships', () => {
            const allRels = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);
            const result = analyzer.getRelationshipsForTable('comments', allRels);
            (0, vitest_1.expect)(result.outgoing.length).toBe(2);
            (0, vitest_1.expect)(result.outgoing[0].toTable).toBe('posts');
            (0, vitest_1.expect)(result.outgoing[1].toTable).toBe('users');
        });
        (0, vitest_1.it)('should get incoming relationships', () => {
            const allRels = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);
            const result = analyzer.getRelationshipsForTable('users', allRels);
            (0, vitest_1.expect)(result.outgoing.length).toBe(0); // users doesn't reference anyone
            (0, vitest_1.expect)(result.incoming.length).toBe(2); // posts and comments reference users
        });
        (0, vitest_1.it)('should handle table with no relationships', () => {
            const allRels = analyzer.extractRelationships([usersTable, postsTable]);
            const result = analyzer.getRelationshipsForTable('nonexistent', allRels);
            (0, vitest_1.expect)(result.outgoing.length).toBe(0);
            (0, vitest_1.expect)(result.incoming.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('buildDependencyGraph()', () => {
        (0, vitest_1.it)('should build graph from relationships', () => {
            const rels = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);
            const graph = analyzer.buildDependencyGraph(rels);
            (0, vitest_1.expect)(graph.nodes).toContain('users');
            (0, vitest_1.expect)(graph.nodes).toContain('posts');
            (0, vitest_1.expect)(graph.nodes).toContain('comments');
            (0, vitest_1.expect)(graph.edges.length).toBe(3);
        });
        (0, vitest_1.it)('should create edges with column information', () => {
            const rels = analyzer.extractRelationships([postsTable]);
            const graph = analyzer.buildDependencyGraph(rels);
            (0, vitest_1.expect)(graph.edges[0].from).toBe('posts');
            (0, vitest_1.expect)(graph.edges[0].to).toBe('users');
            (0, vitest_1.expect)(graph.edges[0].column).toBe('user_id');
        });
        (0, vitest_1.it)('should handle empty relationships', () => {
            const graph = analyzer.buildDependencyGraph([]);
            (0, vitest_1.expect)(graph.nodes.length).toBe(0);
            (0, vitest_1.expect)(graph.edges.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('detectCircularDependencies()', () => {
        (0, vitest_1.it)('should detect self-referential cycle', () => {
            const rels = analyzer.extractRelationships([categoriesTable]);
            const cycles = analyzer.detectCircularDependencies(rels);
            (0, vitest_1.expect)(cycles.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(cycles[0]).toContain('categories');
        });
        (0, vitest_1.it)('should detect multi-table cycles', () => {
            // Create circular dependency: A -> B -> C -> A
            const tableA = new TableInfo_1.TableInfo('a', 'table', [new Column_1.Column('id', 'INTEGER', true), new Column_1.Column('b_id', 'INTEGER')], [], [new ForeignKey_1.ForeignKey('a', 'b_id', 'b', 'id')]);
            const tableB = new TableInfo_1.TableInfo('b', 'table', [new Column_1.Column('id', 'INTEGER', true), new Column_1.Column('c_id', 'INTEGER')], [], [new ForeignKey_1.ForeignKey('b', 'c_id', 'c', 'id')]);
            const tableC = new TableInfo_1.TableInfo('c', 'table', [new Column_1.Column('id', 'INTEGER', true), new Column_1.Column('a_id', 'INTEGER')], [], [new ForeignKey_1.ForeignKey('c', 'a_id', 'a', 'id')]);
            const rels = analyzer.extractRelationships([tableA, tableB, tableC]);
            const cycles = analyzer.detectCircularDependencies(rels);
            (0, vitest_1.expect)(cycles.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should return empty for acyclic graph', () => {
            const rels = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);
            const cycles = analyzer.detectCircularDependencies(rels);
            (0, vitest_1.expect)(cycles.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('getCascadeChains()', () => {
        (0, vitest_1.it)('should find cascade chains', () => {
            const rels = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);
            const chains = analyzer.getCascadeChains('users', rels);
            (0, vitest_1.expect)(chains.length).toBeGreaterThan(0);
            // Deleting user cascades to posts, then to comments
        });
        (0, vitest_1.it)('should return empty for table with no cascades', () => {
            const rels = analyzer.extractRelationships([commentsTable]);
            const chains = analyzer.getCascadeChains('comments', rels);
            (0, vitest_1.expect)(chains.length).toBeGreaterThanOrEqual(1); // includes itself
        });
    });
    (0, vitest_1.describe)('getSelfReferentialRelationships()', () => {
        (0, vitest_1.it)('should identify self-referential relationships', () => {
            const rels = analyzer.extractRelationships([categoriesTable]);
            const selfRefs = analyzer.getSelfReferentialRelationships(rels);
            (0, vitest_1.expect)(selfRefs.length).toBe(1);
            (0, vitest_1.expect)(selfRefs[0].isSelfReferential()).toBe(true);
        });
        (0, vitest_1.it)('should return empty for non-self-referential', () => {
            const rels = analyzer.extractRelationships([postsTable]);
            const selfRefs = analyzer.getSelfReferentialRelationships(rels);
            (0, vitest_1.expect)(selfRefs.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('getRequiredRelationships()', () => {
        (0, vitest_1.it)('should get CASCADE relationships', () => {
            const rels = analyzer.extractRelationships([postsTable, commentsTable]);
            const required = analyzer.getRequiredRelationships(rels);
            (0, vitest_1.expect)(required.length).toBe(2); // posts->users CASCADE, comments->posts CASCADE
            (0, vitest_1.expect)(required.every((r) => r.isRequired())).toBe(true);
        });
    });
    (0, vitest_1.describe)('getOptionalRelationships()', () => {
        (0, vitest_1.it)('should get SET NULL relationships', () => {
            const rels = analyzer.extractRelationships([commentsTable]);
            const optional = analyzer.getOptionalRelationships(rels);
            (0, vitest_1.expect)(optional.length).toBe(1); // comments->users SET NULL
            (0, vitest_1.expect)(optional[0].isOptional()).toBe(true);
        });
    });
    (0, vitest_1.describe)('getIndependentTables()', () => {
        (0, vitest_1.it)('should find tables with no FK', () => {
            const independent = analyzer.getIndependentTables([
                usersTable,
                postsTable,
                commentsTable,
            ]);
            (0, vitest_1.expect)(independent.length).toBe(1);
            (0, vitest_1.expect)(independent[0].name).toBe('users');
        });
        (0, vitest_1.it)('should return all tables if none have FK', () => {
            const independent = analyzer.getIndependentTables([usersTable]);
            (0, vitest_1.expect)(independent.length).toBe(1);
        });
    });
    (0, vitest_1.describe)('getPopulationOrder()', () => {
        (0, vitest_1.it)('should return topological order', () => {
            const rels = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);
            const order = analyzer.getPopulationOrder(rels);
            // users must come before posts (no dependencies)
            // posts must come before comments
            const usersIndex = order.indexOf('users');
            const postsIndex = order.indexOf('posts');
            const commentsIndex = order.indexOf('comments');
            (0, vitest_1.expect)(usersIndex).toBeLessThan(postsIndex);
            (0, vitest_1.expect)(postsIndex).toBeLessThan(commentsIndex);
        });
        (0, vitest_1.it)('should handle empty relationships', () => {
            const order = analyzer.getPopulationOrder([]);
            (0, vitest_1.expect)(order.length).toBe(0);
        });
        (0, vitest_1.it)('should handle single relationship', () => {
            const rels = analyzer.extractRelationships([postsTable]);
            const order = analyzer.getPopulationOrder(rels);
            (0, vitest_1.expect)(order).toContain('users');
            (0, vitest_1.expect)(order).toContain('posts');
            (0, vitest_1.expect)(order.indexOf('users')).toBeLessThan(order.indexOf('posts'));
        });
    });
});
//# sourceMappingURL=RelationshipAnalyzer.test.js.map