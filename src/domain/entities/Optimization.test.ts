import { describe, it, expect } from 'vitest';
import { Optimization } from './Optimization';

describe('Optimization', () => {
  describe('constructor', () => {
    it('should create optimization with all parameters', () => {
      const opt = new Optimization(
        'missing_index',
        'posts',
        'Foreign key without index',
        'CREATE INDEX idx_posts_user_id ON posts(user_id)',
        'high',
        'user_id'
      );

      expect(opt.type).toBe('missing_index');
      expect(opt.table).toBe('posts');
      expect(opt.column).toBe('user_id');
      expect(opt.reason).toBe('Foreign key without index');
      expect(opt.suggestion).toContain('CREATE INDEX');
      expect(opt.priority).toBe('high');
    });

    it('should create optimization without column', () => {
      const opt = new Optimization(
        'missing_primary_key',
        'users',
        'Table without primary key',
        'ALTER TABLE users ADD PRIMARY KEY (id)',
        'high'
      );

      expect(opt.column).toBe(null);
    });

    it('should throw error for empty table', () => {
      expect(
        () =>
          new Optimization(
            'missing_index',
            '',
            'reason',
            'suggestion',
            'high'
          )
      ).toThrow('Optimization table cannot be empty');
    });

    it('should throw error for empty reason', () => {
      expect(
        () =>
          new Optimization(
            'missing_index',
            'users',
            '',
            'suggestion',
            'high'
          )
      ).toThrow('Optimization reason cannot be empty');
    });

    it('should throw error for empty suggestion', () => {
      expect(
        () =>
          new Optimization(
            'missing_index',
            'users',
            'reason',
            '',
            'high'
          )
      ).toThrow('Optimization suggestion cannot be empty');
    });

    it('should be immutable', () => {
      const opt = new Optimization(
        'missing_index',
        'users',
        'reason',
        'suggestion',
        'high'
      );

      expect(Object.isFrozen(opt)).toBe(true);
    });
  });

  describe('isHighPriority()', () => {
    it('should return true for high priority', () => {
      const opt = new Optimization(
        'missing_primary_key',
        'users',
        'reason',
        'suggestion',
        'high'
      );

      expect(opt.isHighPriority()).toBe(true);
    });

    it('should return false for medium priority', () => {
      const opt = new Optimization(
        'inefficient_type',
        'users',
        'reason',
        'suggestion',
        'medium'
      );

      expect(opt.isHighPriority()).toBe(false);
    });

    it('should return false for low priority', () => {
      const opt = new Optimization(
        'redundant_index',
        'users',
        'reason',
        'suggestion',
        'low'
      );

      expect(opt.isHighPriority()).toBe(false);
    });
  });

  describe('affectsColumn()', () => {
    it('should return true when column matches', () => {
      const opt = new Optimization(
        'missing_index',
        'posts',
        'reason',
        'suggestion',
        'high',
        'user_id'
      );

      expect(opt.affectsColumn('user_id')).toBe(true);
    });

    it('should return false when column does not match', () => {
      const opt = new Optimization(
        'missing_index',
        'posts',
        'reason',
        'suggestion',
        'high',
        'user_id'
      );

      expect(opt.affectsColumn('category_id')).toBe(false);
    });

    it('should return false when optimization has no column', () => {
      const opt = new Optimization(
        'missing_primary_key',
        'users',
        'reason',
        'suggestion',
        'high'
      );

      expect(opt.affectsColumn('id')).toBe(false);
    });
  });

  describe('getDescription()', () => {
    it('should include column in description', () => {
      const opt = new Optimization(
        'missing_index',
        'posts',
        'Foreign key without index',
        'CREATE INDEX...',
        'high',
        'user_id'
      );

      expect(opt.getDescription()).toBe(
        '[HIGH] missing_index on posts.user_id: Foreign key without index'
      );
    });

    it('should format without column', () => {
      const opt = new Optimization(
        'missing_primary_key',
        'users',
        'No primary key defined',
        'ALTER TABLE...',
        'high'
      );

      expect(opt.getDescription()).toBe(
        '[HIGH] missing_primary_key on users: No primary key defined'
      );
    });

    it('should format medium priority', () => {
      const opt = new Optimization(
        'inefficient_type',
        'users',
        'TEXT instead of INTEGER',
        'ALTER...',
        'medium'
      );

      expect(opt.getDescription()).toContain('[MEDIUM]');
    });
  });

  describe('isIndexOptimization()', () => {
    it('should return true for missing_index', () => {
      const opt = new Optimization(
        'missing_index',
        'users',
        'reason',
        'suggestion',
        'high'
      );

      expect(opt.isIndexOptimization()).toBe(true);
    });

    it('should return true for redundant_index', () => {
      const opt = new Optimization(
        'redundant_index',
        'users',
        'reason',
        'suggestion',
        'low'
      );

      expect(opt.isIndexOptimization()).toBe(true);
    });

    it('should return false for missing_primary_key', () => {
      const opt = new Optimization(
        'missing_primary_key',
        'users',
        'reason',
        'suggestion',
        'high'
      );

      expect(opt.isIndexOptimization()).toBe(false);
    });
  });
});
