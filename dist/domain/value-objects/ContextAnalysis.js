"use strict";
/**
 * 🎯 SEMANTIC INTENT: ContextAnalysis captures environmental and situational awareness
 *
 * WHY: The "C" in ICE - measures where we stand in the broader environment
 * - Environment criticality (dev vs staging vs production)
 * - Migration direction risk (dev→prod is higher stakes than prod→dev)
 * - Dependency complexity (how many other systems/tables are affected)
 * - Operational impact (downtime, rollback difficulty)
 *
 * VALUE OBJECT: Immutable context evaluation
 * OBSERVABLE ANCHORING: Based on environment properties and relationships
 * SCORING GUIDANCE: 0-10 scale for situational criticality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextAnalysis = void 0;
class ContextAnalysis {
    score;
    environment;
    factors;
    reasoning;
    constructor(factors, reasoning, environment = null) {
        if (!reasoning || reasoning.trim().length === 0) {
            throw new Error('ContextAnalysis reasoning cannot be empty');
        }
        this.factors = { ...factors };
        this.reasoning = reasoning.trim();
        this.environment = environment;
        // Calculate score as average of provided factors
        this.score = this.calculateScore();
        // Validate final score is in range
        if (this.score < 0 || this.score > 10) {
            throw new Error(`ContextAnalysis score must be 0-10, got ${this.score}`);
        }
        Object.freeze(this);
    }
    /**
     * Create context analysis for single environment optimization
     *
     * Semantic: Analyzing schema in specific environment
     */
    static forEnvironment(environment, hasDependencies) {
        const envScores = {
            production: 10, // Production is maximum criticality
            staging: 7, // Staging is important but not live
            development: 4, // Development is lowest stakes
        };
        return new ContextAnalysis({
            environmentCriticality: envScores[environment],
            dependencyComplexity: hasDependencies ? 7 : 4,
            operationalImpact: environment === 'production' ? 9 : environment === 'staging' ? 6 : 3,
        }, `Optimization in ${environment} environment${hasDependencies ? ' with dependencies' : ''}`, environment);
    }
    /**
     * Create context analysis for schema comparison/migration
     *
     * Semantic: Comparing schemas between environments reveals drift
     * - Higher stakes when target is production
     * - Higher risk when many tables/columns differ
     */
    static forSchemaMigration(sourceEnv, targetEnv, differencesCount) {
        const direction = this.getMigrationDirection(sourceEnv, targetEnv);
        const migrationRisk = this.calculateMigrationRisk(direction, differencesCount);
        const targetCriticality = this.getEnvironmentCriticality(targetEnv);
        return new ContextAnalysis({
            environmentCriticality: targetCriticality,
            migrationRisk,
            dependencyComplexity: Math.min(differencesCount, 10), // Cap at 10
            operationalImpact: targetEnv === 'production' ? 9 : targetEnv === 'staging' ? 6 : 3,
        }, `Schema migration from ${sourceEnv} to ${targetEnv} with ${differencesCount} difference(s)`, targetEnv);
    }
    /**
     * Create context analysis for missing primary key
     *
     * Semantic: Context depends heavily on environment and whether table is referenced
     */
    static forMissingPrimaryKey(environment, isReferencedByOthers) {
        const envCriticality = this.getEnvironmentCriticality(environment);
        return new ContextAnalysis({
            environmentCriticality: envCriticality,
            dependencyComplexity: isReferencedByOthers ? 9 : 5,
            operationalImpact: environment === 'production' ? 8 : 5,
        }, `Missing primary key in ${environment}${isReferencedByOthers ? ' (table is referenced by others)' : ''}`, environment);
    }
    /**
     * Create context analysis for missing foreign key index
     *
     * Semantic: Context depends on query frequency and environment
     */
    static forMissingForeignKeyIndex(environment, isFrequentlyQueried, tableCount) {
        const envCriticality = this.getEnvironmentCriticality(environment);
        return new ContextAnalysis({
            environmentCriticality: envCriticality,
            operationalImpact: isFrequentlyQueried ? 8 : 5,
            dependencyComplexity: Math.min(tableCount, 10),
        }, `Missing index in ${environment}${isFrequentlyQueried ? ' (frequently queried)' : ''}`, environment);
    }
    /**
     * Create context analysis for nullable foreign key
     *
     * Semantic: Lower context score - this is often intentional design
     */
    static forNullableForeignKey(environment) {
        const envCriticality = this.getEnvironmentCriticality(environment);
        return new ContextAnalysis({
            environmentCriticality: envCriticality,
            operationalImpact: 4, // Usually low impact - might be intentional
        }, `Nullable foreign key in ${environment} - likely intentional design`, environment);
    }
    /**
     * Get human-readable description
     */
    getDescription() {
        return `Context: ${this.score.toFixed(1)}/10 - ${this.reasoning}`;
    }
    /**
     * Get environment criticality score
     */
    static getEnvironmentCriticality(env) {
        const scores = {
            production: 10,
            staging: 7,
            development: 4,
        };
        return scores[env];
    }
    /**
     * Determine migration direction
     */
    static getMigrationDirection(source, target) {
        if (source === 'development' && target === 'staging')
            return 'dev_to_staging';
        if (source === 'staging' && target === 'production')
            return 'staging_to_production';
        if (source === 'development' && target === 'production')
            return 'dev_to_production';
        return 'reverse';
    }
    /**
     * Calculate migration risk based on direction and differences
     */
    static calculateMigrationRisk(direction, differencesCount) {
        const baseRisk = {
            dev_to_staging: 5,
            staging_to_production: 9, // Highest risk - going to production
            dev_to_production: 10, // Maximum risk - skipping staging
            reverse: 3, // Lower risk - moving backwards
            none: 2,
        }[direction];
        // Increase risk based on number of differences
        const riskMultiplier = Math.min(differencesCount / 5, 1); // Cap at 1.0
        const adjustedRisk = baseRisk + riskMultiplier * 2; // Add up to 2 points
        return Math.min(Math.round(adjustedRisk * 10) / 10, 10); // Round to 1 decimal, cap at 10
    }
    /**
     * Calculate score as weighted average of factors
     */
    calculateScore() {
        const values = Object.values(this.factors).filter((v) => v !== undefined);
        if (values.length === 0) {
            throw new Error('ContextAnalysis must have at least one factor');
        }
        // Validate all factors are in range
        for (const value of values) {
            if (value < 0 || value > 10) {
                throw new Error(`ContextAnalysis factor must be 0-10, got ${value}`);
            }
        }
        // Simple average for now - could be weighted in future
        const sum = values.reduce((a, b) => a + b, 0);
        return Math.round((sum / values.length) * 10) / 10; // Round to 1 decimal
    }
}
exports.ContextAnalysis = ContextAnalysis;
//# sourceMappingURL=ContextAnalysis.js.map