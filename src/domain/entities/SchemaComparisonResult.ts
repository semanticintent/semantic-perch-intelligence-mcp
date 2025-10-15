import type { SchemaDifference } from './SchemaDifference';

/**
 * 🎯 SEMANTIC INTENT: SchemaComparisonResult aggregates all differences between two schemas
 *
 * WHY: Provides a complete picture of schema drift with ICE-based prioritization
 * - All differences discovered
 * - Sorted by severity (ICE score)
 * - Grouped by type
 * - Summary statistics
 *
 * VALUE OBJECT: Immutable comparison result
 * OBSERVABLE ANCHORING: Direct comparison of two schema snapshots
 * ICE SCORING: Prioritizes differences by multi-dimensional impact
 */

export interface ComparisonMetadata {
  sourceEnvironment: string;
  targetEnvironment: string;
  sourceTableCount: number;
  targetTableCount: number;
  comparedAt: Date;
}

export interface ComparisonSummary {
  totalDifferences: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  structuralDifferences: number;
  constraintDifferences: number;
  missingTables: number;
  missingColumns: number;
  typeMismatches: number;
  missingIndexes: number;
  missingForeignKeys: number;
}

export class SchemaComparisonResult {
  public readonly metadata: ComparisonMetadata;
  public readonly differences: ReadonlyArray<SchemaDifference>;
  public readonly summary: ComparisonSummary;

  constructor(
    sourceEnvironment: string,
    targetEnvironment: string,
    sourceTableCount: number,
    targetTableCount: number,
    differences: SchemaDifference[]
  ) {
    if (!sourceEnvironment || sourceEnvironment.trim().length === 0) {
      throw new Error('SchemaComparisonResult source environment cannot be empty');
    }
    if (!targetEnvironment || targetEnvironment.trim().length === 0) {
      throw new Error('SchemaComparisonResult target environment cannot be empty');
    }
    if (sourceTableCount < 0 || targetTableCount < 0) {
      throw new Error('SchemaComparisonResult table counts cannot be negative');
    }

    this.metadata = {
      sourceEnvironment: sourceEnvironment.trim(),
      targetEnvironment: targetEnvironment.trim(),
      sourceTableCount,
      targetTableCount,
      comparedAt: new Date(),
    };

    // Sort differences by ICE score (highest to lowest)
    this.differences = [...differences].sort(
      (a, b) => b.iceScore.combined - a.iceScore.combined
    );

    // Calculate summary
    this.summary = this.calculateSummary();

    Object.freeze(this);
    Object.freeze(this.metadata);
    Object.freeze(this.summary);
  }

  /**
   * Check if schemas are identical (no differences)
   */
  isIdentical(): boolean {
    return this.differences.length === 0;
  }

  /**
   * Check if any critical differences exist
   */
  hasCriticalDifferences(): boolean {
    return this.summary.criticalCount > 0;
  }

  /**
   * Check if any high-severity differences exist
   */
  hasHighSeverityDifferences(): boolean {
    return this.summary.highCount > 0 || this.summary.criticalCount > 0;
  }

  /**
   * Get only critical differences
   */
  getCriticalDifferences(): SchemaDifference[] {
    return this.differences.filter((d) => d.isCritical());
  }

  /**
   * Get differences by severity
   */
  getDifferencesBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): SchemaDifference[] {
    return this.differences.filter((d) => d.severity === severity);
  }

  /**
   * Get structural differences (tables/columns)
   */
  getStructuralDifferences(): SchemaDifference[] {
    return this.differences.filter((d) => d.isStructuralDifference());
  }

  /**
   * Get constraint differences (indexes/FKs)
   */
  getConstraintDifferences(): SchemaDifference[] {
    return this.differences.filter((d) => d.isConstraintDifference());
  }

  /**
   * Get differences affecting a specific table
   */
  getDifferencesForTable(tableName: string): SchemaDifference[] {
    return this.differences.filter((d) => d.affectsTable(tableName));
  }

  /**
   * Get formatted summary
   */
  getFormattedSummary(): string {
    const lines: string[] = [];

    lines.push(`Schema Comparison: ${this.metadata.sourceEnvironment} → ${this.metadata.targetEnvironment}`);
    lines.push(`Compared at: ${this.metadata.comparedAt.toISOString()}`);
    lines.push(`Source tables: ${this.metadata.sourceTableCount}, Target tables: ${this.metadata.targetTableCount}`);
    lines.push('');

    if (this.isIdentical()) {
      lines.push('✅ Schemas are identical - no differences found!');
      return lines.join('\n');
    }

    lines.push(`Total differences: ${this.summary.totalDifferences}`);
    lines.push('');
    lines.push('By Severity:');
    lines.push(`  Critical: ${this.summary.criticalCount}`);
    lines.push(`  High: ${this.summary.highCount}`);
    lines.push(`  Medium: ${this.summary.mediumCount}`);
    lines.push(`  Low: ${this.summary.lowCount}`);
    lines.push('');
    lines.push('By Type:');
    lines.push(`  Missing tables: ${this.summary.missingTables}`);
    lines.push(`  Missing columns: ${this.summary.missingColumns}`);
    lines.push(`  Type mismatches: ${this.summary.typeMismatches}`);
    lines.push(`  Missing indexes: ${this.summary.missingIndexes}`);
    lines.push(`  Missing foreign keys: ${this.summary.missingForeignKeys}`);

    return lines.join('\n');
  }

  /**
   * Get migration plan (SQL statements)
   */
  getMigrationPlan(): string {
    if (this.isIdentical()) {
      return '-- No migration needed - schemas are identical';
    }

    const lines: string[] = [];
    lines.push('-- Schema Migration Plan');
    lines.push(`-- From: ${this.metadata.sourceEnvironment}`);
    lines.push(`-- To: ${this.metadata.targetEnvironment}`);
    lines.push(`-- Generated: ${this.metadata.comparedAt.toISOString()}`);
    lines.push('');
    lines.push('-- CRITICAL AND HIGH PRIORITY CHANGES');
    lines.push('-- Review carefully before applying!');
    lines.push('');

    // Group by severity
    const critical = this.getCriticalDifferences();
    const high = this.getDifferencesBySeverity('high');
    const medium = this.getDifferencesBySeverity('medium');
    const low = this.getDifferencesBySeverity('low');

    if (critical.length > 0) {
      lines.push('-- === CRITICAL ===');
      critical.forEach((d) => {
        lines.push(`-- ${d.getFullDescription()}`);
        lines.push(d.getMigrationSQL());
        lines.push('');
      });
    }

    if (high.length > 0) {
      lines.push('-- === HIGH ===');
      high.forEach((d) => {
        lines.push(`-- ${d.getFullDescription()}`);
        lines.push(d.getMigrationSQL());
        lines.push('');
      });
    }

    if (medium.length > 0) {
      lines.push('-- === MEDIUM ===');
      medium.forEach((d) => {
        lines.push(`-- ${d.getFullDescription()}`);
        lines.push(d.getMigrationSQL());
        lines.push('');
      });
    }

    if (low.length > 0) {
      lines.push('-- === LOW ===');
      low.forEach((d) => {
        lines.push(`-- ${d.getFullDescription()}`);
        lines.push(d.getMigrationSQL());
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(): ComparisonSummary {
    return {
      totalDifferences: this.differences.length,
      criticalCount: this.differences.filter((d) => d.severity === 'critical').length,
      highCount: this.differences.filter((d) => d.severity === 'high').length,
      mediumCount: this.differences.filter((d) => d.severity === 'medium').length,
      lowCount: this.differences.filter((d) => d.severity === 'low').length,
      structuralDifferences: this.differences.filter((d) => d.isStructuralDifference()).length,
      constraintDifferences: this.differences.filter((d) => d.isConstraintDifference()).length,
      missingTables: this.differences.filter((d) => d.type === 'missing_table').length,
      missingColumns: this.differences.filter((d) => d.type === 'missing_column').length,
      typeMismatches: this.differences.filter((d) => d.type === 'type_mismatch').length,
      missingIndexes: this.differences.filter((d) => d.type === 'missing_index').length,
      missingForeignKeys: this.differences.filter((d) => d.type === 'missing_foreign_key').length,
    };
  }
}
