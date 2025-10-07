import { describe, it, expect } from 'vitest';
import { Column } from './Column';
import { ForeignKey } from './ForeignKey';
import { Index } from './Index';
import { TableInfo } from './TableInfo';

describe('TableInfo', () => {
  const createTestTable = () => {
    const columns = [
      new Column('id', 'INTEGER', true, false),
      new Column('name', 'TEXT', false, false),
      new Column('email', 'TEXT', false, true),
    ];
    const indexes = [new Index('idx_email', 'users', ['email'], true)];
    const foreignKeys: ForeignKey[] = [];

    return new TableInfo('users', 'table', columns, indexes, foreignKeys);
  };

  describe('constructor', () => {
    it('should create table with all metadata', () => {
      const table = createTestTable();

      expect(table.name).toBe('users');
      expect(table.type).toBe('table');
      expect(table.columns.length).toBe(3);
      expect(table.indexes.length).toBe(1);
      expect(table.foreignKeys.length).toBe(0);
    });

    it('should create table without indexes and foreign keys', () => {
      const columns = [new Column('id', 'INTEGER', true)];
      const table = new TableInfo('simple', 'table', columns);

      expect(table.indexes.length).toBe(0);
      expect(table.foreignKeys.length).toBe(0);
    });

    it('should create view type', () => {
      const columns = [new Column('id', 'INTEGER')];
      const table = new TableInfo('user_view', 'view', columns);

      expect(table.type).toBe('view');
      expect(table.isView()).toBe(true);
    });

    it('should throw error for empty table name', () => {
      const columns = [new Column('id', 'INTEGER')];
      expect(() => new TableInfo('', 'table', columns)).toThrow('Table name cannot be empty');
    });

    it('should throw error for empty columns array', () => {
      expect(() => new TableInfo('users', 'table', [])).toThrow(
        'Table must have at least one column'
      );
    });

    it('should be immutable', () => {
      const table = createTestTable();

      expect(Object.isFrozen(table)).toBe(true);
      expect(Object.isFrozen(table.columns)).toBe(true);
      expect(Object.isFrozen(table.indexes)).toBe(true);
      expect(Object.isFrozen(table.foreignKeys)).toBe(true);
    });
  });

  describe('hasPrimaryKey()', () => {
    it('should return true when table has primary key', () => {
      const table = createTestTable();

      expect(table.hasPrimaryKey()).toBe(true);
    });

    it('should return false when table has no primary key', () => {
      const columns = [new Column('name', 'TEXT')];
      const table = new TableInfo('users', 'table', columns);

      expect(table.hasPrimaryKey()).toBe(false);
    });
  });

  describe('getPrimaryKeyColumns()', () => {
    it('should return primary key columns', () => {
      const table = createTestTable();
      const pkColumns = table.getPrimaryKeyColumns();

      expect(pkColumns.length).toBe(1);
      expect(pkColumns[0].name).toBe('id');
    });

    it('should return empty array when no primary key', () => {
      const columns = [new Column('name', 'TEXT')];
      const table = new TableInfo('users', 'table', columns);

      expect(table.getPrimaryKeyColumns()).toEqual([]);
    });

    it('should return multiple columns for composite primary key', () => {
      const columns = [
        new Column('user_id', 'INTEGER', true),
        new Column('role_id', 'INTEGER', true),
        new Column('name', 'TEXT'),
      ];
      const table = new TableInfo('user_roles', 'table', columns);
      const pkColumns = table.getPrimaryKeyColumns();

      expect(pkColumns.length).toBe(2);
      expect(pkColumns[0].name).toBe('user_id');
      expect(pkColumns[1].name).toBe('role_id');
    });
  });

  describe('hasForeignKeys()', () => {
    it('should return true when table has foreign keys', () => {
      const columns = [new Column('id', 'INTEGER'), new Column('user_id', 'INTEGER')];
      const foreignKeys = [new ForeignKey('posts', 'user_id', 'users', 'id')];
      const table = new TableInfo('posts', 'table', columns, [], foreignKeys);

      expect(table.hasForeignKeys()).toBe(true);
    });

    it('should return false when table has no foreign keys', () => {
      const table = createTestTable();

      expect(table.hasForeignKeys()).toBe(false);
    });
  });

  describe('hasIndexOnColumn()', () => {
    it('should return true when column is indexed', () => {
      const table = createTestTable();

      expect(table.hasIndexOnColumn('email')).toBe(true);
    });

    it('should return false when column is not indexed', () => {
      const table = createTestTable();

      expect(table.hasIndexOnColumn('name')).toBe(false);
    });
  });

  describe('getColumn()', () => {
    it('should return column by name', () => {
      const table = createTestTable();
      const column = table.getColumn('email');

      expect(column).toBeDefined();
      expect(column?.name).toBe('email');
    });

    it('should return undefined for non-existent column', () => {
      const table = createTestTable();

      expect(table.getColumn('nonexistent')).toBeUndefined();
    });
  });

  describe('getForeignKeyColumns()', () => {
    it('should return foreign key column names', () => {
      const columns = [new Column('id', 'INTEGER'), new Column('user_id', 'INTEGER')];
      const foreignKeys = [
        new ForeignKey('posts', 'user_id', 'users', 'id'),
        new ForeignKey('posts', 'user_id', 'accounts', 'user_id'),
      ];
      const table = new TableInfo('posts', 'table', columns, [], foreignKeys);

      expect(table.getForeignKeyColumns()).toEqual(['user_id']);
    });

    it('should return empty array when no foreign keys', () => {
      const table = createTestTable();

      expect(table.getForeignKeyColumns()).toEqual([]);
    });
  });

  describe('isView()', () => {
    it('should return true for view', () => {
      const columns = [new Column('id', 'INTEGER')];
      const table = new TableInfo('user_view', 'view', columns);

      expect(table.isView()).toBe(true);
    });

    it('should return false for table', () => {
      const table = createTestTable();

      expect(table.isView()).toBe(false);
    });
  });

  describe('getRequiredColumns()', () => {
    it('should return required columns', () => {
      const table = createTestTable();
      const required = table.getRequiredColumns();

      expect(required.length).toBe(2); // id and name (NOT NULL, no default)
      expect(required[0].name).toBe('id');
      expect(required[1].name).toBe('name');
    });

    it('should return empty array when no required columns', () => {
      const columns = [new Column('name', 'TEXT', false, true)];
      const table = new TableInfo('users', 'table', columns);

      expect(table.getRequiredColumns()).toEqual([]);
    });
  });

  describe('getColumnCount()', () => {
    it('should return column count', () => {
      const table = createTestTable();

      expect(table.getColumnCount()).toBe(3);
    });
  });

  describe('getIndexCount()', () => {
    it('should return index count', () => {
      const table = createTestTable();

      expect(table.getIndexCount()).toBe(1);
    });
  });

  describe('getForeignKeyCount()', () => {
    it('should return foreign key count', () => {
      const columns = [new Column('id', 'INTEGER'), new Column('user_id', 'INTEGER')];
      const foreignKeys = [new ForeignKey('posts', 'user_id', 'users', 'id')];
      const table = new TableInfo('posts', 'table', columns, [], foreignKeys);

      expect(table.getForeignKeyCount()).toBe(1);
    });
  });

  describe('getReferencedTables()', () => {
    it('should return referenced table names', () => {
      const columns = [
        new Column('id', 'INTEGER'),
        new Column('user_id', 'INTEGER'),
        new Column('category_id', 'INTEGER'),
      ];
      const foreignKeys = [
        new ForeignKey('posts', 'user_id', 'users', 'id'),
        new ForeignKey('posts', 'category_id', 'categories', 'id'),
      ];
      const table = new TableInfo('posts', 'table', columns, [], foreignKeys);

      expect(table.getReferencedTables()).toEqual(['users', 'categories']);
    });

    it('should return unique table names', () => {
      const columns = [new Column('id', 'INTEGER'), new Column('user_id', 'INTEGER')];
      const foreignKeys = [
        new ForeignKey('posts', 'user_id', 'users', 'id'),
        new ForeignKey('posts', 'user_id', 'users', 'account_id'),
      ];
      const table = new TableInfo('posts', 'table', columns, [], foreignKeys);

      expect(table.getReferencedTables()).toEqual(['users']);
    });
  });
});
