import type { Column } from '../entities/Column';
import type { TableInfo } from '../entities/TableInfo';

/**
 * 🎯 SEMANTIC INTENT: SchemaAnalyzer provides pure business logic for schema analysis
 *
 * WHY: Domain service for schema analysis operations
 * - Pure business logic - no infrastructure dependencies
 * - Analyzes table structures based on semantic rules
 * - Identifies schema patterns and anomalies
 *
 * DOMAIN SERVICE: Stateless operations on domain entities
 * NO INFRASTRUCTURE: No HTTP, no database access, no external dependencies
 * SEMANTIC RULES: Analysis based on observable schema properties
 */

export interface SchemaAnalysisResult {
  totalTables: number;
  totalColumns: number;
  tablesWithPrimaryKeys: number;
  tablesWithoutPrimaryKeys: number;
  tablesWithForeignKeys: number;
  tablesWithIndexes: number;
  totalIndexes: number;
  totalForeignKeys: number;
  totalViews: number;
}

export interface TableAnalysis {
  tableName: string;
  columnCount: number;
  hasPrimaryKey: boolean;
  primaryKeyColumns: string[];
  requiredColumns: string[];
  foreignKeyCount: number;
  indexCount: number;
  isView: boolean;
}

export class SchemaAnalyzer {
  /**
   * Analyze overall schema statistics
   *
   * Semantic: High-level schema health metrics
   */
  analyzeSchema(tables: TableInfo[]): SchemaAnalysisResult {
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
  analyzeTable(table: TableInfo): TableAnalysis {
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
  analyzeColumnTypes(tables: TableInfo[]): Map<string, number> {
    const typeCount = new Map<string, number>();

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
  identifyProblematicTables(tables: TableInfo[]): TableInfo[] {
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
  analyzeNullability(table: TableInfo): {
    nullableColumns: Column[];
    requiredColumns: Column[];
    nullablePercentage: number;
  } {
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
  private countTotalColumns(tables: TableInfo[]): number {
    return tables.reduce((sum, table) => sum + table.getColumnCount(), 0);
  }

  /**
   * Get tables sorted by complexity (column count + index count + FK count)
   *
   * Semantic: Identify most complex tables for maintenance focus
   */
  getTablesByComplexity(tables: TableInfo[]): Array<{ table: TableInfo; complexity: number }> {
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
  identifyOrphanedTables(tables: TableInfo[]): TableInfo[] {
    // Tables that don't reference others and aren't referenced by others
    const referencedTableNames = new Set<string>();
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
