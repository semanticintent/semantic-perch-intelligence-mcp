import { describe, it, expect } from 'vitest';
import { Relationship } from './Relationship';

describe('Relationship', () => {
  describe('constructor', () => {
    it('should create relationship with all parameters', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id', 'CASCADE', 'CASCADE');

      expect(rel.fromTable).toBe('posts');
      expect(rel.fromColumn).toBe('user_id');
      expect(rel.toTable).toBe('users');
      expect(rel.toColumn).toBe('id');
      expect(rel.onDelete).toBe('CASCADE');
      expect(rel.onUpdate).toBe('CASCADE');
    });

    it('should create relationship with null actions', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id');

      expect(rel.onDelete).toBe(null);
      expect(rel.onUpdate).toBe(null);
    });

    it('should trim whitespace', () => {
      const rel = new Relationship('  posts  ', '  user_id  ', '  users  ', '  id  ');

      expect(rel.fromTable).toBe('posts');
      expect(rel.fromColumn).toBe('user_id');
      expect(rel.toTable).toBe('users');
      expect(rel.toColumn).toBe('id');
    });

    it('should throw error for empty fromTable', () => {
      expect(() => new Relationship('', 'user_id', 'users', 'id')).toThrow(
        'Relationship fromTable cannot be empty'
      );
    });

    it('should throw error for empty fromColumn', () => {
      expect(() => new Relationship('posts', '', 'users', 'id')).toThrow(
        'Relationship fromColumn cannot be empty'
      );
    });

    it('should throw error for empty toTable', () => {
      expect(() => new Relationship('posts', 'user_id', '', 'id')).toThrow(
        'Relationship toTable cannot be empty'
      );
    });

    it('should throw error for empty toColumn', () => {
      expect(() => new Relationship('posts', 'user_id', 'users', '')).toThrow(
        'Relationship toColumn cannot be empty'
      );
    });

    it('should be immutable', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id');

      expect(Object.isFrozen(rel)).toBe(true);
    });
  });

  describe('isRequired()', () => {
    it('should return true for CASCADE', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id', 'CASCADE');

      expect(rel.isRequired()).toBe(true);
    });

    it('should return true for RESTRICT', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id', 'RESTRICT');

      expect(rel.isRequired()).toBe(true);
    });

    it('should return false for SET NULL', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id', 'SET NULL');

      expect(rel.isRequired()).toBe(false);
    });

    it('should return false for null', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id', null);

      expect(rel.isRequired()).toBe(false);
    });
  });

  describe('cascadesOnDelete()', () => {
    it('should return true for CASCADE', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id', 'CASCADE');

      expect(rel.cascadesOnDelete()).toBe(true);
    });

    it('should return false for RESTRICT', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id', 'RESTRICT');

      expect(rel.cascadesOnDelete()).toBe(false);
    });

    it('should return false for null', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id');

      expect(rel.cascadesOnDelete()).toBe(false);
    });
  });

  describe('isOptional()', () => {
    it('should return true for SET NULL', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id', 'SET NULL');

      expect(rel.isOptional()).toBe(true);
    });

    it('should return true for NO ACTION', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id', 'NO ACTION');

      expect(rel.isOptional()).toBe(true);
    });

    it('should return true for null', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id', null);

      expect(rel.isOptional()).toBe(true);
    });

    it('should return false for CASCADE', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id', 'CASCADE');

      expect(rel.isOptional()).toBe(false);
    });

    it('should return false for RESTRICT', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id', 'RESTRICT');

      expect(rel.isOptional()).toBe(false);
    });
  });

  describe('getDescription()', () => {
    it('should return relationship description', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id');

      expect(rel.getDescription()).toBe('posts.user_id → users.id');
    });
  });

  describe('isSelfReferential()', () => {
    it('should return true for self-referential relationship', () => {
      const rel = new Relationship('categories', 'parent_id', 'categories', 'id');

      expect(rel.isSelfReferential()).toBe(true);
    });

    it('should return false for relationship between different tables', () => {
      const rel = new Relationship('posts', 'user_id', 'users', 'id');

      expect(rel.isSelfReferential()).toBe(false);
    });
  });
});
