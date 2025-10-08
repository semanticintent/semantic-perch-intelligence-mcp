"use strict";
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
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Optimization = void 0;
class Optimization {
    type;
    table;
    column;
    reason;
    suggestion;
    priority;
    constructor(type, table, reason, suggestion, priority, column = null) {
        if (!table || table.trim().length === 0) {
            throw new Error('Optimization table cannot be empty');
        }
        if (!reason || reason.trim().length === 0) {
            throw new Error('Optimization reason cannot be empty');
        }
        if (!suggestion || suggestion.trim().length === 0) {
            throw new Error('Optimization suggestion cannot be empty');
        }
        this.type = type;
        this.table = table.trim();
        this.column = column?.trim() || null;
        this.reason = reason.trim();
        this.suggestion = suggestion.trim();
        this.priority = priority;
        Object.freeze(this);
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
        return `[${this.priority.toUpperCase()}] ${this.type} on ${location}: ${this.reason}`;
    }
    /**
     * Check if this is an index-related optimization
     */
    isIndexOptimization() {
        return this.type === 'missing_index' || this.type === 'redundant_index';
    }
}
exports.Optimization = Optimization;
//# sourceMappingURL=Optimization.js.map