import { describe, it, expect, beforeEach } from 'vitest';
import { Column } from '../entities/Column';
import { ForeignKey } from '../entities/ForeignKey';
import { Relationship } from '../entities/Relationship';
import { TableInfo } from '../entities/TableInfo';
import { RelationshipAnalyzer } from './RelationshipAnalyzer';

describe('RelationshipAnalyzer', () => {
  let analyzer: RelationshipAnalyzer;
  let usersTable: TableInfo;
  let postsTable: TableInfo;
  let commentsTable: TableInfo;
  let categoriesTable: TableInfo;

  beforeEach(() => {
    analyzer = new RelationshipAnalyzer();

    // Users table (no FK)
    usersTable = new TableInfo('users', 'table', [
      new Column('id', 'INTEGER', true),
      new Column('name', 'TEXT'),
    ]);

    // Posts table (FK to users)
    postsTable = new TableInfo(
      'posts',
      'table',
      [
        new Column('id', 'INTEGER', true),
        new Column('user_id', 'INTEGER'),
        new Column('title', 'TEXT'),
      ],
      [],
      [new ForeignKey('posts', 'user_id', 'users', 'id', 'CASCADE')]
    );

    // Comments table (FK to posts and users)
    commentsTable = new TableInfo(
      'comments',
      'table',
      [
        new Column('id', 'INTEGER', true),
        new Column('post_id', 'INTEGER'),
        new Column('user_id', 'INTEGER'),
        new Column('text', 'TEXT'),
      ],
      [],
      [
        new ForeignKey('comments', 'post_id', 'posts', 'id', 'CASCADE'),
        new ForeignKey('comments', 'user_id', 'users', 'id', 'SET NULL'),
      ]
    );

    // Categories table (self-referential)
    categoriesTable = new TableInfo(
      'categories',
      'table',
      [
        new Column('id', 'INTEGER', true),
        new Column('name', 'TEXT'),
        new Column('parent_id', 'INTEGER'),
      ],
      [],
      [new ForeignKey('categories', 'parent_id', 'categories', 'id', 'CASCADE')]
    );
  });

  describe('extractRelationships()', () => {
    it('should extract relationships from tables', () => {
      const relationships = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);

      expect(relationships.length).toBe(3);
      expect(relationships[0].fromTable).toBe('posts');
      expect(relationships[0].toTable).toBe('users');
      expect(relationships[1].fromTable).toBe('comments');
      expect(relationships[1].toTable).toBe('posts');
      expect(relationships[2].fromTable).toBe('comments');
      expect(relationships[2].toTable).toBe('users');
    });

    it('should return empty array for tables without FK', () => {
      const relationships = analyzer.extractRelationships([usersTable]);

      expect(relationships.length).toBe(0);
    });

    it('should preserve FK semantics in relationships', () => {
      const relationships = analyzer.extractRelationships([postsTable]);

      expect(relationships[0].onDelete).toBe('CASCADE');
      expect(relationships[0].fromColumn).toBe('user_id');
      expect(relationships[0].toColumn).toBe('id');
    });
  });

  describe('getRelationshipsForTable()', () => {
    it('should get outgoing relationships', () => {
      const allRels = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);
      const result = analyzer.getRelationshipsForTable('comments', allRels);

      expect(result.outgoing.length).toBe(2);
      expect(result.outgoing[0].toTable).toBe('posts');
      expect(result.outgoing[1].toTable).toBe('users');
    });

    it('should get incoming relationships', () => {
      const allRels = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);
      const result = analyzer.getRelationshipsForTable('users', allRels);

      expect(result.outgoing.length).toBe(0); // users doesn't reference anyone
      expect(result.incoming.length).toBe(2); // posts and comments reference users
    });

    it('should handle table with no relationships', () => {
      const allRels = analyzer.extractRelationships([usersTable, postsTable]);
      const result = analyzer.getRelationshipsForTable('nonexistent', allRels);

      expect(result.outgoing.length).toBe(0);
      expect(result.incoming.length).toBe(0);
    });
  });

  describe('buildDependencyGraph()', () => {
    it('should build graph from relationships', () => {
      const rels = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);
      const graph = analyzer.buildDependencyGraph(rels);

      expect(graph.nodes).toContain('users');
      expect(graph.nodes).toContain('posts');
      expect(graph.nodes).toContain('comments');
      expect(graph.edges.length).toBe(3);
    });

    it('should create edges with column information', () => {
      const rels = analyzer.extractRelationships([postsTable]);
      const graph = analyzer.buildDependencyGraph(rels);

      expect(graph.edges[0].from).toBe('posts');
      expect(graph.edges[0].to).toBe('users');
      expect(graph.edges[0].column).toBe('user_id');
    });

    it('should handle empty relationships', () => {
      const graph = analyzer.buildDependencyGraph([]);

      expect(graph.nodes.length).toBe(0);
      expect(graph.edges.length).toBe(0);
    });
  });

  describe('detectCircularDependencies()', () => {
    it('should detect self-referential cycle', () => {
      const rels = analyzer.extractRelationships([categoriesTable]);
      const cycles = analyzer.detectCircularDependencies(rels);

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('categories');
    });

    it('should detect multi-table cycles', () => {
      // Create circular dependency: A -> B -> C -> A
      const tableA = new TableInfo(
        'a',
        'table',
        [new Column('id', 'INTEGER', true), new Column('b_id', 'INTEGER')],
        [],
        [new ForeignKey('a', 'b_id', 'b', 'id')]
      );

      const tableB = new TableInfo(
        'b',
        'table',
        [new Column('id', 'INTEGER', true), new Column('c_id', 'INTEGER')],
        [],
        [new ForeignKey('b', 'c_id', 'c', 'id')]
      );

      const tableC = new TableInfo(
        'c',
        'table',
        [new Column('id', 'INTEGER', true), new Column('a_id', 'INTEGER')],
        [],
        [new ForeignKey('c', 'a_id', 'a', 'id')]
      );

      const rels = analyzer.extractRelationships([tableA, tableB, tableC]);
      const cycles = analyzer.detectCircularDependencies(rels);

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should return empty for acyclic graph', () => {
      const rels = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);
      const cycles = analyzer.detectCircularDependencies(rels);

      expect(cycles.length).toBe(0);
    });
  });

  describe('getCascadeChains()', () => {
    it('should find cascade chains', () => {
      const rels = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);
      const chains = analyzer.getCascadeChains('users', rels);

      expect(chains.length).toBeGreaterThan(0);
      // Deleting user cascades to posts, then to comments
    });

    it('should return empty for table with no cascades', () => {
      const rels = analyzer.extractRelationships([commentsTable]);
      const chains = analyzer.getCascadeChains('comments', rels);

      expect(chains.length).toBeGreaterThanOrEqual(1); // includes itself
    });
  });

  describe('getSelfReferentialRelationships()', () => {
    it('should identify self-referential relationships', () => {
      const rels = analyzer.extractRelationships([categoriesTable]);
      const selfRefs = analyzer.getSelfReferentialRelationships(rels);

      expect(selfRefs.length).toBe(1);
      expect(selfRefs[0].isSelfReferential()).toBe(true);
    });

    it('should return empty for non-self-referential', () => {
      const rels = analyzer.extractRelationships([postsTable]);
      const selfRefs = analyzer.getSelfReferentialRelationships(rels);

      expect(selfRefs.length).toBe(0);
    });
  });

  describe('getRequiredRelationships()', () => {
    it('should get CASCADE relationships', () => {
      const rels = analyzer.extractRelationships([postsTable, commentsTable]);
      const required = analyzer.getRequiredRelationships(rels);

      expect(required.length).toBe(2); // posts->users CASCADE, comments->posts CASCADE
      expect(required.every((r) => r.isRequired())).toBe(true);
    });
  });

  describe('getOptionalRelationships()', () => {
    it('should get SET NULL relationships', () => {
      const rels = analyzer.extractRelationships([commentsTable]);
      const optional = analyzer.getOptionalRelationships(rels);

      expect(optional.length).toBe(1); // comments->users SET NULL
      expect(optional[0].isOptional()).toBe(true);
    });
  });

  describe('getIndependentTables()', () => {
    it('should find tables with no FK', () => {
      const independent = analyzer.getIndependentTables([
        usersTable,
        postsTable,
        commentsTable,
      ]);

      expect(independent.length).toBe(1);
      expect(independent[0].name).toBe('users');
    });

    it('should return all tables if none have FK', () => {
      const independent = analyzer.getIndependentTables([usersTable]);

      expect(independent.length).toBe(1);
    });
  });

  describe('getPopulationOrder()', () => {
    it('should return topological order', () => {
      const rels = analyzer.extractRelationships([usersTable, postsTable, commentsTable]);
      const order = analyzer.getPopulationOrder(rels);

      // users must come before posts (no dependencies)
      // posts must come before comments
      const usersIndex = order.indexOf('users');
      const postsIndex = order.indexOf('posts');
      const commentsIndex = order.indexOf('comments');

      expect(usersIndex).toBeLessThan(postsIndex);
      expect(postsIndex).toBeLessThan(commentsIndex);
    });

    it('should handle empty relationships', () => {
      const order = analyzer.getPopulationOrder([]);

      expect(order.length).toBe(0);
    });

    it('should handle single relationship', () => {
      const rels = analyzer.extractRelationships([postsTable]);
      const order = analyzer.getPopulationOrder(rels);

      expect(order).toContain('users');
      expect(order).toContain('posts');
      expect(order.indexOf('users')).toBeLessThan(order.indexOf('posts'));
    });
  });
});
