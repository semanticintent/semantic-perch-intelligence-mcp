import { describe, it, expect } from 'vitest';
import { ExecutionPlan } from '../../../src/domain/value-objects/ExecutionPlan';

describe('ExecutionPlan', () => {
  describe('constructor', () => {
    it('should create valid execution plan', () => {
      const plan = new ExecutionPlan(
        'CREATE INDEX idx_users_email ON users(email)',
        {
          sqlPrecision: 10,
          migrationComplexity: 9,
          rollbackSafety: 10,
        },
        'Create index on email column'
      );

      expect(plan.score).toBe(9.7); // Average of 10, 9, 10
      expect(plan.sql).toBe('CREATE INDEX idx_users_email ON users(email)');
      expect(plan.reasoning).toBe('Create index on email column');
      expect(plan.factors.sqlPrecision).toBe(10);
    });

    it('should be immutable after creation', () => {
      const plan = new ExecutionPlan('SELECT 1', { sqlPrecision: 5 }, 'Test');
      expect(() => {
        (plan as any).score = 10;
      }).toThrow();
    });

    it('should throw error if SQL is empty', () => {
      expect(() => new ExecutionPlan('', { sqlPrecision: 5 }, 'Test')).toThrow('ExecutionPlan SQL cannot be empty');
      expect(() => new ExecutionPlan('   ', { sqlPrecision: 5 }, 'Test')).toThrow(
        'ExecutionPlan SQL cannot be empty'
      );
    });

    it('should throw error if reasoning is empty', () => {
      expect(() => new ExecutionPlan('SELECT 1', { sqlPrecision: 5 }, '')).toThrow(
        'ExecutionPlan reasoning cannot be empty'
      );
    });

    it('should throw error if no factors provided', () => {
      expect(() => new ExecutionPlan('SELECT 1', {}, 'Test')).toThrow('ExecutionPlan must have at least one factor');
    });

    it('should throw error if factor is out of range', () => {
      expect(() => new ExecutionPlan('SELECT 1', { sqlPrecision: -1 }, 'Test')).toThrow(
        'ExecutionPlan factor must be 0-10'
      );
      expect(() => new ExecutionPlan('SELECT 1', { sqlPrecision: 11 }, 'Test')).toThrow(
        'ExecutionPlan factor must be 0-10'
      );
    });

    it('should trim whitespace from SQL and reasoning', () => {
      const plan = new ExecutionPlan('  SELECT 1  ', { sqlPrecision: 5 }, '  Test  ');
      expect(plan.sql).toBe('SELECT 1');
      expect(plan.reasoning).toBe('Test');
    });
  });

  describe('forAddPrimaryKey()', () => {
    it('should create plan for adding primary key', () => {
      const plan = ExecutionPlan.forAddPrimaryKey('users');

      expect(plan.sql).toContain('ALTER TABLE users');
      expect(plan.sql).toContain('ADD COLUMN id INTEGER PRIMARY KEY');
      expect(plan.reasoning).toContain('users');
      expect(plan.reasoning).toContain('primary key');
      expect(plan.factors.sqlPrecision).toBe(9);
      expect(plan.factors.rollbackSafety).toBe(7);
    });

    it('should have medium migration complexity', () => {
      const plan = ExecutionPlan.forAddPrimaryKey('users');
      expect(plan.factors.migrationComplexity).toBe(6);
    });

    it('should have high testing clarity', () => {
      const plan = ExecutionPlan.forAddPrimaryKey('users');
      expect(plan.factors.testingClarity).toBe(9);
    });
  });

  describe('forCreateIndex()', () => {
    it('should create plan for creating index', () => {
      const plan = ExecutionPlan.forCreateIndex('users', 'email');

      expect(plan.sql).toContain('CREATE INDEX idx_users_email ON users(email)');
      expect(plan.reasoning).toContain('users.email');
      expect(plan.factors.sqlPrecision).toBe(10);
      expect(plan.factors.rollbackSafety).toBe(10);
    });

    it('should have very high execution score (safe operation)', () => {
      const plan = ExecutionPlan.forCreateIndex('orders', 'user_id');

      expect(plan.score).toBeGreaterThan(9);
      expect(plan.isSafe()).toBe(true);
      expect(plan.isHighRisk()).toBe(false);
    });

    it('should have minimal downtime', () => {
      const plan = ExecutionPlan.forCreateIndex('users', 'email');
      expect(plan.factors.downtime).toBe(9);
    });
  });

  describe('forNullableForeignKeyReview()', () => {
    it('should create plan for business logic review', () => {
      const plan = ExecutionPlan.forNullableForeignKeyReview('orders', 'user_id');

      expect(plan.sql).toContain('Review:');
      expect(plan.sql).toContain('orders.user_id');
      expect(plan.sql).toContain('NOT NULL');
      expect(plan.reasoning).toContain('business logic');
    });

    it('should have lower execution score (requires analysis)', () => {
      const plan = ExecutionPlan.forNullableForeignKeyReview('orders', 'user_id');

      expect(plan.score).toBeLessThan(6);
      expect(plan.factors.sqlPrecision).toBe(5);
      expect(plan.factors.migrationComplexity).toBe(4);
    });

    it('should have low testing clarity', () => {
      const plan = ExecutionPlan.forNullableForeignKeyReview('orders', 'user_id');
      expect(plan.factors.testingClarity).toBe(4);
    });
  });

  describe('forSchemaDifference()', () => {
    it('should create plan for missing table', () => {
      const plan = ExecutionPlan.forSchemaDifference('missing_table', 'users', 'CREATE TABLE users (...)');

      expect(plan.sql).toContain('CREATE TABLE users');
      expect(plan.reasoning).toContain('users');
      expect(plan.reasoning).toContain('missing table');
      expect(plan.factors.rollbackSafety).toBe(6);
    });

    it('should create plan for missing column', () => {
      const plan = ExecutionPlan.forSchemaDifference('missing_column', 'email', 'ALTER TABLE users ADD COLUMN email');

      expect(plan.sql).toContain('ALTER TABLE');
      expect(plan.reasoning).toContain('email');
      expect(plan.reasoning).toContain('missing column');
      expect(plan.factors.rollbackSafety).toBe(8);
    });

    it('should create plan for type mismatch', () => {
      const plan = ExecutionPlan.forSchemaDifference('type_mismatch', 'age', 'ALTER TABLE users ALTER COLUMN age');

      expect(plan.reasoning).toContain('type mismatch');
      expect(plan.reasoning).toContain('age');
      expect(plan.factors.rollbackSafety).toBe(5);
    });

    it('should rank safety: missing_column > missing_table > type_mismatch', () => {
      const missingTable = ExecutionPlan.forSchemaDifference('missing_table', 'test', 'CREATE TABLE test (...)');
      const missingColumn = ExecutionPlan.forSchemaDifference('missing_column', 'test', 'ALTER TABLE test ADD test');
      const typeMismatch = ExecutionPlan.forSchemaDifference('type_mismatch', 'test', 'ALTER TABLE test ALTER test');

      expect(missingColumn.score).toBeGreaterThan(missingTable.score);
      expect(missingTable.score).toBeGreaterThan(typeMismatch.score);
    });
  });

  describe('custom()', () => {
    it('should create custom execution plan', () => {
      const plan = ExecutionPlan.custom(
        'CREATE UNIQUE INDEX idx_users_email ON users(email)',
        {
          sqlPrecision: 9,
          migrationComplexity: 8,
          rollbackSafety: 9,
        },
        'Create unique index'
      );

      expect(plan.sql).toContain('CREATE UNIQUE INDEX');
      expect(plan.reasoning).toBe('Create unique index');
      expect(plan.factors.sqlPrecision).toBe(9);
    });
  });

  describe('getDescription()', () => {
    it('should return formatted description', () => {
      const plan = new ExecutionPlan('SELECT 1', { sqlPrecision: 8 }, 'Test query');
      const description = plan.getDescription();

      expect(description).toContain('Execution:');
      expect(description).toContain('8.0/10');
      expect(description).toContain('Test query');
    });
  });

  describe('getFormattedSQL()', () => {
    it('should return SQL string', () => {
      const plan = new ExecutionPlan('SELECT * FROM users', { sqlPrecision: 5 }, 'Test');
      expect(plan.getFormattedSQL()).toBe('SELECT * FROM users');
    });
  });

  describe('isHighRisk()', () => {
    it('should return true for low execution scores', () => {
      const plan = new ExecutionPlan('COMPLEX SQL', { sqlPrecision: 3, migrationComplexity: 2 }, 'Risky operation');

      expect(plan.isHighRisk()).toBe(true);
      expect(plan.score).toBeLessThan(5.0);
    });

    it('should return false for high execution scores', () => {
      const plan = ExecutionPlan.forCreateIndex('users', 'email');
      expect(plan.isHighRisk()).toBe(false);
    });
  });

  describe('isSafe()', () => {
    it('should return true for high execution scores', () => {
      const plan = ExecutionPlan.forCreateIndex('users', 'email');
      expect(plan.isSafe()).toBe(true);
      expect(plan.score).toBeGreaterThanOrEqual(7.0);
    });

    it('should return false for low execution scores', () => {
      const plan = new ExecutionPlan('RISKY SQL', { sqlPrecision: 3 }, 'Test');
      expect(plan.isSafe()).toBe(false);
    });
  });

  describe('score calculation', () => {
    it('should handle single factor', () => {
      const plan = new ExecutionPlan('SELECT 1', { sqlPrecision: 7 }, 'Test');
      expect(plan.score).toBe(7.0);
    });

    it('should handle all factors', () => {
      const plan = new ExecutionPlan(
        'SELECT 1',
        {
          sqlPrecision: 10,
          migrationComplexity: 8,
          rollbackSafety: 6,
          testingClarity: 9,
          downtime: 7,
        },
        'All factors'
      );

      // Average of 10, 8, 6, 9, 7 = 8.0
      expect(plan.score).toBe(8.0);
    });

    it('should round to 1 decimal place', () => {
      const plan = new ExecutionPlan(
        'SELECT 1',
        {
          sqlPrecision: 7,
          migrationComplexity: 8,
          rollbackSafety: 9,
        },
        'Decimal test'
      );

      // Average of 7, 8, 9 = 8.0 (clean)
      expect(plan.score).toBe(8.0);
    });
  });

  describe('edge cases', () => {
    it('should handle all zeros', () => {
      const plan = new ExecutionPlan(
        'SELECT 1',
        {
          sqlPrecision: 0,
          migrationComplexity: 0,
        },
        'Zero test'
      );

      expect(plan.score).toBe(0);
    });

    it('should handle all max scores', () => {
      const plan = new ExecutionPlan(
        'SELECT 1',
        {
          sqlPrecision: 10,
          migrationComplexity: 10,
          rollbackSafety: 10,
        },
        'Max test'
      );

      expect(plan.score).toBe(10.0);
    });
  });
});
