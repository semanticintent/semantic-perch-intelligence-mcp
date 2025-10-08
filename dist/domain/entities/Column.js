"use strict";
/**
 * 🎯 SEMANTIC INTENT: Column represents database column metadata
 *
 * WHY: Columns are semantic building blocks of table structure
 * - name: Observable identifier
 * - type: Semantic data type (TEXT, INTEGER, REAL, BLOB)
 * - isPrimaryKey: Semantic marker for uniqueness and identity
 * - isNullable: Semantic constraint for required vs optional data
 * - defaultValue: Semantic default behavior
 *
 * OBSERVABLE PROPERTIES: All properties directly observable from SQL schema
 * IMMUTABILITY: Frozen to prevent semantic mutation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Column = void 0;
class Column {
    name;
    type;
    isPrimaryKey;
    isNullable;
    defaultValue;
    constructor(name, type, isPrimaryKey = false, isNullable = true, defaultValue = null) {
        if (!name || name.trim().length === 0) {
            throw new Error('Column name cannot be empty');
        }
        if (!type || type.trim().length === 0) {
            throw new Error('Column type cannot be empty');
        }
        this.name = name.trim();
        this.type = type.toUpperCase();
        this.isPrimaryKey = isPrimaryKey;
        this.isNullable = isNullable;
        this.defaultValue = defaultValue;
        Object.freeze(this);
    }
    /**
     * Check if column is required (NOT NULL and no default)
     *
     * Semantic: Required columns must have values on insert
     */
    isRequired() {
        return !this.isNullable && this.defaultValue === null;
    }
    /**
     * Check if column has a default value
     */
    hasDefault() {
        return this.defaultValue !== null;
    }
    /**
     * Get SQL type category
     *
     * Semantic: Group types by semantic meaning
     */
    getTypeCategory() {
        const normalizedType = this.type.toUpperCase();
        if (normalizedType.includes('TEXT') || normalizedType.includes('CHAR')) {
            return 'text';
        }
        if (normalizedType.includes('INT') ||
            normalizedType.includes('REAL') ||
            normalizedType.includes('NUMERIC') ||
            normalizedType.includes('DECIMAL')) {
            return 'numeric';
        }
        if (normalizedType.includes('BLOB')) {
            return 'blob';
        }
        return 'unknown';
    }
}
exports.Column = Column;
//# sourceMappingURL=Column.js.map