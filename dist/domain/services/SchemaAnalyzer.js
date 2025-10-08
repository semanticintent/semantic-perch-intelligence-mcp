"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaAnalyzer = void 0;
class SchemaAnalyzer {
    /**
     * Analyze overall schema statistics
     *
     * Semantic: High-level schema health metrics
     */
    analyzeSchema(tables) {
        return {
            totalTables: tables.length,
            totalColumns: this.countTotalColumns(tables),
            tablesWithPrimaryKeys: tables.filter((t) => t.hasPrimaryKey()).length,
            tablesWithoutPrimaryKeys: tables.filter((t) => !t.hasPrimaryKey()).length,
            tablesWithForeignKeys: tables.filter((t) => t.hasForeignKeys()).length,
            tablesWithIndexes: tables.filter((t) => t.getIndexCount() > 0).length,
            totalIndexes: tables.reduce((sum, t) => sum + t.getIndexCount(), 0),
            totalForeignKeys: tables.reduce((sum, t) => sum + t.getForeignKeyCount(), 0),
            totalViews: tables.filter((t) => t.isView()).length,
        };
    }
    /**
     * Analyze individual table in detail
     *
     * Semantic: Table-level metadata and characteristics
     */
    analyzeTable(table) {
        return {
            tableName: table.name,
            columnCount: table.getColumnCount(),
            hasPrimaryKey: table.hasPrimaryKey(),
            primaryKeyColumns: table.getPrimaryKeyColumns().map((col) => col.name),
            requiredColumns: table.getRequiredColumns().map((col) => col.name),
            foreignKeyCount: table.getForeignKeyCount(),
            indexCount: table.getIndexCount(),
            isView: table.isView(),
        };
    }
    /**
     * Get column type distribution across tables
     *
     * Semantic: Type usage patterns for data modeling insights
     */
    analyzeColumnTypes(tables) {
        const typeCount = new Map();
        for (const table of tables) {
            for (const column of table.columns) {
                const currentCount = typeCount.get(column.type) || 0;
                typeCount.set(column.type, currentCount + 1);
            }
        }
        return typeCount;
    }
    /**
     * Identify tables with potential design issues
     *
     * Semantic: Tables that violate common best practices
     */
    identifyProblematicTables(tables) {
        return tables.filter((table) => {
            // Skip views - they don't need primary keys
            if (table.isView()) {
                return false;
            }
            // Tables without primary keys are problematic
            if (!table.hasPrimaryKey()) {
                return true;
            }
            // Tables with foreign keys but no indexes on FK columns
            if (table.hasForeignKeys()) {
                const fkColumns = table.getForeignKeyColumns();
                const hasUnindexedFK = fkColumns.some((col) => !table.hasIndexOnColumn(col));
                if (hasUnindexedFK) {
                    return true;
                }
            }
            return false;
        });
    }
    /**
     * Get nullable column analysis
     *
     * Semantic: Data quality insights - which columns allow nulls
     */
    analyzeNullability(table) {
        const nullableColumns = table.columns.filter((col) => col.isNullable);
        const requiredColumns = table.columns.filter((col) => !col.isNullable);
        return {
            nullableColumns,
            requiredColumns,
            nullablePercentage: (nullableColumns.length / table.columns.length) * 100,
        };
    }
    /**
     * Count total columns across all tables
     */
    countTotalColumns(tables) {
        return tables.reduce((sum, table) => sum + table.getColumnCount(), 0);
    }
    /**
     * Get tables sorted by complexity (column count + index count + FK count)
     *
     * Semantic: Identify most complex tables for maintenance focus
     */
    getTablesByComplexity(tables) {
        return tables
            .map((table) => ({
            table,
            complexity: table.getColumnCount() + table.getIndexCount() + table.getForeignKeyCount(),
        }))
            .sort((a, b) => b.complexity - a.complexity);
    }
    /**
     * Identify orphaned tables (no foreign keys in or out)
     *
     * Semantic: Tables with no relationships - potential data islands
     */
    identifyOrphanedTables(tables) {
        // Tables that don't reference others and aren't referenced by others
        const referencedTableNames = new Set();
        for (const table of tables) {
            for (const fk of table.foreignKeys) {
                referencedTableNames.add(fk.referencesTable);
            }
        }
        return tables.filter((table) => {
            const hasOutgoingFKs = table.hasForeignKeys();
            const hasIncomingFKs = referencedTableNames.has(table.name);
            return !hasOutgoingFKs && !hasIncomingFKs && !table.isView();
        });
    }
}
exports.SchemaAnalyzer = SchemaAnalyzer;
//# sourceMappingURL=SchemaAnalyzer.js.map