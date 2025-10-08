"use strict";
/**
 * 🎯 SEMANTIC INTENT: Index represents database index metadata
 *
 * WHY: Indexes are semantic performance optimization markers
 * - name: Observable identifier
 * - tableName: Table being indexed
 * - columns: Indexed columns (order matters for composite indexes)
 * - isUnique: Semantic uniqueness constraint
 * - isPrimaryKey: Indicates if this is a primary key index
 *
 * OBSERVABLE PROPERTIES: Directly observable from sqlite_master
 * SEMANTIC ANCHORING: Indexes indicate intentional query optimization
 * IMMUTABILITY: Frozen to preserve schema semantics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Index = void 0;
class Index {
    name;
    tableName;
    columns;
    isUnique;
    isPrimaryKey;
    constructor(name, tableName, columns, isUnique = false, isPrimaryKey = false) {
        if (!name || name.trim().length === 0) {
            throw new Error('Index name cannot be empty');
        }
        if (!tableName || tableName.trim().length === 0) {
            throw new Error('Table name cannot be empty');
        }
        if (!columns || columns.length === 0) {
            throw new Error('Index must have at least one column');
        }
        if (columns.some((col) => !col || col.trim().length === 0)) {
            throw new Error('Index column names cannot be empty');
        }
        this.name = name.trim();
        this.tableName = tableName.trim();
        this.columns = Object.freeze([...columns.map((col) => col.trim())]);
        this.isUnique = isUnique;
        this.isPrimaryKey = isPrimaryKey;
        Object.freeze(this);
    }
    /**
     * Check if this is a composite index (multiple columns)
     *
     * Semantic: Composite indexes optimize multi-column queries
     */
    isComposite() {
        return this.columns.length > 1;
    }
    /**
     * Check if index covers a specific column
     *
     * Observable: Column coverage is directly observable
     */
    coversColumn(columnName) {
        return this.columns.includes(columnName);
    }
    /**
     * Check if index is the first column (most selective)
     *
     * Semantic: First column in composite index can be used alone
     */
    hasColumnAsPrefix(columnName) {
        return this.columns[0] === columnName;
    }
    /**
     * Get index column count
     */
    getColumnCount() {
        return this.columns.length;
    }
}
exports.Index = Index;
//# sourceMappingURL=Index.js.map