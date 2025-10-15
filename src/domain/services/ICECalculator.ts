import { ICEScore } from '../value-objects/ICEScore';
import { InsightAnalysis } from '../value-objects/InsightAnalysis';
import { ContextAnalysis, type Environment } from '../value-objects/ContextAnalysis';
import { ExecutionPlan } from '../value-objects/ExecutionPlan';
import type { TableInfo } from '../entities/TableInfo';
import type { DatabaseSchema } from '../entities/DatabaseSchema';

/**
 * 🎯 SEMANTIC INTENT: ICECalculator computes multi-dimensional scores for schema issues
 *
 * WHY: Centralized ICE scoring logic ensures consistent prioritization across features
 * - Analyzes schema elements to compute Insight dimension
 * - Evaluates environmental context to compute Context dimension
 * - Assesses execution feasibility to compute Execution dimension
 * - Produces final ICE score for prioritization
 *
 * DOMAIN SERVICE: Pure business logic for ICE calculation
 * OBSERVABLE ANCHORING: Scores based on observable schema properties
 * STATELESS: No internal state, pure calculations
 */

export interface MissingPrimaryKeyContext {
  table: TableInfo;
  schema: DatabaseSchema;
  environment: Environment;
}

export interface MissingIndexContext {
  tableName: string;
  columnName: string;
  isFrequentlyJoined: boolean;
  schema: DatabaseSchema;
  environment: Environment;
}

export interface NullableForeignKeyContext {
  tableName: string;
  columnName: string;
  environment: Environment;
}

export interface SchemaDifferenceContext {
  differenceType: 'missing_table' | 'missing_column' | 'type_mismatch';
  name: string;
  targetEnvironment: Environment;
  sourceEnvironment: Environment;
  hasRelationships?: boolean;
  ddlStatement: string;
}

export class ICECalculator {
  /**
   * Calculate ICE score for missing primary key
   *
   * Semantic: Tables without PKs are critical integrity issues
   * - High insight: Fundamental identity mechanism missing
   * - Variable context: Depends on environment and references
   * - High execution: Standard DDL operation
   */
  calculateForMissingPrimaryKey(context: MissingPrimaryKeyContext): ICEScore {
    const { table, schema, environment } = context;

    // Check if table is referenced by other tables
    const isReferenced = schema.tables.some((t) =>
      t.foreignKeys.some((fk) => fk.referencesTable === table.name)
    );

    // Insight: High - missing PKs are fundamental issues
    const insight = InsightAnalysis.forMissingPrimaryKey(table.name, isReferenced);

    // Context: Depends on environment and whether table is referenced
    const contextAnalysis = ContextAnalysis.forMissingPrimaryKey(environment, isReferenced);

    // Execution: Add PK is standard but requires duplicate check
    const execution = ExecutionPlan.forAddPrimaryKey(table.name);

    return new ICEScore(insight.score, contextAnalysis.score, execution.score);
  }

  /**
   * Calculate ICE score for missing foreign key index
   *
   * Semantic: FKs without indexes cause slow joins
   * - High insight: Well-known performance pattern
   * - Variable context: Depends on query frequency and environment
   * - Very high execution: Safe, reversible index creation
   */
  calculateForMissingForeignKeyIndex(context: MissingIndexContext): ICEScore {
    const { tableName, columnName, isFrequentlyJoined, schema, environment } = context;

    // Insight: Performance impact of missing index on FK
    const insight = InsightAnalysis.forMissingForeignKeyIndex(tableName, columnName, isFrequentlyJoined);

    // Context: Based on environment and query patterns
    const contextAnalysis = ContextAnalysis.forMissingForeignKeyIndex(
      environment,
      isFrequentlyJoined,
      schema.tables.length
    );

    // Execution: Creating index is safe and straightforward
    const execution = ExecutionPlan.forCreateIndex(tableName, columnName);

    return new ICEScore(insight.score, contextAnalysis.score, execution.score);
  }

  /**
   * Calculate ICE score for nullable foreign key
   *
   * Semantic: Nullable FKs may be intentional - lower priority
   * - Medium insight: Needs business logic review
   * - Low-medium context: Often intentional design
   * - Low execution: Requires business analysis first
   */
  calculateForNullableForeignKey(context: NullableForeignKeyContext): ICEScore {
    const { tableName, columnName, environment } = context;

    // Insight: Medium - might be intentional
    const insight = InsightAnalysis.forNullableForeignKey(tableName, columnName);

    // Context: Low operational impact - likely intentional
    const contextAnalysis = ContextAnalysis.forNullableForeignKey(environment);

    // Execution: Requires review, not automatic fix
    const execution = ExecutionPlan.forNullableForeignKeyReview(tableName, columnName);

    return new ICEScore(insight.score, contextAnalysis.score, execution.score);
  }

  /**
   * Calculate ICE score for schema difference
   *
   * Semantic: Schema drift between environments
   * - Variable insight: Depends on difference type
   * - High context: Target environment criticality matters
   * - Variable execution: Depends on DDL complexity
   */
  calculateForSchemaDifference(context: SchemaDifferenceContext): ICEScore {
    const { differenceType, name, targetEnvironment, sourceEnvironment, hasRelationships = false, ddlStatement } = context;

    // Insight: Based on difference type and target environment
    const isProduction = targetEnvironment === 'production';
    const insight = InsightAnalysis.forSchemaDifference(differenceType, name, isProduction);

    // Context: Migration context with source and target
    const contextAnalysis = this.calculateSchemaComparisonContext(
      sourceEnvironment,
      targetEnvironment,
      differenceType,
      hasRelationships
    );

    // Execution: Based on DDL type
    const execution = ExecutionPlan.forSchemaDifference(differenceType, name, ddlStatement);

    return new ICEScore(insight.score, contextAnalysis.score, execution.score);
  }

  /**
   * Calculate context for schema comparison
   *
   * Semantic: Migration risk increases with target criticality
   */
  private calculateSchemaComparisonContext(
    sourceEnv: Environment,
    targetEnv: Environment,
    differenceType: string,
    hasRelationships: boolean
  ): ContextAnalysis {
    // For structural differences, create migration context
    if (differenceType === 'missing_table' || differenceType === 'missing_column') {
      return ContextAnalysis.forSchemaMigration(sourceEnv, targetEnv, 1);
    }

    // For type mismatches, also migration context
    if (differenceType === 'type_mismatch') {
      return ContextAnalysis.forSchemaMigration(sourceEnv, targetEnv, 1);
    }

    // Default to environment-based context
    return ContextAnalysis.forEnvironment(targetEnv, hasRelationships);
  }

  /**
   * Calculate ICE score with full analysis components
   *
   * Semantic: When you need all three dimensions separately
   */
  calculateWithComponents(
    insight: InsightAnalysis,
    context: ContextAnalysis,
    execution: ExecutionPlan
  ): {
    iceScore: ICEScore;
    insight: InsightAnalysis;
    context: ContextAnalysis;
    execution: ExecutionPlan;
  } {
    const iceScore = new ICEScore(insight.score, context.score, execution.score);
    return { iceScore, insight, context, execution };
  }
}
