"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Optimization = void 0;
class Optimization {
    type;
    table;
    column;
    reason;
    suggestion;
    priority;
    iceScore;
    constructor(type, table, reason, suggestion, priority, column = null, iceScore = null) {
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
            throw new Error(`Priority '${priority}' does not match ICEScore priority '${iceScore.priority}'. Use ICEScore.priority or omit priority parameter.`);
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
    static withICEScore(type, table, reason, suggestion, iceScore, column = null) {
        return new Optimization(type, table, reason, suggestion, iceScore.priority, column, iceScore);
    }
    /**
     * Check if this is a high priority optimization
     *
     * Semantic: High priority indicates significant impact on performance or integrity
     */
    isHighPriority() {
        return this.priority === 'high';
    }
    /**
     * Check if optimization affects a specific column
     */
    affectsColumn(columnName) {
        return this.column === columnName;
    }
    /**
     * Get a formatted description of the optimization
     */
    getDescription() {
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
    isIndexOptimization() {
        return this.type === 'missing_index' || this.type === 'redundant_index';
    }
    /**
     * Check if this optimization has ICE scoring
     */
    hasICEScore() {
        return this.iceScore !== null;
    }
    /**
     * Get ICE combined score if available
     */
    getICECombinedScore() {
        return this.iceScore?.combined ?? null;
    }
}
exports.Optimization = Optimization;
//# sourceMappingURL=Optimization.js.map