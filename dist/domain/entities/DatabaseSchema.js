"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseSchema = void 0;
/**
 * 🎯 SEMANTIC INTENT: DatabaseSchema is the aggregate root for complete database metadata
 *
 * WHY: Database schema represents the complete structural snapshot at a point in time
 * - Aggregate root: Coordinates all tables, relationships, indexes
 * - Semantic boundary: Database is the consistency boundary for schema operations
 * - Observable from D1 REST API (sqlite_master + PRAGMA statements)
 * - Environment semantic preserved: dev/staging/prod context
 *
 * AGGREGATE ROOT: Top-level entity coordinating all schema metadata
 * OBSERVABLE PROPERTIES: All metadata directly observable from database
 * IMMUTABILITY: Frozen snapshot - schema doesn't change after fetch
 * INTENT PRESERVATION: Environment semantic maintained through lifecycle
 */
class DatabaseSchema {
    name;
    environment;
    tables;
    fetchedAt;
    constructor(name, environment, tables, fetchedAt) {
        if (!name || name.trim().length === 0) {
            throw new Error('Database name cannot be empty');
        }
        if (tables.length === 0) {
            throw new Error('Database must have at least one table');
        }
        this.name = name.trim();
        this.environment = environment;
        this.tables = Object.freeze([...tables]);
        this.fetchedAt = fetchedAt;
        Object.freeze(this);
    }
    /**
     * Get table by name
     *
     * @returns TableInfo or undefined if not found
     */
    getTable(tableName) {
        return this.tables.find((t) => t.name === tableName);
    }
    /**
     * Get all tables that reference a specific table
     *
     * Semantic: Find dependent tables (children in relationships)
     */
    getTablesThatReference(tableName) {
        return this.tables.filter((t) => t.getReferencedTables().includes(tableName));
    }
    /**
     * Get all tables that a specific table references
     *
     * Semantic: Find dependencies (parents in relationships)
     */
    getTablesReferencedBy(tableName) {
        const table = this.getTable(tableName);
        return table ? table.getReferencedTables() : [];
    }
    /**
     * Get table count
     */
    getTableCount() {
        return this.tables.length;
    }
    /**
     * Get tables without primary keys
     *
     * Semantic: Primary keys establish entity identity - tables without them are incomplete
     */
    getTablesWithoutPrimaryKey() {
        return this.tables.filter((t) => !t.hasPrimaryKey());
    }
    /**
     * Get tables with foreign keys (has relationships)
     */
    getTablesWithForeignKeys() {
        return this.tables.filter((t) => t.hasForeignKeys());
    }
    /**
     * Get all views (non-base tables)
     */
    getViews() {
        return this.tables.filter((t) => t.isView());
    }
    /**
     * Get all base tables (non-views)
     */
    getBaseTables() {
        return this.tables.filter((t) => !t.isView());
    }
    /**
     * Check if schema was fetched recently (within specified minutes)
     *
     * Semantic: Fresh schema data vs stale data (for caching decisions)
     */
    isFresh(withinMinutes = 10) {
        const now = new Date();
        const ageMs = now.getTime() - this.fetchedAt.getTime();
        const ageMinutes = ageMs / (1000 * 60);
        return ageMinutes <= withinMinutes;
    }
    /**
     * Get schema age in minutes
     */
    getAgeInMinutes() {
        const now = new Date();
        const ageMs = now.getTime() - this.fetchedAt.getTime();
        return ageMs / (1000 * 60);
    }
}
exports.DatabaseSchema = DatabaseSchema;
//# sourceMappingURL=DatabaseSchema.js.map