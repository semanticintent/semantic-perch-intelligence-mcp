import { describe, it, expect, beforeEach } from 'vitest';
import { Environment } from '../value-objects/Environment';
import { Column } from './Column';
import { ForeignKey } from './ForeignKey';
import { DatabaseSchema } from './DatabaseSchema';
import { TableInfo } from './TableInfo';

describe('DatabaseSchema', () => {
  let testDate: Date;
  let usersTable: TableInfo;
  let postsTable: TableInfo;

  beforeEach(() => {
    testDate = new Date('2025-01-01T12:00:00Z');

    usersTable = new TableInfo(
      'users',
      'table',
      [new Column('id', 'INTEGER', true), new Column('name', 'TEXT')]
    );

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
  });

  describe('constructor', () => {
    it('should create schema with all properties', () => {
      const schema = new DatabaseSchema(
        'my_database',
        Environment.DEVELOPMENT,
        [usersTable, postsTable],
        testDate
      );

      expect(schema.name).toBe('my_database');
      expect(schema.environment).toBe(Environment.DEVELOPMENT);
      expect(schema.tables.length).toBe(2);
      expect(schema.fetchedAt).toBe(testDate);
    });

    it('should trim database name', () => {
      const schema = new DatabaseSchema(
        '  my_database  ',
        Environment.PRODUCTION,
        [usersTable],
        testDate
      );

      expect(schema.name).toBe('my_database');
    });

    it('should throw error for empty database name', () => {
      expect(
        () => new DatabaseSchema('', Environment.DEVELOPMENT, [usersTable], testDate)
      ).toThrow('Database name cannot be empty');
    });

    it('should throw error for empty tables array', () => {
      expect(() => new DatabaseSchema('db', Environment.DEVELOPMENT, [], testDate)).toThrow(
        'Database must have at least one table'
      );
    });

    it('should be immutable', () => {
      const schema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable], testDate);

      expect(Object.isFrozen(schema)).toBe(true);
      expect(Object.isFrozen(schema.tables)).toBe(true);
    });
  });

  describe('getTable()', () => {
    it('should return table by name', () => {
      const schema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable], testDate);
      const table = schema.getTable('users');

      expect(table).toBeDefined();
      expect(table?.name).toBe('users');
    });

    it('should return undefined for non-existent table', () => {
      const schema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable], testDate);

      expect(schema.getTable('nonexistent')).toBeUndefined();
    });
  });

  describe('getTablesThatReference()', () => {
    it('should return tables that reference specified table', () => {
      const schema = new DatabaseSchema(
        'db',
        Environment.DEVELOPMENT,
        [usersTable, postsTable],
        testDate
      );
      const referencingTables = schema.getTablesThatReference('users');

      expect(referencingTables.length).toBe(1);
      expect(referencingTables[0].name).toBe('posts');
    });

    it('should return empty array when no tables reference specified table', () => {
      const schema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable], testDate);
      const referencingTables = schema.getTablesThatReference('users');

      expect(referencingTables).toEqual([]);
    });
  });

  describe('getTablesReferencedBy()', () => {
    it('should return tables referenced by specified table', () => {
      const schema = new DatabaseSchema(
        'db',
        Environment.DEVELOPMENT,
        [usersTable, postsTable],
        testDate
      );
      const referenced = schema.getTablesReferencedBy('posts');

      expect(referenced).toEqual(['users']);
    });

    it('should return empty array when table has no references', () => {
      const schema = new DatabaseSchema(
        'db',
        Environment.DEVELOPMENT,
        [usersTable, postsTable],
        testDate
      );
      const referenced = schema.getTablesReferencedBy('users');

      expect(referenced).toEqual([]);
    });

    it('should return empty array for non-existent table', () => {
      const schema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable], testDate);
      const referenced = schema.getTablesReferencedBy('nonexistent');

      expect(referenced).toEqual([]);
    });
  });

  describe('getTableCount()', () => {
    it('should return table count', () => {
      const schema = new DatabaseSchema(
        'db',
        Environment.DEVELOPMENT,
        [usersTable, postsTable],
        testDate
      );

      expect(schema.getTableCount()).toBe(2);
    });
  });

  describe('getTablesWithoutPrimaryKey()', () => {
    it('should return tables without primary keys', () => {
      const noPkTable = new TableInfo('logs', 'table', [new Column('message', 'TEXT')]);
      const schema = new DatabaseSchema(
        'db',
        Environment.DEVELOPMENT,
        [usersTable, noPkTable],
        testDate
      );

      const tables = schema.getTablesWithoutPrimaryKey();
      expect(tables.length).toBe(1);
      expect(tables[0].name).toBe('logs');
    });

    it('should return empty array when all tables have primary keys', () => {
      const schema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable], testDate);

      expect(schema.getTablesWithoutPrimaryKey()).toEqual([]);
    });
  });

  describe('getTablesWithForeignKeys()', () => {
    it('should return tables with foreign keys', () => {
      const schema = new DatabaseSchema(
        'db',
        Environment.DEVELOPMENT,
        [usersTable, postsTable],
        testDate
      );

      const tables = schema.getTablesWithForeignKeys();
      expect(tables.length).toBe(1);
      expect(tables[0].name).toBe('posts');
    });

    it('should return empty array when no tables have foreign keys', () => {
      const schema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable], testDate);

      expect(schema.getTablesWithForeignKeys()).toEqual([]);
    });
  });

  describe('getViews()', () => {
    it('should return all views', () => {
      const view = new TableInfo('user_view', 'view', [new Column('id', 'INTEGER')]);
      const schema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable, view], testDate);

      const views = schema.getViews();
      expect(views.length).toBe(1);
      expect(views[0].name).toBe('user_view');
    });

    it('should return empty array when no views', () => {
      const schema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable], testDate);

      expect(schema.getViews()).toEqual([]);
    });
  });

  describe('getBaseTables()', () => {
    it('should return all base tables (non-views)', () => {
      const view = new TableInfo('user_view', 'view', [new Column('id', 'INTEGER')]);
      const schema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable, view], testDate);

      const tables = schema.getBaseTables();
      expect(tables.length).toBe(1);
      expect(tables[0].name).toBe('users');
    });
  });

  describe('isFresh()', () => {
    it('should return true for freshly fetched schema', () => {
      const now = new Date();
      const schema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable], now);

      expect(schema.isFresh(10)).toBe(true);
    });

    it('should return false for stale schema', () => {
      const old = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
      const schema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable], old);

      expect(schema.isFresh(10)).toBe(false);
    });

    it('should use 10 minutes as default freshness threshold', () => {
      const old = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
      const schema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable], old);

      expect(schema.isFresh()).toBe(false);
    });
  });

  describe('getAgeInMinutes()', () => {
    it('should return age in minutes', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const schema = new DatabaseSchema(
        'db',
        Environment.DEVELOPMENT,
        [usersTable],
        tenMinutesAgo
      );

      const age = schema.getAgeInMinutes();
      expect(age).toBeGreaterThanOrEqual(9.9);
      expect(age).toBeLessThanOrEqual(10.1);
    });
  });

  describe('semantic intent preservation', () => {
    it('should preserve environment semantic', () => {
      const prodSchema = new DatabaseSchema('db', Environment.PRODUCTION, [usersTable], testDate);
      const devSchema = new DatabaseSchema('db', Environment.DEVELOPMENT, [usersTable], testDate);

      expect(prodSchema.environment).toBe(Environment.PRODUCTION);
      expect(devSchema.environment).toBe(Environment.DEVELOPMENT);
    });
  });
});
