"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Relationship = void 0;
/**
 * 🎯 SEMANTIC INTENT: Relationship represents semantic connection between tables
 *
 * WHY: Relationships are higher-level semantic abstractions of foreign keys
 * - Foreign keys are implementation details (column-level)
 * - Relationships are semantic connections (table-level)
 * - Preserves referential integrity semantics
 *
 * SEMANTIC ANCHORING: Based on observable foreign key constraints
 * OBSERVABLE PROPERTIES: Derived from foreign key metadata
 * IMMUTABILITY: Frozen to preserve relationship semantics
 */
class Relationship {
    fromTable;
    fromColumn;
    toTable;
    toColumn;
    onDelete;
    onUpdate;
    constructor(fromTable, fromColumn, toTable, toColumn, onDelete = null, onUpdate = null) {
        if (!fromTable || fromTable.trim().length === 0) {
            throw new Error('Relationship fromTable cannot be empty');
        }
        if (!fromColumn || fromColumn.trim().length === 0) {
            throw new Error('Relationship fromColumn cannot be empty');
        }
        if (!toTable || toTable.trim().length === 0) {
            throw new Error('Relationship toTable cannot be empty');
        }
        if (!toColumn || toColumn.trim().length === 0) {
            throw new Error('Relationship toColumn cannot be empty');
        }
        this.fromTable = fromTable.trim();
        this.fromColumn = fromColumn.trim();
        this.toTable = toTable.trim();
        this.toColumn = toColumn.trim();
        this.onDelete = onDelete;
        this.onUpdate = onUpdate;
        Object.freeze(this);
    }
    /**
     * Check if relationship is required (CASCADE or RESTRICT)
     *
     * Semantic: CASCADE/RESTRICT implies tight coupling
     */
    isRequired() {
        return this.onDelete === 'CASCADE' || this.onDelete === 'RESTRICT';
    }
    /**
     * Check if relationship cascades deletes
     *
     * Semantic: CASCADE means child records are deleted with parent
     */
    cascadesOnDelete() {
        return this.onDelete === 'CASCADE';
    }
    /**
     * Check if relationship is optional (SET NULL or NO ACTION)
     *
     * Semantic: Optional relationships can exist independently
     */
    isOptional() {
        return this.onDelete === 'SET NULL' || this.onDelete === 'NO ACTION' || this.onDelete === null;
    }
    /**
     * Get relationship direction description
     *
     * Semantic: "posts references users" (many-to-one typical pattern)
     */
    getDescription() {
        return `${this.fromTable}.${this.fromColumn} → ${this.toTable}.${this.toColumn}`;
    }
    /**
     * Check if this is a self-referential relationship
     *
     * Semantic: Table referencing itself (e.g., parent_id in categories)
     */
    isSelfReferential() {
        return this.fromTable === this.toTable;
    }
}
exports.Relationship = Relationship;
//# sourceMappingURL=Relationship.js.map