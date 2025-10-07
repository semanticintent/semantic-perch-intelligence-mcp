import { describe, it, expect } from 'vitest';
import { Index } from './Index';

describe('Index', () => {
  describe('constructor', () => {
    it('should create index with valid parameters', () => {
      const index = new Index('idx_users_email', 'users', ['email'], true);

      expect(index.name).toBe('idx_users_email');
      expect(index.tableName).toBe('users');
      expect(index.columns).toEqual(['email']);
      expect(index.isUnique).toBe(true);
    });

    it('should create non-unique index by default', () => {
      const index = new Index('idx_posts_user_id', 'posts', ['user_id']);

      expect(index.isUnique).toBe(false);
    });

    it('should create composite index with multiple columns', () => {
      const index = new Index('idx_posts_user_created', 'posts', ['user_id', 'created_at']);

      expect(index.columns).toEqual(['user_id', 'created_at']);
      expect(index.columns.length).toBe(2);
    });

    it('should trim whitespace from index name', () => {
      const index = new Index('  idx_test  ', 'users', ['id']);

      expect(index.name).toBe('idx_test');
    });

    it('should trim whitespace from table name', () => {
      const index = new Index('idx_test', '  users  ', ['id']);

      expect(index.tableName).toBe('users');
    });

    it('should trim whitespace from column names', () => {
      const index = new Index('idx_test', 'users', ['  email  ', '  name  ']);

      expect(index.columns).toEqual(['email', 'name']);
    });

    it('should throw error for empty index name', () => {
      expect(() => new Index('', 'users', ['id'])).toThrow('Index name cannot be empty');
    });

    it('should throw error for empty table name', () => {
      expect(() => new Index('idx_test', '', ['id'])).toThrow('Table name cannot be empty');
    });

    it('should throw error for empty columns array', () => {
      expect(() => new Index('idx_test', 'users', [])).toThrow(
        'Index must have at least one column'
      );
    });

    it('should throw error for empty column name in array', () => {
      expect(() => new Index('idx_test', 'users', ['id', ''])).toThrow(
        'Index column names cannot be empty'
      );
    });

    it('should be immutable (frozen)', () => {
      const index = new Index('idx_test', 'users', ['id']);

      expect(Object.isFrozen(index)).toBe(true);
    });

    it('should have immutable columns array', () => {
      const index = new Index('idx_test', 'users', ['id', 'name']);

      expect(Object.isFrozen(index.columns)).toBe(true);
    });
  });

  describe('isComposite()', () => {
    it('should return true for composite index', () => {
      const index = new Index('idx_composite', 'users', ['email', 'name']);

      expect(index.isComposite()).toBe(true);
    });

    it('should return false for single-column index', () => {
      const index = new Index('idx_single', 'users', ['email']);

      expect(index.isComposite()).toBe(false);
    });

    it('should return true for three-column index', () => {
      const index = new Index('idx_multi', 'posts', ['user_id', 'status', 'created_at']);

      expect(index.isComposite()).toBe(true);
    });
  });

  describe('coversColumn()', () => {
    it('should return true when column is covered', () => {
      const index = new Index('idx_test', 'users', ['email', 'name']);

      expect(index.coversColumn('email')).toBe(true);
      expect(index.coversColumn('name')).toBe(true);
    });

    it('should return false when column is not covered', () => {
      const index = new Index('idx_test', 'users', ['email']);

      expect(index.coversColumn('name')).toBe(false);
    });

    it('should be case-sensitive', () => {
      const index = new Index('idx_test', 'users', ['email']);

      expect(index.coversColumn('EMAIL')).toBe(false);
    });
  });

  describe('hasColumnAsPrefix()', () => {
    it('should return true when column is first in index', () => {
      const index = new Index('idx_test', 'users', ['email', 'name']);

      expect(index.hasColumnAsPrefix('email')).toBe(true);
    });

    it('should return false when column is not first', () => {
      const index = new Index('idx_test', 'users', ['email', 'name']);

      expect(index.hasColumnAsPrefix('name')).toBe(false);
    });

    it('should return true for single-column index', () => {
      const index = new Index('idx_test', 'users', ['email']);

      expect(index.hasColumnAsPrefix('email')).toBe(true);
    });

    it('should return false when column not in index', () => {
      const index = new Index('idx_test', 'users', ['email']);

      expect(index.hasColumnAsPrefix('name')).toBe(false);
    });
  });

  describe('getColumnCount()', () => {
    it('should return 1 for single-column index', () => {
      const index = new Index('idx_test', 'users', ['email']);

      expect(index.getColumnCount()).toBe(1);
    });

    it('should return 2 for two-column index', () => {
      const index = new Index('idx_test', 'users', ['email', 'name']);

      expect(index.getColumnCount()).toBe(2);
    });

    it('should return 3 for three-column index', () => {
      const index = new Index('idx_test', 'posts', ['user_id', 'status', 'created_at']);

      expect(index.getColumnCount()).toBe(3);
    });
  });

  describe('semantic properties', () => {
    it('should preserve uniqueness semantic', () => {
      const uniqueIndex = new Index('idx_unique', 'users', ['email'], true);
      const regularIndex = new Index('idx_regular', 'posts', ['user_id'], false);

      expect(uniqueIndex.isUnique).toBe(true);
      expect(regularIndex.isUnique).toBe(false);
    });

    it('should preserve column order semantic for composite indexes', () => {
      const index = new Index('idx_test', 'posts', ['user_id', 'created_at', 'status']);

      expect(index.columns[0]).toBe('user_id');
      expect(index.columns[1]).toBe('created_at');
      expect(index.columns[2]).toBe('status');
    });
  });
});
