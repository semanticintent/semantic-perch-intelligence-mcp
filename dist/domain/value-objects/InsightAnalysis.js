"use strict";
/**
 * 🎯 SEMANTIC INTENT: InsightAnalysis captures the depth of semantic understanding
 *
 * WHY: The "I" in ICE - measures how well we understand what we're observing
 * - Semantic meaning of the issue
 * - Domain significance
 * - Relationship impact
 * - Data integrity implications
 *
 * VALUE OBJECT: Immutable analysis result
 * OBSERVABLE ANCHORING: Based on schema properties and relationships
 * SCORING GUIDANCE: 0-10 scale for semantic depth
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightAnalysis = void 0;
class InsightAnalysis {
    score;
    factors;
    reasoning;
    constructor(factors, reasoning) {
        if (!reasoning || reasoning.trim().length === 0) {
            throw new Error('InsightAnalysis reasoning cannot be empty');
        }
        this.factors = { ...factors };
        this.reasoning = reasoning.trim();
        // Calculate score as average of provided factors
        this.score = this.calculateScore();
        // Validate final score is in range
        if (this.score < 0 || this.score > 10) {
            throw new Error(`InsightAnalysis score must be 0-10, got ${this.score}`);
        }
        Object.freeze(this);
    }
    /**
     * Create insight analysis for missing primary key
     *
     * Semantic: Tables without PKs lack fundamental identity
     * - High table importance (entity without identity is problematic)
     * - High data integrity risk (duplicates, replication issues)
     * - High semantic clarity (well-understood pattern)
     */
    static forMissingPrimaryKey(tableName, hasRelationships) {
        return new InsightAnalysis({
            tableImportance: hasRelationships ? 9 : 7, // Higher if table is referenced
            dataIntegrity: 9, // PKs are fundamental to integrity
            semanticClarity: 10, // Very well-understood issue
            patternRecognition: 10, // Standard database design pattern
        }, `Table '${tableName}' lacks primary key - fundamental identity mechanism missing`);
    }
    /**
     * Create insight analysis for missing index on foreign key
     *
     * Semantic: FK without index causes slow joins
     * - Medium-high table importance (depends on query patterns)
     * - High relationship impact (directly affects joins)
     * - High semantic clarity (well-known performance pattern)
     */
    static forMissingForeignKeyIndex(tableName, columnName, isFrequentlyJoined) {
        return new InsightAnalysis({
            tableImportance: isFrequentlyJoined ? 8 : 6,
            relationshipImpact: isFrequentlyJoined ? 9 : 7,
            semanticClarity: 9,
            patternRecognition: 9,
        }, `Foreign key '${tableName}.${columnName}' without index will cause slow joins`);
    }
    /**
     * Create insight analysis for nullable foreign key
     *
     * Semantic: Nullable FK indicates optional relationship - may be intentional
     * - Medium table importance (depends on business rules)
     * - Medium data integrity (nullable is valid, just worth reviewing)
     * - High semantic clarity (business logic question)
     */
    static forNullableForeignKey(tableName, columnName) {
        return new InsightAnalysis({
            tableImportance: 5,
            dataIntegrity: 6,
            semanticClarity: 8,
            patternRecognition: 7,
        }, `Foreign key '${tableName}.${columnName}' is nullable - verify if relationship is truly optional`);
    }
    /**
     * Create insight analysis for schema difference (comparison)
     *
     * Semantic: Missing table/column in target environment
     */
    static forSchemaDifference(type, name, isProduction) {
        const baseImportance = isProduction ? 9 : 6; // Higher stakes in production
        if (type === 'missing_table') {
            return new InsightAnalysis({
                tableImportance: baseImportance,
                dataIntegrity: 8,
                semanticClarity: 10,
            }, `Table '${name}' missing in target environment - potential data loss or application errors`);
        }
        if (type === 'missing_column') {
            return new InsightAnalysis({
                tableImportance: baseImportance - 1,
                dataIntegrity: 7,
                semanticClarity: 9,
            }, `Column '${name}' missing in target environment - may cause query failures`);
        }
        // type_mismatch
        return new InsightAnalysis({
            tableImportance: baseImportance - 2,
            dataIntegrity: 6,
            semanticClarity: 8,
        }, `Type mismatch for '${name}' - may cause data conversion issues`);
    }
    /**
     * Get human-readable description
     */
    getDescription() {
        return `Insight: ${this.score.toFixed(1)}/10 - ${this.reasoning}`;
    }
    /**
     * Calculate score as weighted average of factors
     */
    calculateScore() {
        const values = Object.values(this.factors).filter((v) => v !== undefined);
        if (values.length === 0) {
            throw new Error('InsightAnalysis must have at least one factor');
        }
        // Validate all factors are in range
        for (const value of values) {
            if (value < 0 || value > 10) {
                throw new Error(`InsightAnalysis factor must be 0-10, got ${value}`);
            }
        }
        // Simple average for now - could be weighted in future
        const sum = values.reduce((a, b) => a + b, 0);
        return Math.round((sum / values.length) * 10) / 10; // Round to 1 decimal
    }
}
exports.InsightAnalysis = InsightAnalysis;
//# sourceMappingURL=InsightAnalysis.js.map