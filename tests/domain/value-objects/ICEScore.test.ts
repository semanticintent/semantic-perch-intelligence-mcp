import { describe, it, expect } from 'vitest';
import { ICEScore } from '../../../src/domain/value-objects/ICEScore';

describe('ICEScore', () => {
  describe('constructor', () => {
    it('should create valid ICE score with all dimensions', () => {
      const score = new ICEScore(8, 7, 9);

      expect(score.insight).toBe(8);
      expect(score.context).toBe(7);
      expect(score.execution).toBe(9);
      expect(score.combined).toBe(5.04); // (8 * 7 * 9) / 100 = 5.04
      expect(score.priority).toBe('medium');
    });

    it('should calculate combined score as (I × C × E) / 100', () => {
      const score = new ICEScore(10, 10, 10);
      expect(score.combined).toBe(10.0); // (10 * 10 * 10) / 100 = 10.0
    });

    it('should be immutable after creation', () => {
      const score = new ICEScore(5, 5, 5);
      expect(() => {
        (score as any).insight = 10;
      }).toThrow();
    });

    it('should throw error if insight is invalid', () => {
      expect(() => new ICEScore(-1, 5, 5)).toThrow('Insight score must be between 0 and 10');
      expect(() => new ICEScore(11, 5, 5)).toThrow('Insight score must be between 0 and 10');
      expect(() => new ICEScore(NaN, 5, 5)).toThrow('Insight score must be between 0 and 10');
    });

    it('should throw error if context is invalid', () => {
      expect(() => new ICEScore(5, -1, 5)).toThrow('Context score must be between 0 and 10');
      expect(() => new ICEScore(5, 11, 5)).toThrow('Context score must be between 0 and 10');
    });

    it('should throw error if execution is invalid', () => {
      expect(() => new ICEScore(5, 5, -1)).toThrow('Execution score must be between 0 and 10');
      expect(() => new ICEScore(5, 5, 11)).toThrow('Execution score must be between 0 and 10');
    });
  });

  describe('priority derivation', () => {
    it('should derive HIGH priority for combined score >= 6.0', () => {
      expect(new ICEScore(10, 10, 10).priority).toBe('high'); // 10.0
      expect(new ICEScore(9, 9, 9).priority).toBe('high'); // 7.29
      expect(new ICEScore(8, 8, 10).priority).toBe('high'); // 6.4
      expect(new ICEScore(10, 6, 10).priority).toBe('high'); // 6.0 (boundary)
    });

    it('should derive MEDIUM priority for combined score 3.0-5.9', () => {
      expect(new ICEScore(8, 7, 9).priority).toBe('medium'); // 5.04
      expect(new ICEScore(7, 7, 7).priority).toBe('medium'); // 3.43
      expect(new ICEScore(10, 5, 6).priority).toBe('medium'); // 3.0 (boundary)
    });

    it('should derive LOW priority for combined score < 3.0', () => {
      expect(new ICEScore(5, 5, 5).priority).toBe('low'); // 1.25
      expect(new ICEScore(3, 3, 3).priority).toBe('low'); // 0.27
      expect(new ICEScore(0, 10, 10).priority).toBe('low'); // 0.0 (one dimension zero)
    });

    it('should demonstrate multiplicative scoring - all dimensions must be strong', () => {
      // High insight + context, but low execution = low overall score
      expect(new ICEScore(10, 10, 2).priority).toBe('low'); // 2.0

      // Balanced medium scores produce medium priority
      expect(new ICEScore(7, 7, 7).priority).toBe('medium'); // 3.43

      // All high produces high priority
      expect(new ICEScore(9, 9, 9).priority).toBe('high'); // 7.29
    });
  });

  describe('static factory methods', () => {
    it('should create high priority score with createHigh()', () => {
      const score = ICEScore.createHigh();
      expect(score.isHighPriority()).toBe(true);
      expect(score.priority).toBe('high');
    });

    it('should create medium priority score with createMedium()', () => {
      const score = ICEScore.createMedium();
      expect(score.isMediumPriority()).toBe(true);
      expect(score.priority).toBe('medium');
    });

    it('should create low priority score with createLow()', () => {
      const score = ICEScore.createLow();
      expect(score.isLowPriority()).toBe(true);
      expect(score.priority).toBe('low');
    });

    it('should create score with create() method', () => {
      const score = ICEScore.create(8, 7, 9);
      expect(score.insight).toBe(8);
      expect(score.context).toBe(7);
      expect(score.execution).toBe(9);
    });
  });

  describe('comparison methods', () => {
    it('should compare scores with compareTo()', () => {
      const high = new ICEScore(9, 9, 9); // 7.29
      const medium = new ICEScore(7, 7, 7); // 3.43
      const low = new ICEScore(5, 5, 5); // 1.25

      expect(high.compareTo(medium)).toBeGreaterThan(0);
      expect(medium.compareTo(low)).toBeGreaterThan(0);
      expect(low.compareTo(high)).toBeLessThan(0);
      expect(medium.compareTo(medium)).toBe(0);
    });

    it('should check if stronger than another score', () => {
      const high = new ICEScore(9, 9, 9);
      const low = new ICEScore(5, 5, 5);

      expect(high.isStrongerThan(low)).toBe(true);
      expect(low.isStrongerThan(high)).toBe(false);
    });
  });

  describe('getDescription()', () => {
    it('should return formatted description', () => {
      const score = new ICEScore(8, 7, 9);
      const description = score.getDescription();

      expect(description).toContain('ICE Score: 5.04');
      expect(description).toContain('I:8');
      expect(description).toContain('C:7');
      expect(description).toContain('E:9');
      expect(description).toContain('Priority: MEDIUM');
    });
  });

  describe('edge cases', () => {
    it('should handle all zeros', () => {
      const score = new ICEScore(0, 0, 0);
      expect(score.combined).toBe(0);
      expect(score.priority).toBe('low');
    });

    it('should handle one dimension zero (kills combined score)', () => {
      const score = new ICEScore(0, 10, 10);
      expect(score.combined).toBe(0);
      expect(score.priority).toBe('low');
    });

    it('should handle decimal results correctly', () => {
      const score = new ICEScore(7, 8, 9);
      expect(score.combined).toBe(5.04); // (7 * 8 * 9) / 100 = 5.04
    });
  });

  describe('priority boundary testing', () => {
    it('should test boundary at 6.0 (high/medium)', () => {
      // Exactly 6.0 should be high
      expect(new ICEScore(10, 6, 10).priority).toBe('high'); // 6.0

      // Just below 6.0 should be medium
      expect(new ICEScore(10, 5, 10).priority).toBe('medium'); // 5.0
    });

    it('should test boundary at 3.0 (medium/low)', () => {
      // Exactly 3.0 should be medium
      expect(new ICEScore(10, 5, 6).priority).toBe('medium'); // 3.0

      // Just below 3.0 should be low
      expect(new ICEScore(10, 5, 5).priority).toBe('low'); // 2.5
    });
  });
});
