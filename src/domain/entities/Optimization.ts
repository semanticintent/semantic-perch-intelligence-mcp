import type { ICEScore } from '../value-objects/ICEScore';

/**
 * 🎯 SEMANTIC INTENT: Optimization represents a schema improvement recommendation
 *
 * WHY: Optimizations are semantic suggestions based on observable schema patterns
 * - NOT based on runtime metrics (query performance, row counts)
 * - Based on schema structure analysis (missing indexes, primary keys, etc.)
 * - Observable anchoring: Schema patterns directly observable
 *
 * VALUE OBJECT: Represents an immutable recommendation
 * SEMANTIC ANCHORING: Based on schema structure, not runtime behavior
 * IMMUTABILITY: Frozen to preserve recommendation integrity
 * ICE SCORING: Priority derived from Intent-Chirp-Engine multi-dimensional score
 */

export type OptimizationType =
  | 'missing_index'
  | 'missing_primary_key'
  | 'inefficient_type'
  | 'nullable_foreign_key'
  | 'redundant_index';

export type OptimizationPriority = 'high' | 'medium' | 'low';

export class Optimization {
  public readonly type: OptimizationType;
  public readonly table: string;
  public readonly column: string | null;
  public readonly reason: string;
  public readonly suggestion: string;
  public readonly priority: OptimizationPriority;
  public readonly iceScore: ICEScore | null;

  constructor(
    type: OptimizationType,
    table: string,
    reason: string,
    suggestion: string,
    priority: OptimizationPriority,
    column: string | null = null,
    iceScore: ICEScore | null = null
  ) {
    if (!table || table.trim().length === 0) {
      throw new Error('Optimization table cannot be empty');
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('Optimization reason cannot be empty');
    }
    if (!suggestion || suggestion.trim().length === 0) {
      throw new Error('Optimization suggestion cannot be empty');
    }

    // If ICE score provided, priority must match its derived priority
    if (iceScore && priority !== iceScore.priority) {
      throw new Error(
        `Priority '${priority}' does not match ICEScore priority '${iceScore.priority}'. Use ICEScore.priority or omit priority parameter.`
      );
    }

    this.type = type;
    this.table = table.trim();
    this.column = column?.trim() || null;
    this.reason = reason.trim();
    this.suggestion = suggestion.trim();
    this.priority = priority;
    this.iceScore = iceScore;

    Object.freeze(this);
  }

  /**
   * Create optimization with ICE scoring
   *
   * Semantic: Priority derived from ICE score, not manually assigned
   */
  static withICEScore(
    type: OptimizationType,
    table: string,
    reason: string,
    suggestion: string,
    iceScore: ICEScore,
    column: string | null = null
  ): Optimization {
    return new Optimization(type, table, reason, suggestion, iceScore.priority, column, iceScore);
  }

  /**
   * Check if this is a high priority optimization
   *
   * Semantic: High priority indicates significant impact on performance or integrity
   */
  isHighPriority(): boolean {
    return this.priority === 'high';
  }

  /**
   * Check if optimization affects a specific column
   */
  affectsColumn(columnName: string): boolean {
    return this.column === columnName;
  }

  /**
   * Get a formatted description of the optimization
   */
  getDescription(): string {
    const location = this.column ? `${this.table}.${this.column}` : this.table;
    const baseDescription = `[${this.priority.toUpperCase()}] ${this.type} on ${location}: ${this.reason}`;

    // If ICE score available, include it
    if (this.iceScore) {
      return `${baseDescription}\n${this.iceScore.getDescription()}`;
    }

    return baseDescription;
  }

  /**
   * Check if this is an index-related optimization
   */
  isIndexOptimization(): boolean {
    return this.type === 'missing_index' || this.type === 'redundant_index';
  }

  /**
   * Check if this optimization has ICE scoring
   */
  hasICEScore(): boolean {
    return this.iceScore !== null;
  }

  /**
   * Get ICE combined score if available
   */
  getICECombinedScore(): number | null {
    return this.iceScore?.combined ?? null;
  }
}
