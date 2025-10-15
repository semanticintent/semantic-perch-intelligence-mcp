"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaComparator = void 0;
const SchemaDifference_1 = require("../entities/SchemaDifference");
const SchemaComparisonResult_1 = require("../entities/SchemaComparisonResult");
const ICECalculator_1 = require("./ICECalculator");
const InsightAnalysis_1 = require("../value-objects/InsightAnalysis");
const ContextAnalysis_1 = require("../value-objects/ContextAnalysis");
const ExecutionPlan_1 = require("../value-objects/ExecutionPlan");
/**
 * 🎯 SEMANTIC INTENT: SchemaComparator detects and analyzes differences between database schemas
 *
 * WHY: Schema drift between environments causes production incidents
 * - Compare schemas to find missing tables, columns, indexes
 * - Detect type mismatches and constraint differences
 * - Calculate ICE scores for each difference
 * - Generate prioritized comparison results
 *
 * DOMAIN SERVICE: Pure schema comparison logic
 * OBSERVABLE ANCHORING: Direct comparison of schema structures
 * STATELESS: No internal state, pure comparison operations
 */
class SchemaComparator {
    iceCalculator;
    constructor() {
        this.iceCalculator = new ICECalculator_1.ICECalculator();
    }
    /**
     * Compare two schemas and return differences with ICE scoring
     *
     * Semantic: Comprehensive schema comparison with priority assessment
     */
    compare(sourceSchema, targetSchema, sourceEnvironment, targetEnvironment) {
        const differences = [];
        // Find missing tables (in source but not in target)
        const missingTables = this.findMissingTables(sourceSchema, targetSchema, sourceEnvironment, targetEnvironment);
        differences.push(...missingTables);
        // Find extra tables (in target but not in source) - less critical
        const extraTables = this.findExtraTables(sourceSchema, targetSchema, sourceEnvironment, targetEnvironment);
        differences.push(...extraTables);
        // For tables that exist in both, compare columns and constraints
        const commonTables = this.findCommonTables(sourceSchema, targetSchema);
        for (const { sourceTable, targetTable } of commonTables) {
            // Compare columns
            const columnDiffs = this.compareColumns(sourceTable, targetTable, sourceEnvironment, targetEnvironment);
            differences.push(...columnDiffs);
            // Compare indexes
            const indexDiffs = this.compareIndexes(sourceTable, targetTable, sourceEnvironment, targetEnvironment);
            differences.push(...indexDiffs);
            // Compare foreign keys
            const fkDiffs = this.compareForeignKeys(sourceTable, targetTable, sourceEnvironment, targetEnvironment);
            differences.push(...fkDiffs);
        }
        return new SchemaComparisonResult_1.SchemaComparisonResult(sourceEnvironment, targetEnvironment, sourceSchema.tables.length, targetSchema.tables.length, differences);
    }
    /**
     * Find tables in source but missing in target
     */
    findMissingTables(sourceSchema, targetSchema, sourceEnv, targetEnv) {
        const differences = [];
        const targetTableNames = new Set(targetSchema.tables.map((t) => t.name));
        for (const sourceTable of sourceSchema.tables) {
            if (!targetTableNames.has(sourceTable.name)) {
                const ddl = this.generateCreateTableDDL(sourceTable);
                const insight = InsightAnalysis_1.InsightAnalysis.forSchemaDifference('missing_table', sourceTable.name, targetEnv === 'production');
                const context = ContextAnalysis_1.ContextAnalysis.forSchemaMigration(sourceEnv, targetEnv, 1);
                const execution = ExecutionPlan_1.ExecutionPlan.forSchemaDifference('missing_table', sourceTable.name, ddl);
                differences.push(SchemaDifference_1.SchemaDifference.create('missing_table', { tableName: sourceTable.name }, `Table '${sourceTable.name}' exists in ${sourceEnv} but missing in ${targetEnv}`, sourceEnv, targetEnv, insight, context, execution));
            }
        }
        return differences;
    }
    /**
     * Find tables in target but not in source (reverse drift)
     */
    findExtraTables(sourceSchema, targetSchema, sourceEnv, targetEnv) {
        const differences = [];
        const sourceTableNames = new Set(sourceSchema.tables.map((t) => t.name));
        for (const targetTable of targetSchema.tables) {
            if (!sourceTableNames.has(targetTable.name)) {
                const ddl = `-- Table '${targetTable.name}' exists in ${targetEnv} but not in ${sourceEnv}\n-- Consider if this should be in ${sourceEnv}`;
                const insight = new InsightAnalysis_1.InsightAnalysis({ tableImportance: 5 }, `Extra table in ${targetEnv}`);
                const context = ContextAnalysis_1.ContextAnalysis.forEnvironment(targetEnv, false);
                const execution = new ExecutionPlan_1.ExecutionPlan(ddl, { sqlPrecision: 5 }, 'Review required');
                differences.push(SchemaDifference_1.SchemaDifference.create('extra_table', { tableName: targetTable.name }, `Table '${targetTable.name}' exists in ${targetEnv} but not in ${sourceEnv}`, sourceEnv, targetEnv, insight, context, execution));
            }
        }
        return differences;
    }
    /**
     * Find tables that exist in both schemas
     */
    findCommonTables(sourceSchema, targetSchema) {
        const common = [];
        const targetTableMap = new Map(targetSchema.tables.map((t) => [t.name, t]));
        for (const sourceTable of sourceSchema.tables) {
            const targetTable = targetTableMap.get(sourceTable.name);
            if (targetTable) {
                common.push({ sourceTable, targetTable });
            }
        }
        return common;
    }
    /**
     * Compare columns between two tables
     */
    compareColumns(sourceTable, targetTable, sourceEnv, targetEnv) {
        const differences = [];
        const targetColumnMap = new Map(targetTable.columns.map((c) => [c.name, c]));
        // Find missing columns
        for (const sourceColumn of sourceTable.columns) {
            const targetColumn = targetColumnMap.get(sourceColumn.name);
            if (!targetColumn) {
                // Missing column
                const ddl = `ALTER TABLE ${targetTable.name} ADD COLUMN ${sourceColumn.name} ${sourceColumn.type}${!sourceColumn.isNullable ? ' NOT NULL' : ''}`;
                const insight = InsightAnalysis_1.InsightAnalysis.forSchemaDifference('missing_column', `${targetTable.name}.${sourceColumn.name}`, targetEnv === 'production');
                const context = ContextAnalysis_1.ContextAnalysis.forSchemaMigration(sourceEnv, targetEnv, 1);
                const execution = ExecutionPlan_1.ExecutionPlan.forSchemaDifference('missing_column', sourceColumn.name, ddl);
                differences.push(SchemaDifference_1.SchemaDifference.create('missing_column', { tableName: targetTable.name, columnName: sourceColumn.name }, `Column '${sourceColumn.name}' missing in ${targetEnv}`, sourceEnv, targetEnv, insight, context, execution));
            }
            else if (this.areColumnTypesDifferent(sourceColumn, targetColumn)) {
                // Type mismatch
                const ddl = `-- Type mismatch: ${targetTable.name}.${sourceColumn.name}\n-- Source (${sourceEnv}): ${sourceColumn.type}\n-- Target (${targetEnv}): ${targetColumn.type}\n-- Review and migrate data carefully`;
                const insight = InsightAnalysis_1.InsightAnalysis.forSchemaDifference('type_mismatch', `${targetTable.name}.${sourceColumn.name}`, targetEnv === 'production');
                const context = ContextAnalysis_1.ContextAnalysis.forSchemaMigration(sourceEnv, targetEnv, 1);
                const execution = ExecutionPlan_1.ExecutionPlan.forSchemaDifference('type_mismatch', sourceColumn.name, ddl);
                differences.push(SchemaDifference_1.SchemaDifference.create('type_mismatch', {
                    tableName: targetTable.name,
                    columnName: sourceColumn.name,
                    sourceValue: sourceColumn.type,
                    targetValue: targetColumn.type,
                }, `Column '${sourceColumn.name}' type mismatch: ${sourceColumn.type} (${sourceEnv}) vs ${targetColumn.type} (${targetEnv})`, sourceEnv, targetEnv, insight, context, execution));
            }
        }
        // Find extra columns (in target but not source)
        const sourceColumnNames = new Set(sourceTable.columns.map((c) => c.name));
        for (const targetColumn of targetTable.columns) {
            if (!sourceColumnNames.has(targetColumn.name)) {
                const ddl = `-- Column '${targetColumn.name}' exists in ${targetEnv} but not in ${sourceEnv}`;
                const insight = new InsightAnalysis_1.InsightAnalysis({ tableImportance: 4 }, `Extra column in ${targetEnv}`);
                const context = ContextAnalysis_1.ContextAnalysis.forEnvironment(targetEnv, false);
                const execution = new ExecutionPlan_1.ExecutionPlan(ddl, { sqlPrecision: 5 }, 'Review required');
                differences.push(SchemaDifference_1.SchemaDifference.create('extra_column', { tableName: targetTable.name, columnName: targetColumn.name }, `Column '${targetColumn.name}' exists in ${targetEnv} but not in ${sourceEnv}`, sourceEnv, targetEnv, insight, context, execution));
            }
        }
        return differences;
    }
    /**
     * Compare indexes between two tables
     */
    compareIndexes(sourceTable, targetTable, sourceEnv, targetEnv) {
        const differences = [];
        const targetIndexNames = new Set(targetTable.indexes.map((i) => i.name));
        for (const sourceIndex of sourceTable.indexes) {
            if (!targetIndexNames.has(sourceIndex.name)) {
                const columnList = sourceIndex.columns.join(', ');
                const ddl = `CREATE INDEX ${sourceIndex.name} ON ${targetTable.name}(${columnList})`;
                const insight = new InsightAnalysis_1.InsightAnalysis({ tableImportance: 7, relationshipImpact: 7, semanticClarity: 9 }, `Index '${sourceIndex.name}' missing in ${targetEnv}`);
                const context = ContextAnalysis_1.ContextAnalysis.forSchemaMigration(sourceEnv, targetEnv, 1);
                const execution = ExecutionPlan_1.ExecutionPlan.forCreateIndex(targetTable.name, columnList);
                differences.push(SchemaDifference_1.SchemaDifference.create('missing_index', { tableName: targetTable.name, columnName: columnList }, `Index '${sourceIndex.name}' missing in ${targetEnv}`, sourceEnv, targetEnv, insight, context, execution));
            }
        }
        return differences;
    }
    /**
     * Compare foreign keys between two tables
     */
    compareForeignKeys(sourceTable, targetTable, sourceEnv, targetEnv) {
        const differences = [];
        const targetFKNames = new Set(targetTable.foreignKeys.map((fk) => fk.column));
        for (const sourceFk of sourceTable.foreignKeys) {
            if (!targetFKNames.has(sourceFk.column)) {
                const ddl = `-- Foreign key '${sourceFk.column}' missing in ${targetEnv}\n-- ${sourceFk.table}.${sourceFk.column} -> ${sourceFk.referencesTable}.${sourceFk.referencesColumn}`;
                const insight = new InsightAnalysis_1.InsightAnalysis({ tableImportance: 7, dataIntegrity: 8, semanticClarity: 9 }, `Foreign key '${sourceFk.column}' missing in ${targetEnv}`);
                const context = ContextAnalysis_1.ContextAnalysis.forSchemaMigration(sourceEnv, targetEnv, 1);
                const execution = new ExecutionPlan_1.ExecutionPlan(ddl, { sqlPrecision: 7, rollbackSafety: 8 }, 'Add foreign key constraint');
                differences.push(SchemaDifference_1.SchemaDifference.create('missing_foreign_key', { tableName: targetTable.name, columnName: sourceFk.column }, `Foreign key '${sourceFk.column}' missing in ${targetEnv}`, sourceEnv, targetEnv, insight, context, execution));
            }
        }
        return differences;
    }
    /**
     * Check if column types are significantly different
     */
    areColumnTypesDifferent(col1, col2) {
        // Normalize types for comparison (SQLite is flexible with types)
        const type1 = this.normalizeType(col1.type);
        const type2 = this.normalizeType(col2.type);
        return type1 !== type2;
    }
    /**
     * Normalize SQL type for comparison
     */
    normalizeType(type) {
        const normalized = type.toUpperCase().trim();
        // SQLite type affinity rules
        if (normalized.includes('INT'))
            return 'INTEGER';
        if (normalized.includes('CHAR') || normalized.includes('CLOB') || normalized.includes('TEXT'))
            return 'TEXT';
        if (normalized.includes('BLOB'))
            return 'BLOB';
        if (normalized.includes('REAL') || normalized.includes('FLOA') || normalized.includes('DOUB'))
            return 'REAL';
        return normalized;
    }
    /**
     * Generate CREATE TABLE DDL for a table
     */
    generateCreateTableDDL(table) {
        const lines = [];
        lines.push(`CREATE TABLE ${table.name} (`);
        const columnDefs = table.columns.map((col) => {
            let def = `  ${col.name} ${col.type}`;
            if (col.isPrimaryKey)
                def += ' PRIMARY KEY';
            if (!col.isNullable && !col.isPrimaryKey)
                def += ' NOT NULL';
            return def;
        });
        lines.push(columnDefs.join(',\n'));
        lines.push(');');
        return lines.join('\n');
    }
}
exports.SchemaComparator = SchemaComparator;
//# sourceMappingURL=SchemaComparator.js.map