import { describe, it, expect, beforeEach } from 'vitest';
import { Column } from '../entities/Column';
import { ForeignKey } from '../entities/ForeignKey';
import { Index } from '../entities/Index';
import { Relationship } from '../entities/Relationship';
import { TableInfo } from '../entities/TableInfo';
import { Optimization } from '../entities/Optimization';
import { OptimizationService } from './OptimizationService';

describe('OptimizationService', () => {
  let service: OptimizationService;

  beforeEach(() => {
    service = new OptimizationService();
  });

  describe('checkMissingPrimaryKeys()', () => {
    it('should detect tables without primary keys', () => {
      const noPkTable = new TableInfo('logs', 'table', [
        new Column('timestamp', 'TEXT'),
        new Column('message', 'TEXT'),
      ]);

      const optimizations = service.checkMissingPrimaryKeys([noPkTable]);

      expect(optimizations.length).toBe(1);
      expect(optimizations[0].type).toBe('missing_primary_key');
      expect(optimizations[0].table).toBe('logs');
      expect(optimizations[0].priority).toBe('high');
    });

    it('should not flag tables with primary keys', () => {
      const withPk = new TableInfo('users', 'table', [
        new Column('id', 'INTEGER', true),
        new Column('name', 'TEXT'),
      ]);

      const optimizations = service.checkMissingPrimaryKeys([withPk]);

      expect(optimizations.length).toBe(0);
    });

    it('should not flag views', () => {
      const view = new TableInfo('user_view', 'view', [
        new Column('id', 'INTEGER'),
        new Column('name', 'TEXT'),
      ]);

      const optimizations = service.checkMissingPrimaryKeys([view]);

      expect(optimizations.length).toBe(0);
    });
  });

  describe('checkMissingIndexes()', () => {
    it('should detect foreign keys without indexes', () => {
      const postsTable = new TableInfo(
        'posts',
        'table',
        [
          new Column('id', 'INTEGER', true),
          new Column('user_id', 'INTEGER'),
          new Column('title', 'TEXT'),
        ],
        [], // No indexes!
        [new ForeignKey('posts', 'user_id', 'users', 'id')]
      );

      const relationships = [new Relationship('posts', 'user_id', 'users', 'id')];
      const optimizations = service.checkMissingIndexes([postsTable], relationships);

      expect(optimizations.length).toBe(1);
      expect(optimizations[0].type).toBe('missing_index');
      expect(optimizations[0].table).toBe('posts');
      expect(optimizations[0].column).toBe('user_id');
      expect(optimizations[0].priority).toBe('high');
    });

    it('should not flag foreign keys with indexes', () => {
      const postsTable = new TableInfo(
        'posts',
        'table',
        [new Column('id', 'INTEGER', true), new Column('user_id', 'INTEGER')],
        [new Index('idx_user_id', 'posts', ['user_id'])],
        [new ForeignKey('posts', 'user_id', 'users', 'id')]
      );

      const relationships = [new Relationship('posts', 'user_id', 'users', 'id')];
      const optimizations = service.checkMissingIndexes([postsTable], relationships);

      expect(optimizations.length).toBe(0);
    });

    it('should check multiple foreign keys', () => {
      const commentsTable = new TableInfo(
        'comments',
        'table',
        [
          new Column('id', 'INTEGER', true),
          new Column('post_id', 'INTEGER'),
          new Column('user_id', 'INTEGER'),
        ],
        [],
        [
          new ForeignKey('comments', 'post_id', 'posts', 'id'),
          new ForeignKey('comments', 'user_id', 'users', 'id'),
        ]
      );

      const relationships = [
        new Relationship('comments', 'post_id', 'posts', 'id'),
        new Relationship('comments', 'user_id', 'users', 'id'),
      ];
      const optimizations = service.checkMissingIndexes([commentsTable], relationships);

      expect(optimizations.length).toBe(2);
    });
  });

  describe('checkNullableForeignKeys()', () => {
    it('should detect nullable foreign keys', () => {
      const postsTable = new TableInfo(
        'posts',
        'table',
        [
          new Column('id', 'INTEGER', true, false),
          new Column('user_id', 'INTEGER', false, true), // Nullable!
        ],
        [],
        [new ForeignKey('posts', 'user_id', 'users', 'id')]
      );

      const optimizations = service.checkNullableForeignKeys([postsTable]);

      expect(optimizations.length).toBe(1);
      expect(optimizations[0].type).toBe('nullable_foreign_key');
      expect(optimizations[0].priority).toBe('medium');
      expect(optimizations[0].column).toBe('user_id');
    });

    it('should not flag non-nullable foreign keys', () => {
      const postsTable = new TableInfo(
        'posts',
        'table',
        [
          new Column('id', 'INTEGER', true, false),
          new Column('user_id', 'INTEGER', false, false), // NOT nullable
        ],
        [],
        [new ForeignKey('posts', 'user_id', 'users', 'id')]
      );

      const optimizations = service.checkNullableForeignKeys([postsTable]);

      expect(optimizations.length).toBe(0);
    });
  });

  describe('checkRedundantIndexes()', () => {
    it('should detect redundant single-column index', () => {
      const table = new TableInfo(
        'posts',
        'table',
        [new Column('id', 'INTEGER', true), new Column('user_id', 'INTEGER')],
        [
          new Index('idx_user_id', 'posts', ['user_id']),
          new Index('idx_user_id_created', 'posts', ['user_id', 'created_at']),
        ]
      );

      const optimizations = service.checkRedundantIndexes(table);

      expect(optimizations.length).toBeGreaterThan(0);
      expect(optimizations[0].type).toBe('redundant_index');
      expect(optimizations[0].priority).toBe('low');
    });

    it('should not flag non-redundant indexes', () => {
      const table = new TableInfo(
        'posts',
        'table',
        [new Column('id', 'INTEGER', true), new Column('user_id', 'INTEGER')],
        [
          new Index('idx_user_id', 'posts', ['user_id']),
          new Index('idx_created', 'posts', ['created_at']),
        ]
      );

      const optimizations = service.checkRedundantIndexes(table);

      expect(optimizations.length).toBe(0);
    });
  });

  describe('analyzeSchema()', () => {
    it('should combine all optimization checks', () => {
      const noPkTable = new TableInfo('logs', 'table', [new Column('message', 'TEXT')]);

      const postsTable = new TableInfo(
        'posts',
        'table',
        [new Column('id', 'INTEGER', true), new Column('user_id', 'INTEGER', false, true)],
        [],
        [new ForeignKey('posts', 'user_id', 'users', 'id')]
      );

      const relationships = [new Relationship('posts', 'user_id', 'users', 'id')];
      const optimizations = service.analyzeSchema([noPkTable, postsTable], relationships);

      // Should find: missing PK, missing index, nullable FK
      expect(optimizations.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('filterByPriority()', () => {
    it('should filter high priority optimizations', () => {
      const opts = [
        new Optimization('missing_primary_key', 't1', 'r', 's', 'high'),
        new Optimization('nullable_foreign_key', 't2', 'r', 's', 'medium'),
        new Optimization('missing_index', 't3', 'r', 's', 'high'),
      ];

      const high = service.filterByPriority(opts, 'high');

      expect(high.length).toBe(2);
      expect(high.every((opt) => opt.priority === 'high')).toBe(true);
    });
  });

  describe('filterByType()', () => {
    it('should filter by optimization type', () => {
      const opts = [
        new Optimization('missing_index', 't1', 'r', 's', 'high'),
        new Optimization('missing_primary_key', 't2', 'r', 's', 'high'),
        new Optimization('missing_index', 't3', 'r', 's', 'high'),
      ];

      const indexOpts = service.filterByType(opts, 'missing_index');

      expect(indexOpts.length).toBe(2);
      expect(indexOpts.every((opt) => opt.type === 'missing_index')).toBe(true);
    });
  });

  describe('filterByTable()', () => {
    it('should filter by table name', () => {
      const opts = [
        new Optimization('missing_index', 'posts', 'r', 's', 'high'),
        new Optimization('missing_primary_key', 'logs', 'r', 's', 'high'),
        new Optimization('nullable_foreign_key', 'posts', 'r', 's', 'medium'),
      ];

      const postsOpts = service.filterByTable(opts, 'posts');

      expect(postsOpts.length).toBe(2);
      expect(postsOpts.every((opt) => opt.table === 'posts')).toBe(true);
    });
  });

  describe('sortByPriority()', () => {
    it('should sort by priority (high -> medium -> low)', () => {
      const opts = [
        new Optimization('redundant_index', 't1', 'r', 's', 'low'),
        new Optimization('missing_index', 't2', 'r', 's', 'high'),
        new Optimization('nullable_foreign_key', 't3', 'r', 's', 'medium'),
      ];

      const sorted = service.sortByPriority(opts);

      expect(sorted[0].priority).toBe('high');
      expect(sorted[1].priority).toBe('medium');
      expect(sorted[2].priority).toBe('low');
    });

    it('should not mutate original array', () => {
      const opts = [
        new Optimization('redundant_index', 't1', 'r', 's', 'low'),
        new Optimization('missing_index', 't2', 'r', 's', 'high'),
      ];

      const original = [...opts];
      service.sortByPriority(opts);

      expect(opts).toEqual(original);
    });
  });

  describe('getSummary()', () => {
    it('should provide optimization summary', () => {
      const opts = [
        new Optimization('missing_index', 't1', 'r', 's', 'high'),
        new Optimization('missing_index', 't2', 'r', 's', 'high'),
        new Optimization('missing_primary_key', 't3', 'r', 's', 'high'),
        new Optimization('nullable_foreign_key', 't4', 'r', 's', 'medium'),
        new Optimization('redundant_index', 't5', 'r', 's', 'low'),
      ];

      const summary = service.getSummary(opts);

      expect(summary.total).toBe(5);
      expect(summary.byPriority.high).toBe(3);
      expect(summary.byPriority.medium).toBe(1);
      expect(summary.byPriority.low).toBe(1);
      expect(summary.byType.get('missing_index')).toBe(2);
      expect(summary.byType.get('missing_primary_key')).toBe(1);
    });
  });
});
