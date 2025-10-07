import { describe, it, expect } from 'vitest';
import { Column } from './Column';

describe('Column', () => {
  describe('constructor', () => {
    it('should create column with valid parameters', () => {
      const column = new Column('id', 'INTEGER', true, false, null);

      expect(column.name).toBe('id');
      expect(column.type).toBe('INTEGER');
      expect(column.isPrimaryKey).toBe(true);
      expect(column.isNullable).toBe(false);
      expect(column.defaultValue).toBe(null);
    });

    it('should create column with default parameters', () => {
      const column = new Column('name', 'TEXT');

      expect(column.name).toBe('name');
      expect(column.type).toBe('TEXT');
      expect(column.isPrimaryKey).toBe(false);
      expect(column.isNullable).toBe(true);
      expect(column.defaultValue).toBe(null);
    });

    it('should normalize column type to uppercase', () => {
      const column = new Column('age', 'integer');

      expect(column.type).toBe('INTEGER');
    });

    it('should trim whitespace from column name', () => {
      const column = new Column('  name  ', 'TEXT');

      expect(column.name).toBe('name');
    });

    it('should throw error for empty column name', () => {
      expect(() => new Column('', 'TEXT')).toThrow('Column name cannot be empty');
    });

    it('should throw error for whitespace-only column name', () => {
      expect(() => new Column('   ', 'TEXT')).toThrow('Column name cannot be empty');
    });

    it('should throw error for empty column type', () => {
      expect(() => new Column('name', '')).toThrow('Column type cannot be empty');
    });

    it('should be immutable (frozen)', () => {
      const column = new Column('id', 'INTEGER');

      expect(Object.isFrozen(column)).toBe(true);
    });
  });

  describe('isRequired()', () => {
    it('should return true for NOT NULL column without default', () => {
      const column = new Column('id', 'INTEGER', false, false, null);

      expect(column.isRequired()).toBe(true);
    });

    it('should return false for nullable column', () => {
      const column = new Column('name', 'TEXT', false, true, null);

      expect(column.isRequired()).toBe(false);
    });

    it('should return false for column with default value', () => {
      const column = new Column('status', 'TEXT', false, false, "'active'");

      expect(column.isRequired()).toBe(false);
    });

    it('should return false for nullable column with default', () => {
      const column = new Column('count', 'INTEGER', false, true, '0');

      expect(column.isRequired()).toBe(false);
    });
  });

  describe('hasDefault()', () => {
    it('should return true when default value is set', () => {
      const column = new Column('status', 'TEXT', false, true, "'active'");

      expect(column.hasDefault()).toBe(true);
    });

    it('should return false when default value is null', () => {
      const column = new Column('name', 'TEXT', false, true, null);

      expect(column.hasDefault()).toBe(false);
    });
  });

  describe('getTypeCategory()', () => {
    it('should categorize TEXT as text', () => {
      const column = new Column('name', 'TEXT');

      expect(column.getTypeCategory()).toBe('text');
    });

    it('should categorize VARCHAR as text', () => {
      const column = new Column('email', 'VARCHAR(255)');

      expect(column.getTypeCategory()).toBe('text');
    });

    it('should categorize CHAR as text', () => {
      const column = new Column('code', 'CHAR(10)');

      expect(column.getTypeCategory()).toBe('text');
    });

    it('should categorize INTEGER as numeric', () => {
      const column = new Column('age', 'INTEGER');

      expect(column.getTypeCategory()).toBe('numeric');
    });

    it('should categorize REAL as numeric', () => {
      const column = new Column('price', 'REAL');

      expect(column.getTypeCategory()).toBe('numeric');
    });

    it('should categorize NUMERIC as numeric', () => {
      const column = new Column('amount', 'NUMERIC(10,2)');

      expect(column.getTypeCategory()).toBe('numeric');
    });

    it('should categorize BLOB as blob', () => {
      const column = new Column('data', 'BLOB');

      expect(column.getTypeCategory()).toBe('blob');
    });

    it('should categorize unknown type as unknown', () => {
      const column = new Column('custom', 'CUSTOM_TYPE');

      expect(column.getTypeCategory()).toBe('unknown');
    });
  });

  describe('semantic properties', () => {
    it('should preserve primary key semantic', () => {
      const column = new Column('id', 'INTEGER', true);

      expect(column.isPrimaryKey).toBe(true);
    });

    it('should preserve nullable semantic', () => {
      const column = new Column('email', 'TEXT', false, true);

      expect(column.isNullable).toBe(true);
    });

    it('should preserve default value semantic', () => {
      const column = new Column('created_at', 'TEXT', false, false, 'CURRENT_TIMESTAMP');

      expect(column.defaultValue).toBe('CURRENT_TIMESTAMP');
    });
  });
});
