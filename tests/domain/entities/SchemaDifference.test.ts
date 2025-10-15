import { describe, it, expect } from 'vitest';
import { SchemaDifference } from '../../../src/domain/entities/SchemaDifference';
import { ICEScore } from '../../../src/domain/value-objects/ICEScore';
import { InsightAnalysis } from '../../../src/domain/value-objects/InsightAnalysis';
import { ContextAnalysis } from '../../../src/domain/value-objects/ContextAnalysis';
import { ExecutionPlan } from '../../../src/domain/value-objects/ExecutionPlan';

describe('SchemaDifference', () => {
  const createTestDifference = (
    type: any = 'missing_table',
    insightScore = 9,
    contextScore = 10,
    executionScore = 8
  ) => {
    const insight = new InsightAnalysis({ tableImportance: insightScore }, 'Test insight');
    const context = new ContextAnalysis({ environmentCriticality: contextScore }, 'Test context', 'production');
    const execution = new ExecutionPlan('CREATE TABLE test (...)', { sqlPrecision: executionScore }, 'Test execution');

    return SchemaDifference.create(
      type,
      { tableName: 'users' },
      'Table users is missing in target',
      'development',
      'production',
      insight,
      context,
      execution
    );
  };

  describe('constructor', () => {
    it('should create valid schema difference', () => {
      const diff = createTestDifference();

      expect(diff.type).toBe('missing_table');
      expect(diff.location.tableName).toBe('users');
      expect(diff.sourceEnvironment).toBe('development');
      expect(diff.targetEnvironment).toBe('production');
      expect(diff.iceScore).toBeDefined();
    });

    it('should be immutable after creation', () => {
      const diff = createTestDifference();
      expect(() => {
        (diff as any).type = 'missing_column';
      }).toThrow();
    });

    it('should throw error if table name is empty', () => {
      const insight = new InsightAnalysis({ tableImportance: 5 }, 'Test');
      const context = new ContextAnalysis({ environmentCriticality: 5 }, 'Test');
      const execution = new ExecutionPlan('SQL', { sqlPrecision: 5 }, 'Test');

      expect(() =>
        SchemaDifference.create(
          'missing_table',
          { tableName: '' },
          'Test',
          'dev',
          'prod',
          insight,
          context,
          execution
        )
      ).toThrow('SchemaDifference table name cannot be empty');
    });

    it('should throw error if description is empty', () => {
      const insight = new InsightAnalysis({ tableImportance: 5 }, 'Test');
      const context = new ContextAnalysis({ environmentCriticality: 5 }, 'Test');
      const execution = new ExecutionPlan('SQL', { sqlPrecision: 5 }, 'Test');

      expect(() =>
        SchemaDifference.create(
          'missing_table',
          { tableName: 'users' },
          '',
          'dev',
          'prod',
          insight,
          context,
          execution
        )
      ).toThrow('SchemaDifference description cannot be empty');
    });
  });

  describe('create()', () => {
    it('should calculate ICE score from three dimensions', () => {
      const diff = createTestDifference('missing_table', 9, 10, 8);

      expect(diff.iceScore.insight).toBe(9);
      expect(diff.iceScore.context).toBe(10);
      expect(diff.iceScore.execution).toBe(8);
      expect(diff.iceScore.combined).toBe(7.2); // (9 * 10 * 8) / 100 = 7.2
    });
  });

  describe('severity derivation', () => {
    it('should derive CRITICAL for missing_table with high ICE score', () => {
      const diff = createTestDifference('missing_table', 9, 10, 8);
      expect(diff.severity).toBe('critical');
      expect(diff.iceScore.priority).toBe('high');
    });

    it('should derive CRITICAL for missing_column with high ICE score', () => {
      const diff = createTestDifference('missing_column', 9, 10, 8);
      expect(diff.severity).toBe('critical');
    });

    it('should derive HIGH for other types with high ICE score', () => {
      const diff = createTestDifference('missing_index', 9, 10, 8);
      expect(diff.severity).toBe('high');
      expect(diff.iceScore.priority).toBe('high');
    });

    it('should derive MEDIUM for medium ICE priority', () => {
      const diff = createTestDifference('missing_table', 7, 7, 7);
      expect(diff.severity).toBe('medium');
      expect(diff.iceScore.priority).toBe('medium');
    });

    it('should derive LOW for low ICE priority', () => {
      const diff = createTestDifference('missing_table', 5, 5, 5);
      expect(diff.severity).toBe('low');
      expect(diff.iceScore.priority).toBe('low');
    });
  });

  describe('getFullDescription()', () => {
    it('should format description with table only', () => {
      const diff = createTestDifference();
      const desc = diff.getFullDescription();

      expect(desc).toContain('[CRITICAL]');
      expect(desc).toContain('users');
      expect(desc).toContain('development → production');
    });

    it('should format description with table and column', () => {
      const insight = new InsightAnalysis({ tableImportance: 9 }, 'Test');
      const context = new ContextAnalysis({ environmentCriticality: 10 }, 'Test', 'production');
      const execution = new ExecutionPlan('SQL', { sqlPrecision: 8 }, 'Test');

      const diff = SchemaDifference.create(
        'missing_column',
        { tableName: 'users', columnName: 'email' },
        'Column email is missing',
        'development',
        'production',
        insight,
        context,
        execution
      );

      const desc = diff.getFullDescription();
      expect(desc).toContain('users.email');
    });
  });

  describe('getICEAnalysis()', () => {
    it('should return formatted ICE analysis', () => {
      const diff = createTestDifference();
      const analysis = diff.getICEAnalysis();

      expect(analysis).toContain('ICE Score:');
      expect(analysis).toContain('Insight:');
      expect(analysis).toContain('Context:');
      expect(analysis).toContain('Execution:');
    });
  });

  describe('severity checks', () => {
    it('should check if critical', () => {
      const critical = createTestDifference('missing_table', 9, 10, 8);
      const high = createTestDifference('missing_index', 9, 10, 8);

      expect(critical.isCritical()).toBe(true);
      expect(high.isCritical()).toBe(false);
    });

    it('should check if high severity', () => {
      const critical = createTestDifference('missing_table', 9, 10, 8);
      const high = createTestDifference('missing_index', 9, 10, 8);
      const medium = createTestDifference('missing_index', 7, 7, 7);

      expect(critical.isHighSeverity()).toBe(true);
      expect(high.isHighSeverity()).toBe(true);
      expect(medium.isHighSeverity()).toBe(false);
    });
  });

  describe('affectsTable()', () => {
    it('should check if difference affects specific table', () => {
      const diff = createTestDifference();

      expect(diff.affectsTable('users')).toBe(true);
      expect(diff.affectsTable('orders')).toBe(false);
    });
  });

  describe('difference type checks', () => {
    it('should identify structural differences', () => {
      expect(createTestDifference('missing_table').isStructuralDifference()).toBe(true);
      expect(createTestDifference('missing_column').isStructuralDifference()).toBe(true);
      expect(createTestDifference('extra_table').isStructuralDifference()).toBe(true);
      expect(createTestDifference('extra_column').isStructuralDifference()).toBe(true);
      expect(createTestDifference('type_mismatch').isStructuralDifference()).toBe(true);
      expect(createTestDifference('missing_index').isStructuralDifference()).toBe(false);
    });

    it('should identify constraint differences', () => {
      expect(createTestDifference('missing_index').isConstraintDifference()).toBe(true);
      expect(createTestDifference('missing_foreign_key').isConstraintDifference()).toBe(true);
      expect(createTestDifference('missing_table').isConstraintDifference()).toBe(false);
    });
  });

  describe('getMigrationSQL()', () => {
    it('should return execution plan SQL', () => {
      const diff = createTestDifference();
      const sql = diff.getMigrationSQL();

      expect(sql).toContain('CREATE TABLE');
    });
  });

  describe('location with source and target values', () => {
    it('should store source and target values for type mismatch', () => {
      const insight = new InsightAnalysis({ tableImportance: 7 }, 'Test');
      const context = new ContextAnalysis({ environmentCriticality: 7 }, 'Test');
      const execution = new ExecutionPlan('SQL', { sqlPrecision: 7 }, 'Test');

      const diff = SchemaDifference.create(
        'type_mismatch',
        {
          tableName: 'users',
          columnName: 'age',
          sourceValue: 'INTEGER',
          targetValue: 'TEXT',
        },
        'Type mismatch',
        'dev',
        'prod',
        insight,
        context,
        execution
      );

      expect(diff.location.sourceValue).toBe('INTEGER');
      expect(diff.location.targetValue).toBe('TEXT');
    });
  });

  describe('edge cases', () => {
    it('should trim whitespace from strings', () => {
      const insight = new InsightAnalysis({ tableImportance: 5 }, 'Test');
      const context = new ContextAnalysis({ environmentCriticality: 5 }, 'Test');
      const execution = new ExecutionPlan('SQL', { sqlPrecision: 5 }, 'Test');

      const diff = SchemaDifference.create(
        'missing_table',
        { tableName: '  users  ' },
        '  Description  ',
        '  dev  ',
        '  prod  ',
        insight,
        context,
        execution
      );

      expect(diff.location.tableName).toBe('users');
      expect(diff.description).toBe('Description');
      expect(diff.sourceEnvironment).toBe('dev');
      expect(diff.targetEnvironment).toBe('prod');
    });
  });
});
