import { describe, it, expect } from 'vitest';
import { InsightAnalysis } from '../../../src/domain/value-objects/InsightAnalysis';

describe('InsightAnalysis', () => {
  describe('constructor', () => {
    it('should create valid insight analysis', () => {
      const analysis = new InsightAnalysis(
        {
          tableImportance: 8,
          dataIntegrity: 9,
          semanticClarity: 10,
        },
        'Test reasoning'
      );

      expect(analysis.score).toBe(9.0); // Average of 8, 9, 10
      expect(analysis.reasoning).toBe('Test reasoning');
      expect(analysis.factors.tableImportance).toBe(8);
    });

    it('should calculate score as average of factors', () => {
      const analysis = new InsightAnalysis(
        {
          tableImportance: 6,
          relationshipImpact: 8,
          dataIntegrity: 10,
        },
        'Average test'
      );

      expect(analysis.score).toBe(8.0); // (6 + 8 + 10) / 3 = 8.0
    });

    it('should be immutable after creation', () => {
      const analysis = new InsightAnalysis({ tableImportance: 5 }, 'Test');
      expect(() => {
        (analysis as any).score = 10;
      }).toThrow();
    });

    it('should throw error if reasoning is empty', () => {
      expect(() => new InsightAnalysis({ tableImportance: 5 }, '')).toThrow(
        'InsightAnalysis reasoning cannot be empty'
      );
      expect(() => new InsightAnalysis({ tableImportance: 5 }, '   ')).toThrow(
        'InsightAnalysis reasoning cannot be empty'
      );
    });

    it('should throw error if no factors provided', () => {
      expect(() => new InsightAnalysis({}, 'Test')).toThrow('InsightAnalysis must have at least one factor');
    });

    it('should throw error if factor is out of range', () => {
      expect(() => new InsightAnalysis({ tableImportance: -1 }, 'Test')).toThrow(
        'InsightAnalysis factor must be 0-10'
      );
      expect(() => new InsightAnalysis({ tableImportance: 11 }, 'Test')).toThrow(
        'InsightAnalysis factor must be 0-10'
      );
    });
  });

  describe('forMissingPrimaryKey()', () => {
    it('should create analysis for table without relationships', () => {
      const analysis = InsightAnalysis.forMissingPrimaryKey('users', false);

      expect(analysis.score).toBeGreaterThan(8); // High score - serious issue
      expect(analysis.reasoning).toContain('users');
      expect(analysis.reasoning).toContain('primary key');
      expect(analysis.factors.dataIntegrity).toBe(9);
      expect(analysis.factors.semanticClarity).toBe(10);
    });

    it('should create higher score for table with relationships', () => {
      const withRels = InsightAnalysis.forMissingPrimaryKey('users', true);
      const withoutRels = InsightAnalysis.forMissingPrimaryKey('users', false);

      expect(withRels.score).toBeGreaterThan(withoutRels.score);
      expect(withRels.factors.tableImportance).toBe(9);
      expect(withoutRels.factors.tableImportance).toBe(7);
    });
  });

  describe('forMissingForeignKeyIndex()', () => {
    it('should create analysis for infrequently joined FK', () => {
      const analysis = InsightAnalysis.forMissingForeignKeyIndex('orders', 'user_id', false);

      expect(analysis.score).toBeGreaterThan(6);
      expect(analysis.reasoning).toContain('orders.user_id');
      expect(analysis.reasoning).toContain('index');
      expect(analysis.factors.semanticClarity).toBe(9);
    });

    it('should create higher score for frequently joined FK', () => {
      const frequent = InsightAnalysis.forMissingForeignKeyIndex('orders', 'user_id', true);
      const infrequent = InsightAnalysis.forMissingForeignKeyIndex('orders', 'user_id', false);

      expect(frequent.score).toBeGreaterThan(infrequent.score);
      expect(frequent.factors.tableImportance).toBe(8);
      expect(frequent.factors.relationshipImpact).toBe(9);
    });
  });

  describe('forNullableForeignKey()', () => {
    it('should create analysis with medium scores', () => {
      const analysis = InsightAnalysis.forNullableForeignKey('orders', 'user_id');

      expect(analysis.score).toBeGreaterThan(5);
      expect(analysis.score).toBeLessThan(8);
      expect(analysis.reasoning).toContain('orders.user_id');
      expect(analysis.reasoning).toContain('nullable');
      expect(analysis.factors.tableImportance).toBe(5);
      expect(analysis.factors.dataIntegrity).toBe(6);
    });
  });

  describe('forSchemaDifference()', () => {
    it('should create high-severity analysis for missing table in production', () => {
      const analysis = InsightAnalysis.forSchemaDifference('missing_table', 'users', true);

      expect(analysis.score).toBeGreaterThan(8);
      expect(analysis.reasoning).toContain('users');
      expect(analysis.reasoning).toContain('missing');
      expect(analysis.factors.tableImportance).toBe(9); // Production
    });

    it('should create lower-severity analysis for missing table in dev', () => {
      const prod = InsightAnalysis.forSchemaDifference('missing_table', 'users', true);
      const dev = InsightAnalysis.forSchemaDifference('missing_table', 'users', false);

      expect(prod.score).toBeGreaterThan(dev.score);
      expect(dev.factors.tableImportance).toBe(6); // Development
    });

    it('should create analysis for missing column', () => {
      const analysis = InsightAnalysis.forSchemaDifference('missing_column', 'email', true);

      expect(analysis.reasoning).toContain('email');
      expect(analysis.reasoning).toContain('missing');
      expect(analysis.factors.dataIntegrity).toBe(7);
    });

    it('should create analysis for type mismatch', () => {
      const analysis = InsightAnalysis.forSchemaDifference('type_mismatch', 'age', true);

      expect(analysis.reasoning).toContain('age');
      expect(analysis.reasoning).toContain('mismatch');
      expect(analysis.factors.dataIntegrity).toBe(6);
    });

    it('should rank severity: missing_table > missing_column > type_mismatch', () => {
      const missingTable = InsightAnalysis.forSchemaDifference('missing_table', 'test', true);
      const missingColumn = InsightAnalysis.forSchemaDifference('missing_column', 'test', true);
      const typeMismatch = InsightAnalysis.forSchemaDifference('type_mismatch', 'test', true);

      expect(missingTable.score).toBeGreaterThan(missingColumn.score);
      expect(missingColumn.score).toBeGreaterThan(typeMismatch.score);
    });
  });

  describe('getDescription()', () => {
    it('should return formatted description', () => {
      const analysis = new InsightAnalysis({ tableImportance: 8 }, 'Test reasoning');
      const description = analysis.getDescription();

      expect(description).toContain('Insight:');
      expect(description).toContain('8.0/10');
      expect(description).toContain('Test reasoning');
    });
  });

  describe('score calculation', () => {
    it('should handle single factor', () => {
      const analysis = new InsightAnalysis({ tableImportance: 7 }, 'Test');
      expect(analysis.score).toBe(7.0);
    });

    it('should handle all factors', () => {
      const analysis = new InsightAnalysis(
        {
          tableImportance: 10,
          relationshipImpact: 8,
          dataIntegrity: 6,
          semanticClarity: 9,
          patternRecognition: 7,
        },
        'All factors'
      );

      // Average of 10, 8, 6, 9, 7 = 8.0
      expect(analysis.score).toBe(8.0);
    });

    it('should round to 1 decimal place', () => {
      const analysis = new InsightAnalysis(
        {
          tableImportance: 7,
          relationshipImpact: 8,
          dataIntegrity: 9,
        },
        'Decimal test'
      );

      // Average of 7, 8, 9 = 8.0 (clean)
      expect(analysis.score).toBe(8.0);
    });
  });

  describe('edge cases', () => {
    it('should handle all zeros', () => {
      const analysis = new InsightAnalysis(
        {
          tableImportance: 0,
          relationshipImpact: 0,
        },
        'Zero test'
      );

      expect(analysis.score).toBe(0);
    });

    it('should handle all max scores', () => {
      const analysis = new InsightAnalysis(
        {
          tableImportance: 10,
          relationshipImpact: 10,
          dataIntegrity: 10,
        },
        'Max test'
      );

      expect(analysis.score).toBe(10.0);
    });

    it('should trim whitespace from reasoning', () => {
      const analysis = new InsightAnalysis({ tableImportance: 5 }, '  Test reasoning  ');
      expect(analysis.reasoning).toBe('Test reasoning');
    });
  });
});
