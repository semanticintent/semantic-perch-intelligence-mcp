import { describe, it, expect } from 'vitest';
import { ContextAnalysis } from '../../../src/domain/value-objects/ContextAnalysis';

describe('ContextAnalysis', () => {
  describe('constructor', () => {
    it('should create valid context analysis', () => {
      const analysis = new ContextAnalysis(
        {
          environmentCriticality: 10,
          migrationRisk: 8,
          dependencyComplexity: 6,
        },
        'Test reasoning',
        'production'
      );

      expect(analysis.score).toBe(8.0); // Average of 10, 8, 6
      expect(analysis.reasoning).toBe('Test reasoning');
      expect(analysis.environment).toBe('production');
      expect(analysis.factors.environmentCriticality).toBe(10);
    });

    it('should calculate score as average of factors', () => {
      const analysis = new ContextAnalysis(
        {
          environmentCriticality: 7,
          operationalImpact: 9,
        },
        'Average test'
      );

      expect(analysis.score).toBe(8.0); // (7 + 9) / 2 = 8.0
    });

    it('should allow null environment', () => {
      const analysis = new ContextAnalysis({ environmentCriticality: 5 }, 'Test', null);
      expect(analysis.environment).toBeNull();
    });

    it('should be immutable after creation', () => {
      const analysis = new ContextAnalysis({ environmentCriticality: 5 }, 'Test', 'production');
      expect(() => {
        (analysis as any).score = 10;
      }).toThrow();
    });

    it('should throw error if reasoning is empty', () => {
      expect(() => new ContextAnalysis({ environmentCriticality: 5 }, '')).toThrow(
        'ContextAnalysis reasoning cannot be empty'
      );
    });

    it('should throw error if no factors provided', () => {
      expect(() => new ContextAnalysis({}, 'Test')).toThrow('ContextAnalysis must have at least one factor');
    });

    it('should throw error if factor is out of range', () => {
      expect(() => new ContextAnalysis({ environmentCriticality: -1 }, 'Test')).toThrow(
        'ContextAnalysis factor must be 0-10'
      );
      expect(() => new ContextAnalysis({ environmentCriticality: 11 }, 'Test')).toThrow(
        'ContextAnalysis factor must be 0-10'
      );
    });
  });

  describe('forEnvironment()', () => {
    it('should create high criticality for production', () => {
      const analysis = ContextAnalysis.forEnvironment('production', false);

      expect(analysis.environment).toBe('production');
      expect(analysis.factors.environmentCriticality).toBe(10);
      expect(analysis.factors.operationalImpact).toBe(9);
      expect(analysis.score).toBeGreaterThan(7);
    });

    it('should create medium criticality for staging', () => {
      const analysis = ContextAnalysis.forEnvironment('staging', false);

      expect(analysis.environment).toBe('staging');
      expect(analysis.factors.environmentCriticality).toBe(7);
      expect(analysis.factors.operationalImpact).toBe(6);
    });

    it('should create low criticality for development', () => {
      const analysis = ContextAnalysis.forEnvironment('development', false);

      expect(analysis.environment).toBe('development');
      expect(analysis.factors.environmentCriticality).toBe(4);
      expect(analysis.factors.operationalImpact).toBe(3);
    });

    it('should increase complexity score when dependencies exist', () => {
      const withDeps = ContextAnalysis.forEnvironment('production', true);
      const withoutDeps = ContextAnalysis.forEnvironment('production', false);

      expect(withDeps.factors.dependencyComplexity).toBe(7);
      expect(withoutDeps.factors.dependencyComplexity).toBe(4);
    });

    it('should rank environments: production > staging > development', () => {
      const prod = ContextAnalysis.forEnvironment('production', false);
      const staging = ContextAnalysis.forEnvironment('staging', false);
      const dev = ContextAnalysis.forEnvironment('development', false);

      expect(prod.score).toBeGreaterThan(staging.score);
      expect(staging.score).toBeGreaterThan(dev.score);
    });
  });

  describe('forSchemaMigration()', () => {
    it('should create high-risk analysis for staging to production', () => {
      const analysis = ContextAnalysis.forSchemaMigration('staging', 'production', 5);

      expect(analysis.environment).toBe('production');
      expect(analysis.factors.environmentCriticality).toBe(10);
      expect(analysis.factors.migrationRisk).toBeGreaterThan(8);
      expect(analysis.reasoning).toContain('staging to production');
    });

    it('should create maximum risk for dev to production', () => {
      const devToProd = ContextAnalysis.forSchemaMigration('development', 'production', 5);
      const stagingToProd = ContextAnalysis.forSchemaMigration('staging', 'production', 5);

      expect(devToProd.factors.migrationRisk).toBeGreaterThan(stagingToProd.factors.migrationRisk!);
    });

    it('should create lower risk for dev to staging', () => {
      const devToStaging = ContextAnalysis.forSchemaMigration('development', 'staging', 5);

      expect(devToStaging.factors.migrationRisk).toBeLessThan(8);
      expect(devToStaging.environment).toBe('staging');
    });

    it('should create lowest risk for reverse migrations', () => {
      const reverse = ContextAnalysis.forSchemaMigration('production', 'development', 5);

      expect(reverse.factors.migrationRisk).toBeLessThan(5);
    });

    it('should increase risk with more differences', () => {
      const few = ContextAnalysis.forSchemaMigration('staging', 'production', 2);
      const many = ContextAnalysis.forSchemaMigration('staging', 'production', 10);

      expect(many.factors.migrationRisk).toBeGreaterThan(few.factors.migrationRisk!);
    });

    it('should cap dependency complexity at 10', () => {
      const analysis = ContextAnalysis.forSchemaMigration('staging', 'production', 50);

      expect(analysis.factors.dependencyComplexity).toBe(10);
    });
  });

  describe('forMissingPrimaryKey()', () => {
    it('should create high context score for production', () => {
      const analysis = ContextAnalysis.forMissingPrimaryKey('production', false);

      expect(analysis.environment).toBe('production');
      expect(analysis.factors.environmentCriticality).toBe(10);
      expect(analysis.reasoning).toContain('production');
    });

    it('should increase score when table is referenced', () => {
      const referenced = ContextAnalysis.forMissingPrimaryKey('production', true);
      const notReferenced = ContextAnalysis.forMissingPrimaryKey('production', false);

      expect(referenced.factors.dependencyComplexity).toBe(9);
      expect(notReferenced.factors.dependencyComplexity).toBe(5);
      expect(referenced.reasoning).toContain('referenced by others');
    });
  });

  describe('forMissingForeignKeyIndex()', () => {
    it('should create high impact for frequently queried tables', () => {
      const frequent = ContextAnalysis.forMissingForeignKeyIndex('production', true, 10);
      const infrequent = ContextAnalysis.forMissingForeignKeyIndex('production', false, 10);

      expect(frequent.factors.operationalImpact).toBe(8);
      expect(infrequent.factors.operationalImpact).toBe(5);
      expect(frequent.reasoning).toContain('frequently queried');
    });

    it('should cap table count at 10', () => {
      const analysis = ContextAnalysis.forMissingForeignKeyIndex('production', true, 100);

      expect(analysis.factors.dependencyComplexity).toBe(10);
    });
  });

  describe('forNullableForeignKey()', () => {
    it('should create low operational impact', () => {
      const analysis = ContextAnalysis.forNullableForeignKey('production');

      expect(analysis.factors.operationalImpact).toBe(4);
      expect(analysis.reasoning).toContain('intentional design');
    });

    it('should still respect environment criticality', () => {
      const prod = ContextAnalysis.forNullableForeignKey('production');
      const dev = ContextAnalysis.forNullableForeignKey('development');

      expect(prod.factors.environmentCriticality).toBe(10);
      expect(dev.factors.environmentCriticality).toBe(4);
    });
  });

  describe('getDescription()', () => {
    it('should return formatted description', () => {
      const analysis = new ContextAnalysis({ environmentCriticality: 8 }, 'Test reasoning', 'production');
      const description = analysis.getDescription();

      expect(description).toContain('Context:');
      expect(description).toContain('8.0/10');
      expect(description).toContain('Test reasoning');
    });
  });

  describe('edge cases', () => {
    it('should handle all zeros', () => {
      const analysis = new ContextAnalysis(
        {
          environmentCriticality: 0,
          migrationRisk: 0,
        },
        'Zero test'
      );

      expect(analysis.score).toBe(0);
    });

    it('should handle all max scores', () => {
      const analysis = new ContextAnalysis(
        {
          environmentCriticality: 10,
          migrationRisk: 10,
          dependencyComplexity: 10,
        },
        'Max test'
      );

      expect(analysis.score).toBe(10.0);
    });

    it('should trim whitespace from reasoning', () => {
      const analysis = new ContextAnalysis({ environmentCriticality: 5 }, '  Test reasoning  ', 'production');
      expect(analysis.reasoning).toBe('Test reasoning');
    });
  });
});
