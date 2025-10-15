import { describe, it, expect } from 'vitest';
import { SchemaComparisonResult } from '../../../src/domain/entities/SchemaComparisonResult';
import { SchemaDifference } from '../../../src/domain/entities/SchemaDifference';
import { InsightAnalysis } from '../../../src/domain/value-objects/InsightAnalysis';
import { ContextAnalysis } from '../../../src/domain/value-objects/ContextAnalysis';
import { ExecutionPlan } from '../../../src/domain/value-objects/ExecutionPlan';

describe('SchemaComparisonResult', () => {
  const createTestDifference = (
    type: any,
    tableName: string,
    insightScore: number,
    contextScore: number,
    executionScore: number
  ) => {
    const insight = new InsightAnalysis({ tableImportance: insightScore }, `Test insight for ${tableName}`);
    const context = new ContextAnalysis({ environmentCriticality: contextScore }, 'Test context', 'production');
    const execution = new ExecutionPlan(`SQL for ${tableName}`, { sqlPrecision: executionScore }, 'Test execution');

    return SchemaDifference.create(
      type,
      { tableName },
      `${type} in ${tableName}`,
      'development',
      'production',
      insight,
      context,
      execution
    );
  };

  describe('constructor', () => {
    it('should create valid comparison result with no differences', () => {
      const result = new SchemaComparisonResult('development', 'production', 10, 10, []);

      expect(result.metadata.sourceEnvironment).toBe('development');
      expect(result.metadata.targetEnvironment).toBe('production');
      expect(result.metadata.sourceTableCount).toBe(10);
      expect(result.metadata.targetTableCount).toBe(10);
      expect(result.differences).toHaveLength(0);
      expect(result.summary.totalDifferences).toBe(0);
    });

    it('should create comparison result with differences', () => {
      const diff1 = createTestDifference('missing_table', 'users', 9, 10, 8);
      const diff2 = createTestDifference('missing_column', 'orders', 8, 9, 7);

      const result = new SchemaComparisonResult('development', 'production', 5, 4, [diff1, diff2]);

      expect(result.differences).toHaveLength(2);
      expect(result.summary.totalDifferences).toBe(2);
    });

    it('should sort differences by ICE score (highest first)', () => {
      const low = createTestDifference('missing_index', 'table1', 5, 5, 5); // Combined: 1.25
      const high = createTestDifference('missing_table', 'table2', 9, 10, 8); // Combined: 7.2
      const medium = createTestDifference('missing_column', 'table3', 7, 7, 7); // Combined: 3.43

      const result = new SchemaComparisonResult('dev', 'prod', 3, 3, [low, medium, high]);

      expect(result.differences[0].location.tableName).toBe('table2'); // Highest
      expect(result.differences[1].location.tableName).toBe('table3'); // Medium
      expect(result.differences[2].location.tableName).toBe('table1'); // Lowest
    });

    it('should be immutable after creation', () => {
      const result = new SchemaComparisonResult('dev', 'prod', 1, 1, []);
      expect(() => {
        (result as any).metadata = {};
      }).toThrow();
    });

    it('should throw error if source environment is empty', () => {
      expect(() => new SchemaComparisonResult('', 'prod', 1, 1, [])).toThrow(
        'SchemaComparisonResult source environment cannot be empty'
      );
    });

    it('should throw error if target environment is empty', () => {
      expect(() => new SchemaComparisonResult('dev', '', 1, 1, [])).toThrow(
        'SchemaComparisonResult target environment cannot be empty'
      );
    });

    it('should throw error if table counts are negative', () => {
      expect(() => new SchemaComparisonResult('dev', 'prod', -1, 1, [])).toThrow(
        'SchemaComparisonResult table counts cannot be negative'
      );
      expect(() => new SchemaComparisonResult('dev', 'prod', 1, -1, [])).toThrow(
        'SchemaComparisonResult table counts cannot be negative'
      );
    });
  });

  describe('isIdentical()', () => {
    it('should return true when no differences', () => {
      const result = new SchemaComparisonResult('dev', 'prod', 5, 5, []);
      expect(result.isIdentical()).toBe(true);
    });

    it('should return false when differences exist', () => {
      const diff = createTestDifference('missing_table', 'users', 9, 10, 8);
      const result = new SchemaComparisonResult('dev', 'prod', 5, 4, [diff]);
      expect(result.isIdentical()).toBe(false);
    });
  });

  describe('severity checks', () => {
    it('should detect critical differences', () => {
      const critical = createTestDifference('missing_table', 'users', 9, 10, 8);
      const result = new SchemaComparisonResult('dev', 'prod', 1, 0, [critical]);

      expect(result.hasCriticalDifferences()).toBe(true);
      expect(result.summary.criticalCount).toBe(1);
    });

    it('should detect high-severity differences', () => {
      const high = createTestDifference('missing_index', 'users', 9, 10, 8);
      const result = new SchemaComparisonResult('dev', 'prod', 1, 1, [high]);

      expect(result.hasHighSeverityDifferences()).toBe(true);
      expect(result.summary.highCount).toBe(1);
    });
  });

  describe('getCriticalDifferences()', () => {
    it('should return only critical differences', () => {
      const critical = createTestDifference('missing_table', 'users', 9, 10, 8);
      const high = createTestDifference('missing_index', 'orders', 9, 10, 8);
      const medium = createTestDifference('missing_index', 'products', 7, 7, 7);

      const result = new SchemaComparisonResult('dev', 'prod', 3, 2, [critical, high, medium]);
      const criticalDiffs = result.getCriticalDifferences();

      expect(criticalDiffs).toHaveLength(1);
      expect(criticalDiffs[0].severity).toBe('critical');
    });
  });

  describe('getDifferencesBySeverity()', () => {
    it('should filter by severity level', () => {
      const critical = createTestDifference('missing_table', 'users', 9, 10, 8);
      const high = createTestDifference('missing_index', 'orders', 9, 10, 8);
      const medium = createTestDifference('missing_index', 'products', 7, 7, 7);
      const low = createTestDifference('missing_index', 'logs', 5, 5, 5);

      const result = new SchemaComparisonResult('dev', 'prod', 4, 3, [critical, high, medium, low]);

      expect(result.getDifferencesBySeverity('critical')).toHaveLength(1);
      expect(result.getDifferencesBySeverity('high')).toHaveLength(1);
      expect(result.getDifferencesBySeverity('medium')).toHaveLength(1);
      expect(result.getDifferencesBySeverity('low')).toHaveLength(1);
    });
  });

  describe('getStructuralDifferences()', () => {
    it('should return only structural differences', () => {
      const table = createTestDifference('missing_table', 'users', 9, 10, 8);
      const column = createTestDifference('missing_column', 'orders', 8, 9, 7);
      const index = createTestDifference('missing_index', 'products', 7, 7, 7);

      const result = new SchemaComparisonResult('dev', 'prod', 3, 2, [table, column, index]);
      const structural = result.getStructuralDifferences();

      expect(structural).toHaveLength(2);
      expect(structural[0].isStructuralDifference()).toBe(true);
      expect(structural[1].isStructuralDifference()).toBe(true);
    });
  });

  describe('getConstraintDifferences()', () => {
    it('should return only constraint differences', () => {
      const table = createTestDifference('missing_table', 'users', 9, 10, 8);
      const index = createTestDifference('missing_index', 'orders', 7, 7, 7);
      const fk = createTestDifference('missing_foreign_key', 'products', 7, 7, 7);

      const result = new SchemaComparisonResult('dev', 'prod', 3, 2, [table, index, fk]);
      const constraints = result.getConstraintDifferences();

      expect(constraints).toHaveLength(2);
      expect(constraints[0].isConstraintDifference()).toBe(true);
      expect(constraints[1].isConstraintDifference()).toBe(true);
    });
  });

  describe('getDifferencesForTable()', () => {
    it('should return differences for specific table', () => {
      const diff1 = createTestDifference('missing_column', 'users', 8, 9, 7);
      const diff2 = createTestDifference('missing_index', 'users', 7, 7, 7);
      const diff3 = createTestDifference('missing_table', 'orders', 9, 10, 8);

      const result = new SchemaComparisonResult('dev', 'prod', 2, 1, [diff1, diff2, diff3]);
      const usersDiffs = result.getDifferencesForTable('users');

      expect(usersDiffs).toHaveLength(2);
      expect(usersDiffs[0].affectsTable('users')).toBe(true);
      expect(usersDiffs[1].affectsTable('users')).toBe(true);
    });
  });

  describe('summary calculation', () => {
    it('should calculate correct summary statistics', () => {
      const critical = createTestDifference('missing_table', 'users', 9, 10, 8);
      const high = createTestDifference('missing_index', 'orders', 9, 10, 8);
      const medium1 = createTestDifference('missing_column', 'products', 7, 7, 7);
      const medium2 = createTestDifference('type_mismatch', 'logs', 7, 7, 7);
      const low = createTestDifference('missing_foreign_key', 'sessions', 5, 5, 5);

      const result = new SchemaComparisonResult('dev', 'prod', 5, 4, [critical, high, medium1, medium2, low]);

      expect(result.summary.totalDifferences).toBe(5);
      expect(result.summary.criticalCount).toBe(1);
      expect(result.summary.highCount).toBe(1);
      expect(result.summary.mediumCount).toBe(2);
      expect(result.summary.lowCount).toBe(1);
      expect(result.summary.structuralDifferences).toBe(3); // table, column, type
      expect(result.summary.constraintDifferences).toBe(2); // index, fk
      expect(result.summary.missingTables).toBe(1);
      expect(result.summary.missingColumns).toBe(1);
      expect(result.summary.typeMismatches).toBe(1);
      expect(result.summary.missingIndexes).toBe(1);
      expect(result.summary.missingForeignKeys).toBe(1);
    });
  });

  describe('getFormattedSummary()', () => {
    it('should format summary for identical schemas', () => {
      const result = new SchemaComparisonResult('dev', 'prod', 5, 5, []);
      const summary = result.getFormattedSummary();

      expect(summary).toContain('development → production');
      expect(summary).toContain('✅ Schemas are identical');
    });

    it('should format summary with differences', () => {
      const diff1 = createTestDifference('missing_table', 'users', 9, 10, 8);
      const diff2 = createTestDifference('missing_column', 'orders', 8, 9, 7);

      const result = new SchemaComparisonResult('dev', 'prod', 2, 1, [diff1, diff2]);
      const summary = result.getFormattedSummary();

      expect(summary).toContain('Total differences: 2');
      expect(summary).toContain('Critical: 2');
      expect(summary).toContain('Missing tables: 1');
      expect(summary).toContain('Missing columns: 1');
    });
  });

  describe('getMigrationPlan()', () => {
    it('should return no migration for identical schemas', () => {
      const result = new SchemaComparisonResult('dev', 'prod', 5, 5, []);
      const plan = result.getMigrationPlan();

      expect(plan).toContain('No migration needed');
    });

    it('should generate migration plan with SQL statements', () => {
      const diff1 = createTestDifference('missing_table', 'users', 9, 10, 8);
      const diff2 = createTestDifference('missing_index', 'orders', 9, 10, 8);

      const result = new SchemaComparisonResult('dev', 'prod', 2, 1, [diff1, diff2]);
      const plan = result.getMigrationPlan();

      expect(plan).toContain('-- Schema Migration Plan');
      expect(plan).toContain('-- From: development');
      expect(plan).toContain('-- To: production');
      expect(plan).toContain('-- === CRITICAL ===');
      expect(plan).toContain('-- === HIGH ===');
      expect(plan).toContain('SQL for users');
      expect(plan).toContain('SQL for orders');
    });

    it('should group by severity in migration plan', () => {
      const critical = createTestDifference('missing_table', 'users', 9, 10, 8);
      const high = createTestDifference('missing_index', 'orders', 9, 10, 8);
      const medium = createTestDifference('missing_index', 'products', 7, 7, 7);
      const low = createTestDifference('missing_index', 'logs', 5, 5, 5);

      const result = new SchemaComparisonResult('dev', 'prod', 4, 3, [critical, high, medium, low]);
      const plan = result.getMigrationPlan();

      const criticalIndex = plan.indexOf('-- === CRITICAL ===');
      const highIndex = plan.indexOf('-- === HIGH ===');
      const mediumIndex = plan.indexOf('-- === MEDIUM ===');
      const lowIndex = plan.indexOf('-- === LOW ===');

      expect(criticalIndex).toBeGreaterThan(0);
      expect(highIndex).toBeGreaterThan(criticalIndex);
      expect(mediumIndex).toBeGreaterThan(highIndex);
      expect(lowIndex).toBeGreaterThan(mediumIndex);
    });
  });

  describe('edge cases', () => {
    it('should handle zero table counts', () => {
      const result = new SchemaComparisonResult('dev', 'prod', 0, 0, []);
      expect(result.metadata.sourceTableCount).toBe(0);
      expect(result.metadata.targetTableCount).toBe(0);
    });

    it('should trim whitespace from environment names', () => {
      const result = new SchemaComparisonResult('  dev  ', '  prod  ', 1, 1, []);
      expect(result.metadata.sourceEnvironment).toBe('dev');
      expect(result.metadata.targetEnvironment).toBe('prod');
    });
  });
});
