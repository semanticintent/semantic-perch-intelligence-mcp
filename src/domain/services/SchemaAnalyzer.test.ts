import { describe, it, expect, beforeEach } from 'vitest';
import { Column } from '../entities/Column';
import { ForeignKey } from '../entities/ForeignKey';
import { Index } from '../entities/Index';
import { TableInfo } from '../entities/TableInfo';
import { SchemaAnalyzer } from './SchemaAnalyzer';

describe('SchemaAnalyzer', () => {
  let analyzer: SchemaAnalyzer;
  let usersTable: TableInfo;
  let postsTable: TableInfo;
  let logsTable: TableInfo;
  let userView: TableInfo;

  beforeEach(() => {
    analyzer = new SchemaAnalyzer();

    // Users table - well-designed with PK
    usersTable = new TableInfo(
      'users',
      'table',
      [
        new Column('id', 'INTEGER', true, false),
        new Column('name', 'TEXT', false, false),
        new Column('email', 'TEXT', false, true),
      ],
      [new Index('idx_users_email', 'users', ['email'], true)]
    );

    // Posts table - has FK and index
    postsTable = new TableInfo(
      'posts',
      'table',
      [
        new Column('id', 'INTEGER', true, false),
        new Column('user_id', 'INTEGER', false, false),
        new Column('title', 'TEXT', false, false),
        new Column('content', 'TEXT', false, true),
      ],
      [new Index('idx_posts_user_id', 'posts', ['user_id'])],
      [new ForeignKey('posts', 'user_id', 'users', 'id', 'CASCADE')]
    );

    // Logs table - no PK (problematic)
    logsTable = new TableInfo('logs', 'table', [
      new Column('timestamp', 'TEXT', false, true),
      new Column('message', 'TEXT', false, true),
    ]);

    // User view
    userView = new TableInfo('user_view', 'view', [
      new Column('id', 'INTEGER'),
      new Column('name', 'TEXT'),
    ]);
  });

  describe('analyzeSchema()', () => {
    it('should analyze overall schema statistics', () => {
      const result = analyzer.analyzeSchema([usersTable, postsTable, logsTable, userView]);

      expect(result.totalTables).toBe(4);
      expect(result.totalColumns).toBe(11);
      expect(result.tablesWithPrimaryKeys).toBe(2); // users, posts
      expect(result.tablesWithoutPrimaryKeys).toBe(2); // logs, user_view
      expect(result.tablesWithForeignKeys).toBe(1); // posts
      expect(result.tablesWithIndexes).toBe(2); // users, posts
      expect(result.totalIndexes).toBe(2);
      expect(result.totalForeignKeys).toBe(1);
      expect(result.totalViews).toBe(1);
    });

    it('should handle empty table array', () => {
      const result = analyzer.analyzeSchema([]);

      expect(result.totalTables).toBe(0);
      expect(result.totalColumns).toBe(0);
      expect(result.tablesWithPrimaryKeys).toBe(0);
    });

    it('should count all columns correctly', () => {
      const result = analyzer.analyzeSchema([usersTable, postsTable]);

      expect(result.totalColumns).toBe(7); // 3 + 4
    });
  });

  describe('analyzeTable()', () => {
    it('should analyze table with primary key', () => {
      const analysis = analyzer.analyzeTable(usersTable);

      expect(analysis.tableName).toBe('users');
      expect(analysis.columnCount).toBe(3);
      expect(analysis.hasPrimaryKey).toBe(true);
      expect(analysis.primaryKeyColumns).toEqual(['id']);
      expect(analysis.requiredColumns).toEqual(['id', 'name']);
      expect(analysis.foreignKeyCount).toBe(0);
      expect(analysis.indexCount).toBe(1);
      expect(analysis.isView).toBe(false);
    });

    it('should analyze table without primary key', () => {
      const analysis = analyzer.analyzeTable(logsTable);

      expect(analysis.hasPrimaryKey).toBe(false);
      expect(analysis.primaryKeyColumns).toEqual([]);
    });

    it('should analyze table with foreign keys', () => {
      const analysis = analyzer.analyzeTable(postsTable);

      expect(analysis.foreignKeyCount).toBe(1);
      expect(analysis.hasPrimaryKey).toBe(true);
    });

    it('should identify views', () => {
      const analysis = analyzer.analyzeTable(userView);

      expect(analysis.isView).toBe(true);
    });
  });

  describe('analyzeColumnTypes()', () => {
    it('should count column type distribution', () => {
      const typeDistribution = analyzer.analyzeColumnTypes([usersTable, postsTable]);

      expect(typeDistribution.get('INTEGER')).toBe(3); // id columns
      expect(typeDistribution.get('TEXT')).toBe(4); // name, email, title, content
    });

    it('should handle empty tables', () => {
      const typeDistribution = analyzer.analyzeColumnTypes([]);

      expect(typeDistribution.size).toBe(0);
    });

    it('should aggregate types across multiple tables', () => {
      const table1 = new TableInfo('t1', 'table', [
        new Column('id', 'INTEGER', true),
        new Column('name', 'TEXT'),
      ]);

      const table2 = new TableInfo('t2', 'table', [
        new Column('id', 'INTEGER', true),
        new Column('value', 'REAL'),
      ]);

      const typeDistribution = analyzer.analyzeColumnTypes([table1, table2]);

      expect(typeDistribution.get('INTEGER')).toBe(2);
      expect(typeDistribution.get('TEXT')).toBe(1);
      expect(typeDistribution.get('REAL')).toBe(1);
    });
  });

  describe('identifyProblematicTables()', () => {
    it('should identify tables without primary keys', () => {
      const problematic = analyzer.identifyProblematicTables([
        usersTable,
        postsTable,
        logsTable,
      ]);

      expect(problematic.length).toBe(1);
      expect(problematic[0].name).toBe('logs');
    });

    it('should identify tables with unindexed foreign keys', () => {
      const badTable = new TableInfo(
        'comments',
        'table',
        [
          new Column('id', 'INTEGER', true),
          new Column('post_id', 'INTEGER'),
          new Column('text', 'TEXT'),
        ],
        [], // No indexes!
        [new ForeignKey('comments', 'post_id', 'posts', 'id')]
      );

      const problematic = analyzer.identifyProblematicTables([usersTable, badTable]);

      expect(problematic.length).toBe(1);
      expect(problematic[0].name).toBe('comments');
    });

    it('should return empty array for well-designed schema', () => {
      const problematic = analyzer.identifyProblematicTables([usersTable, postsTable]);

      expect(problematic.length).toBe(0);
    });

    it('should not flag views as problematic', () => {
      const problematic = analyzer.identifyProblematicTables([userView]);

      // Views without PKs are acceptable
      expect(problematic.length).toBe(0);
    });
  });

  describe('analyzeNullability()', () => {
    it('should analyze nullable columns', () => {
      const analysis = analyzer.analyzeNullability(usersTable);

      expect(analysis.nullableColumns.length).toBe(1); // email
      expect(analysis.nullableColumns[0].name).toBe('email');
      expect(analysis.requiredColumns.length).toBe(2); // id, name
      expect(analysis.nullablePercentage).toBeCloseTo(33.33, 1);
    });

    it('should handle all required columns', () => {
      const strictTable = new TableInfo('strict', 'table', [
        new Column('id', 'INTEGER', true, false),
        new Column('name', 'TEXT', false, false),
      ]);

      const analysis = analyzer.analyzeNullability(strictTable);

      expect(analysis.nullableColumns.length).toBe(0);
      expect(analysis.requiredColumns.length).toBe(2);
      expect(analysis.nullablePercentage).toBe(0);
    });

    it('should handle all nullable columns', () => {
      const analysis = analyzer.analyzeNullability(logsTable);

      expect(analysis.nullableColumns.length).toBe(2);
      expect(analysis.requiredColumns.length).toBe(0);
      expect(analysis.nullablePercentage).toBe(100);
    });
  });

  describe('getTablesByComplexity()', () => {
    it('should sort tables by complexity', () => {
      const sorted = analyzer.getTablesByComplexity([usersTable, postsTable, logsTable]);

      // posts: 4 columns + 1 index + 1 FK = 6
      // users: 3 columns + 1 index + 0 FK = 4
      // logs: 2 columns + 0 index + 0 FK = 2
      expect(sorted[0].table.name).toBe('posts');
      expect(sorted[0].complexity).toBe(6);
      expect(sorted[1].table.name).toBe('users');
      expect(sorted[1].complexity).toBe(4);
      expect(sorted[2].table.name).toBe('logs');
      expect(sorted[2].complexity).toBe(2);
    });

    it('should handle single table', () => {
      const sorted = analyzer.getTablesByComplexity([usersTable]);

      expect(sorted.length).toBe(1);
      expect(sorted[0].table.name).toBe('users');
    });

    it('should handle empty array', () => {
      const sorted = analyzer.getTablesByComplexity([]);

      expect(sorted.length).toBe(0);
    });
  });

  describe('identifyOrphanedTables()', () => {
    it('should identify tables with no relationships', () => {
      const orphaned = analyzer.identifyOrphanedTables([usersTable, postsTable, logsTable]);

      expect(orphaned.length).toBe(1);
      expect(orphaned[0].name).toBe('logs');
    });

    it('should not flag tables with incoming foreign keys', () => {
      // users is referenced by posts, so not orphaned
      const orphaned = analyzer.identifyOrphanedTables([usersTable, postsTable]);

      expect(orphaned.length).toBe(0);
    });

    it('should not flag tables with outgoing foreign keys', () => {
      // posts references users, so not orphaned
      const orphaned = analyzer.identifyOrphanedTables([postsTable]);

      expect(orphaned.length).toBe(0);
    });

    it('should not flag views as orphaned', () => {
      const orphaned = analyzer.identifyOrphanedTables([userView]);

      expect(orphaned.length).toBe(0);
    });

    it('should handle complex relationship networks', () => {
      const commentsTable = new TableInfo(
        'comments',
        'table',
        [new Column('id', 'INTEGER', true), new Column('post_id', 'INTEGER')],
        [],
        [new ForeignKey('comments', 'post_id', 'posts', 'id')]
      );

      const tagsTable = new TableInfo('tags', 'table', [
        new Column('id', 'INTEGER', true),
        new Column('name', 'TEXT'),
      ]);

      const orphaned = analyzer.identifyOrphanedTables([
        usersTable,
        postsTable,
        commentsTable,
        tagsTable,
      ]);

      // Only tags is orphaned (no FK in/out)
      expect(orphaned.length).toBe(1);
      expect(orphaned[0].name).toBe('tags');
    });
  });
});
