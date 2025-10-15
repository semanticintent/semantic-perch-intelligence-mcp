import { ICEScore } from '../value-objects/ICEScore';
import type { InsightAnalysis } from '../value-objects/InsightAnalysis';
import type { ContextAnalysis } from '../value-objects/ContextAnalysis';
import type { ExecutionPlan } from '../value-objects/ExecutionPlan';

/**
 * 🎯 SEMANTIC INTENT: SchemaDifference represents a discovered variance between two database schemas
 *
 * WHY: Schema drift between environments is a common source of production issues
 * - Tables missing in target environment
 * - Columns missing or mismatched types
 * - Indexes not propagated
 * - Foreign keys inconsistent
 *
 * VALUE OBJECT: Immutable difference with ICE scoring
 * OBSERVABLE ANCHORING: Direct comparison of schema structures
 * ICE SCORING: Multi-dimensional assessment of difference severity
 */

export type DifferenceType =
  | 'missing_table'
  | 'missing_column'
  | 'extra_table' // Table exists in target but not source
  | 'extra_column' // Column exists in target but not source
  | 'type_mismatch'
  | 'missing_index'
  | 'missing_foreign_key';

export type DifferenceSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface DifferenceLocation {
  tableName: string;
  columnName?: string;
  sourceValue?: string; // e.g., type in source
  targetValue?: string; // e.g., type in target
}

export class SchemaDifference {
  public readonly type: DifferenceType;
  public readonly location: DifferenceLocation;
  public readonly description: string;
  public readonly sourceEnvironment: string;
  public readonly targetEnvironment: string;
  public readonly severity: DifferenceSeverity;
  public readonly iceScore: ICEScore;
  public readonly insightAnalysis: InsightAnalysis;
  public readonly contextAnalysis: ContextAnalysis;
  public readonly executionPlan: ExecutionPlan;

  constructor(
    type: DifferenceType,
    location: DifferenceLocation,
    description: string,
    sourceEnvironment: string,
    targetEnvironment: string,
    insightAnalysis: InsightAnalysis,
    contextAnalysis: ContextAnalysis,
    executionPlan: ExecutionPlan,
    iceScore: ICEScore
  ) {
    if (!location.tableName || location.tableName.trim().length === 0) {
      throw new Error('SchemaDifference table name cannot be empty');
    }
    if (!description || description.trim().length === 0) {
      throw new Error('SchemaDifference description cannot be empty');
    }
    if (!sourceEnvironment || sourceEnvironment.trim().length === 0) {
      throw new Error('SchemaDifference source environment cannot be empty');
    }
    if (!targetEnvironment || targetEnvironment.trim().length === 0) {
      throw new Error('SchemaDifference target environment cannot be empty');
    }

    this.type = type;
    this.location = { ...location };
    this.description = description.trim();
    this.sourceEnvironment = sourceEnvironment.trim();
    this.targetEnvironment = targetEnvironment.trim();
    this.insightAnalysis = insightAnalysis;
    this.contextAnalysis = contextAnalysis;
    this.executionPlan = executionPlan;
    this.iceScore = iceScore;

    // Derive severity from ICE score
    this.severity = this.deriveSeverity(iceScore);

    Object.freeze(this);
    Object.freeze(this.location);
  }

  /**
   * Create schema difference with full ICE analysis
   */
  static create(
    type: DifferenceType,
    location: DifferenceLocation,
    description: string,
    sourceEnvironment: string,
    targetEnvironment: string,
    insightAnalysis: InsightAnalysis,
    contextAnalysis: ContextAnalysis,
    executionPlan: ExecutionPlan
  ): SchemaDifference {
    // Calculate ICE score from three dimensions
    const iceScore = new ICEScore(insightAnalysis.score, contextAnalysis.score, executionPlan.score);

    return new SchemaDifference(
      type,
      location,
      description,
      sourceEnvironment,
      targetEnvironment,
      insightAnalysis,
      contextAnalysis,
      executionPlan,
      iceScore
    );
  }

  /**
   * Get human-readable description
   */
  getFullDescription(): string {
    const locationStr = this.location.columnName
      ? `${this.location.tableName}.${this.location.columnName}`
      : this.location.tableName;

    return `[${this.severity.toUpperCase()}] ${this.description} at ${locationStr} (${this.sourceEnvironment} → ${this.targetEnvironment})`;
  }

  /**
   * Get detailed ICE analysis
   */
  getICEAnalysis(): string {
    return [
      this.iceScore.getDescription(),
      this.insightAnalysis.getDescription(),
      this.contextAnalysis.getDescription(),
      this.executionPlan.getDescription(),
    ].join('\n');
  }

  /**
   * Check if this is a critical difference
   */
  isCritical(): boolean {
    return this.severity === 'critical';
  }

  /**
   * Check if this is a high severity difference
   */
  isHighSeverity(): boolean {
    return this.severity === 'high' || this.severity === 'critical';
  }

  /**
   * Check if this affects a specific table
   */
  affectsTable(tableName: string): boolean {
    return this.location.tableName === tableName;
  }

  /**
   * Check if this is a structural difference (table/column)
   */
  isStructuralDifference(): boolean {
    return (
      this.type === 'missing_table' ||
      this.type === 'missing_column' ||
      this.type === 'extra_table' ||
      this.type === 'extra_column' ||
      this.type === 'type_mismatch'
    );
  }

  /**
   * Check if this is a constraint difference (index/FK)
   */
  isConstraintDifference(): boolean {
    return this.type === 'missing_index' || this.type === 'missing_foreign_key';
  }

  /**
   * Get migration SQL if available
   */
  getMigrationSQL(): string {
    return this.executionPlan.getFormattedSQL();
  }

  /**
   * Derive severity from ICE score
   *
   * Semantic mapping:
   * - Critical: ICE priority 'high' + structural differences
   * - High: ICE priority 'high' + other differences
   * - Medium: ICE priority 'medium'
   * - Low: ICE priority 'low'
   */
  private deriveSeverity(iceScore: ICEScore): DifferenceSeverity {
    if (iceScore.priority === 'high') {
      // Structural differences with high ICE score are critical
      if (this.type === 'missing_table' || this.type === 'missing_column') {
        return 'critical';
      }
      return 'high';
    }

    if (iceScore.priority === 'medium') {
      return 'medium';
    }

    return 'low';
  }
}
