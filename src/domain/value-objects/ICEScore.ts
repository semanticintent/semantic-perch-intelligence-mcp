/**
 * 🎯 SEMANTIC INTENT: ICEScore represents the Intent-Chirp-Engine multi-dimensional intelligence score
 *
 * WHY: ICE Framework provides nuanced prioritization based on three dimensions:
 * - **I**nsight: Depth of semantic understanding (0-10)
 * - **C**ontext: Environmental and situational awareness (0-10)
 * - **E**xecution: Clarity and precision of action (0-10)
 *
 * VALUE OBJECT: Immutable score representation
 * OBSERVABLE ANCHORING: Scores derived from directly observable schema properties
 * MULTIPLICATIVE SCORING: All dimensions must be strong (I × C × E) / 100
 * PRIORITY DERIVATION: High (6.0-10.0), Medium (3.0-5.9), Low (0.0-2.9)
 *
 * SEMANTIC DUAL MEANING:
 * - PerchIQX: Analytical clarity (like ice-clear water for observation)
 * - ChirpIQX: Competitive edge (freeze out competition)
 * - Both meanings valid, context determines interpretation
 */

export type ICEPriority = 'high' | 'medium' | 'low';

export class ICEScore {
  public readonly insight: number;
  public readonly context: number;
  public readonly execution: number;
  public readonly combined: number;
  public readonly priority: ICEPriority;

  constructor(insight: number, context: number, execution: number) {
    // Validate dimensions are in range 0-10
    if (!this.isValidDimension(insight)) {
      throw new Error(`Insight score must be between 0 and 10, got ${insight}`);
    }
    if (!this.isValidDimension(context)) {
      throw new Error(`Context score must be between 0 and 10, got ${context}`);
    }
    if (!this.isValidDimension(execution)) {
      throw new Error(`Execution score must be between 0 and 10, got ${execution}`);
    }

    this.insight = insight;
    this.context = context;
    this.execution = execution;

    // Multiplicative scoring: All dimensions must be strong
    // (I × C × E) / 100 produces score in range 0.0-10.0
    this.combined = (insight * context * execution) / 100;

    // Derive priority from combined score
    this.priority = this.derivePriority();

    Object.freeze(this);
  }

  /**
   * Create ICE score from raw dimension values
   */
  static create(insight: number, context: number, execution: number): ICEScore {
    return new ICEScore(insight, context, execution);
  }

  /**
   * Create a high-priority ICE score
   * Semantic: For critical issues requiring immediate attention
   */
  static createHigh(): ICEScore {
    return new ICEScore(9, 9, 9); // Combined: 7.29 (high)
  }

  /**
   * Create a medium-priority ICE score
   * Semantic: For important issues that should be addressed
   */
  static createMedium(): ICEScore {
    return new ICEScore(7, 7, 7); // Combined: 3.43 (medium)
  }

  /**
   * Create a low-priority ICE score
   * Semantic: For minor issues or suggestions
   */
  static createLow(): ICEScore {
    return new ICEScore(5, 5, 5); // Combined: 1.25 (low)
  }

  /**
   * Check if this is a high priority score
   */
  isHighPriority(): boolean {
    return this.priority === 'high';
  }

  /**
   * Check if this is a medium priority score
   */
  isMediumPriority(): boolean {
    return this.priority === 'medium';
  }

  /**
   * Check if this is a low priority score
   */
  isLowPriority(): boolean {
    return this.priority === 'low';
  }

  /**
   * Get human-readable description of the score
   */
  getDescription(): string {
    return `ICE Score: ${this.combined.toFixed(2)} (I:${this.insight} C:${this.context} E:${this.execution}) - Priority: ${this.priority.toUpperCase()}`;
  }

  /**
   * Compare this score with another
   * Returns: positive if this > other, negative if this < other, 0 if equal
   */
  compareTo(other: ICEScore): number {
    return this.combined - other.combined;
  }

  /**
   * Check if this score is stronger than another
   */
  isStrongerThan(other: ICEScore): boolean {
    return this.combined > other.combined;
  }

  /**
   * Check if dimension value is valid (0-10)
   */
  private isValidDimension(value: number): boolean {
    return Number.isFinite(value) && value >= 0 && value <= 10;
  }

  /**
   * Derive priority from combined score
   *
   * Semantic thresholds:
   * - High (6.0-10.0): Critical issues with strong multi-dimensional impact
   * - Medium (3.0-5.9): Important issues worth addressing
   * - Low (0.0-2.9): Minor suggestions or edge cases
   */
  private derivePriority(): ICEPriority {
    if (this.combined >= 6.0) {
      return 'high';
    }
    if (this.combined >= 3.0) {
      return 'medium';
    }
    return 'low';
  }
}
