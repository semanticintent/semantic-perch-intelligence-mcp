"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaDifference = void 0;
const ICEScore_1 = require("../value-objects/ICEScore");
class SchemaDifference {
    type;
    location;
    description;
    sourceEnvironment;
    targetEnvironment;
    severity;
    iceScore;
    insightAnalysis;
    contextAnalysis;
    executionPlan;
    constructor(type, location, description, sourceEnvironment, targetEnvironment, insightAnalysis, contextAnalysis, executionPlan, iceScore) {
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
    static create(type, location, description, sourceEnvironment, targetEnvironment, insightAnalysis, contextAnalysis, executionPlan) {
        // Calculate ICE score from three dimensions
        const iceScore = new ICEScore_1.ICEScore(insightAnalysis.score, contextAnalysis.score, executionPlan.score);
        return new SchemaDifference(type, location, description, sourceEnvironment, targetEnvironment, insightAnalysis, contextAnalysis, executionPlan, iceScore);
    }
    /**
     * Get human-readable description
     */
    getFullDescription() {
        const locationStr = this.location.columnName
            ? `${this.location.tableName}.${this.location.columnName}`
            : this.location.tableName;
        return `[${this.severity.toUpperCase()}] ${this.description} at ${locationStr} (${this.sourceEnvironment} → ${this.targetEnvironment})`;
    }
    /**
     * Get detailed ICE analysis
     */
    getICEAnalysis() {
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
    isCritical() {
        return this.severity === 'critical';
    }
    /**
     * Check if this is a high severity difference
     */
    isHighSeverity() {
        return this.severity === 'high' || this.severity === 'critical';
    }
    /**
     * Check if this affects a specific table
     */
    affectsTable(tableName) {
        return this.location.tableName === tableName;
    }
    /**
     * Check if this is a structural difference (table/column)
     */
    isStructuralDifference() {
        return (this.type === 'missing_table' ||
            this.type === 'missing_column' ||
            this.type === 'extra_table' ||
            this.type === 'extra_column' ||
            this.type === 'type_mismatch');
    }
    /**
     * Check if this is a constraint difference (index/FK)
     */
    isConstraintDifference() {
        return this.type === 'missing_index' || this.type === 'missing_foreign_key';
    }
    /**
     * Get migration SQL if available
     */
    getMigrationSQL() {
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
    deriveSeverity(iceScore) {
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
exports.SchemaDifference = SchemaDifference;
//# sourceMappingURL=SchemaDifference.js.map