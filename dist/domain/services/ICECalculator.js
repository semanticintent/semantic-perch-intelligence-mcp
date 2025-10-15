"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICECalculator = void 0;
const ICEScore_1 = require("../value-objects/ICEScore");
const InsightAnalysis_1 = require("../value-objects/InsightAnalysis");
const ContextAnalysis_1 = require("../value-objects/ContextAnalysis");
const ExecutionPlan_1 = require("../value-objects/ExecutionPlan");
class ICECalculator {
    /**
     * Calculate ICE score for missing primary key
     *
     * Semantic: Tables without PKs are critical integrity issues
     * - High insight: Fundamental identity mechanism missing
     * - Variable context: Depends on environment and references
     * - High execution: Standard DDL operation
     */
    calculateForMissingPrimaryKey(context) {
        const { table, schema, environment } = context;
        // Check if table is referenced by other tables
        const isReferenced = schema.tables.some((t) => t.foreignKeys.some((fk) => fk.referencesTable === table.name));
        // Insight: High - missing PKs are fundamental issues
        const insight = InsightAnalysis_1.InsightAnalysis.forMissingPrimaryKey(table.name, isReferenced);
        // Context: Depends on environment and whether table is referenced
        const contextAnalysis = ContextAnalysis_1.ContextAnalysis.forMissingPrimaryKey(environment, isReferenced);
        // Execution: Add PK is standard but requires duplicate check
        const execution = ExecutionPlan_1.ExecutionPlan.forAddPrimaryKey(table.name);
        return new ICEScore_1.ICEScore(insight.score, contextAnalysis.score, execution.score);
    }
    /**
     * Calculate ICE score for missing foreign key index
     *
     * Semantic: FKs without indexes cause slow joins
     * - High insight: Well-known performance pattern
     * - Variable context: Depends on query frequency and environment
     * - Very high execution: Safe, reversible index creation
     */
    calculateForMissingForeignKeyIndex(context) {
        const { tableName, columnName, isFrequentlyJoined, schema, environment } = context;
        // Insight: Performance impact of missing index on FK
        const insight = InsightAnalysis_1.InsightAnalysis.forMissingForeignKeyIndex(tableName, columnName, isFrequentlyJoined);
        // Context: Based on environment and query patterns
        const contextAnalysis = ContextAnalysis_1.ContextAnalysis.forMissingForeignKeyIndex(environment, isFrequentlyJoined, schema.tables.length);
        // Execution: Creating index is safe and straightforward
        const execution = ExecutionPlan_1.ExecutionPlan.forCreateIndex(tableName, columnName);
        return new ICEScore_1.ICEScore(insight.score, contextAnalysis.score, execution.score);
    }
    /**
     * Calculate ICE score for nullable foreign key
     *
     * Semantic: Nullable FKs may be intentional - lower priority
     * - Medium insight: Needs business logic review
     * - Low-medium context: Often intentional design
     * - Low execution: Requires business analysis first
     */
    calculateForNullableForeignKey(context) {
        const { tableName, columnName, environment } = context;
        // Insight: Medium - might be intentional
        const insight = InsightAnalysis_1.InsightAnalysis.forNullableForeignKey(tableName, columnName);
        // Context: Low operational impact - likely intentional
        const contextAnalysis = ContextAnalysis_1.ContextAnalysis.forNullableForeignKey(environment);
        // Execution: Requires review, not automatic fix
        const execution = ExecutionPlan_1.ExecutionPlan.forNullableForeignKeyReview(tableName, columnName);
        return new ICEScore_1.ICEScore(insight.score, contextAnalysis.score, execution.score);
    }
    /**
     * Calculate ICE score for schema difference
     *
     * Semantic: Schema drift between environments
     * - Variable insight: Depends on difference type
     * - High context: Target environment criticality matters
     * - Variable execution: Depends on DDL complexity
     */
    calculateForSchemaDifference(context) {
        const { differenceType, name, targetEnvironment, sourceEnvironment, hasRelationships = false, ddlStatement } = context;
        // Insight: Based on difference type and target environment
        const isProduction = targetEnvironment === 'production';
        const insight = InsightAnalysis_1.InsightAnalysis.forSchemaDifference(differenceType, name, isProduction);
        // Context: Migration context with source and target
        const contextAnalysis = this.calculateSchemaComparisonContext(sourceEnvironment, targetEnvironment, differenceType, hasRelationships);
        // Execution: Based on DDL type
        const execution = ExecutionPlan_1.ExecutionPlan.forSchemaDifference(differenceType, name, ddlStatement);
        return new ICEScore_1.ICEScore(insight.score, contextAnalysis.score, execution.score);
    }
    /**
     * Calculate context for schema comparison
     *
     * Semantic: Migration risk increases with target criticality
     */
    calculateSchemaComparisonContext(sourceEnv, targetEnv, differenceType, hasRelationships) {
        // For structural differences, create migration context
        if (differenceType === 'missing_table' || differenceType === 'missing_column') {
            return ContextAnalysis_1.ContextAnalysis.forSchemaMigration(sourceEnv, targetEnv, 1);
        }
        // For type mismatches, also migration context
        if (differenceType === 'type_mismatch') {
            return ContextAnalysis_1.ContextAnalysis.forSchemaMigration(sourceEnv, targetEnv, 1);
        }
        // Default to environment-based context
        return ContextAnalysis_1.ContextAnalysis.forEnvironment(targetEnv, hasRelationships);
    }
    /**
     * Calculate ICE score with full analysis components
     *
     * Semantic: When you need all three dimensions separately
     */
    calculateWithComponents(insight, context, execution) {
        const iceScore = new ICEScore_1.ICEScore(insight.score, context.score, execution.score);
        return { iceScore, insight, context, execution };
    }
}
exports.ICECalculator = ICECalculator;
//# sourceMappingURL=ICECalculator.js.map