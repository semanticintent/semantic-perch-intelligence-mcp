"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizationService = void 0;
const Optimization_1 = require("../entities/Optimization");
/**
 * 🎯 SEMANTIC INTENT: OptimizationService generates schema improvement recommendations
 *
 * WHY: Domain service for schema optimization analysis
 * - Based on observable schema patterns (NOT runtime metrics)
 * - Identifies missing indexes, primary keys, and design issues
 * - Semantic rules for database best practices
 *
 * DOMAIN SERVICE: Stateless optimization logic
 * OBSERVABLE ANCHORING: Based on schema structure, not query performance
 * NO INFRASTRUCTURE: Pure business logic
 */
class OptimizationService {
    /**
     * Analyze schema and generate all optimizations
     *
     * Semantic: Comprehensive schema health check
     */
    analyzeSchema(tables, relationships) {
        const optimizations = [];
        optimizations.push(...this.checkMissingPrimaryKeys(tables));
        optimizations.push(...this.checkMissingIndexes(tables, relationships));
        optimizations.push(...this.checkNullableForeignKeys(tables));
        return optimizations;
    }
    /**
     * Check for tables without primary keys
     *
     * Semantic: Primary keys establish entity identity - tables without them are incomplete
     */
    checkMissingPrimaryKeys(tables) {
        return tables
            .filter((table) => !table.hasPrimaryKey() && !table.isView())
            .map((table) => new Optimization_1.Optimization('missing_primary_key', table.name, 'Table without primary key may cause replication and uniqueness issues', `ALTER TABLE ${table.name} ADD COLUMN id INTEGER PRIMARY KEY`, 'high'));
    }
    /**
     * Check for foreign keys without indexes
     *
     * Semantic: Foreign key columns without indexes cause slow joins
     */
    checkMissingIndexes(tables, relationships) {
        const optimizations = [];
        for (const table of tables) {
            const fkColumns = table.getForeignKeyColumns();
            for (const column of fkColumns) {
                if (!table.hasIndexOnColumn(column)) {
                    const rel = relationships.find((r) => r.fromTable === table.name && r.fromColumn === column);
                    optimizations.push(new Optimization_1.Optimization('missing_index', table.name, `Foreign key column '${column}' without index may cause slow joins`, `CREATE INDEX idx_${table.name}_${column} ON ${table.name}(${column})`, 'high', column));
                }
            }
        }
        return optimizations;
    }
    /**
     * Check for nullable foreign key columns
     *
     * Semantic: Nullable FKs indicate optional relationships - may be intentional but worth reviewing
     */
    checkNullableForeignKeys(tables) {
        const optimizations = [];
        for (const table of tables) {
            const fkColumns = table.getForeignKeyColumns();
            for (const columnName of fkColumns) {
                const column = table.getColumn(columnName);
                if (column && column.isNullable) {
                    optimizations.push(new Optimization_1.Optimization('nullable_foreign_key', table.name, `Foreign key column '${columnName}' is nullable - consider if relationship is truly optional`, `Review business logic: Should ${table.name}.${columnName} always reference ${table.name}?`, 'medium', columnName));
                }
            }
        }
        return optimizations;
    }
    /**
     * Find redundant indexes (covered by other indexes)
     *
     * Semantic: Index on (A) is redundant if index on (A, B) exists
     */
    checkRedundantIndexes(table) {
        const optimizations = [];
        const indexes = Array.from(table.indexes);
        for (let i = 0; i < indexes.length; i++) {
            for (let j = 0; j < indexes.length; j++) {
                if (i === j)
                    continue;
                const index1 = indexes[i];
                const index2 = indexes[j];
                // Check if index1 is a prefix of index2
                if (this.isIndexPrefix(index1.columns, index2.columns)) {
                    optimizations.push(new Optimization_1.Optimization('redundant_index', table.name, `Index ${index1.name} is redundant - covered by ${index2.name}`, `DROP INDEX ${index1.name}`, 'low'));
                }
            }
        }
        return optimizations;
    }
    /**
     * Get optimizations filtered by priority
     */
    filterByPriority(optimizations, priority) {
        return optimizations.filter((opt) => opt.priority === priority);
    }
    /**
     * Get optimizations filtered by type
     */
    filterByType(optimizations, type) {
        return optimizations.filter((opt) => opt.type === type);
    }
    /**
     * Get optimizations for specific table
     */
    filterByTable(optimizations, tableName) {
        return optimizations.filter((opt) => opt.table === tableName);
    }
    /**
     * Sort optimizations by priority (high -> medium -> low)
     */
    sortByPriority(optimizations) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return [...optimizations].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }
    /**
     * Get summary statistics of optimizations
     */
    getSummary(optimizations) {
        const byType = new Map();
        for (const opt of optimizations) {
            byType.set(opt.type, (byType.get(opt.type) || 0) + 1);
        }
        return {
            total: optimizations.length,
            byPriority: {
                high: this.filterByPriority(optimizations, 'high').length,
                medium: this.filterByPriority(optimizations, 'medium').length,
                low: this.filterByPriority(optimizations, 'low').length,
            },
            byType,
        };
    }
    /**
     * Check if columns1 is a prefix of columns2
     */
    isIndexPrefix(columns1, columns2) {
        if (columns1.length >= columns2.length)
            return false;
        for (let i = 0; i < columns1.length; i++) {
            if (columns1[i] !== columns2[i])
                return false;
        }
        return true;
    }
}
exports.OptimizationService = OptimizationService;
//# sourceMappingURL=OptimizationService.js.map