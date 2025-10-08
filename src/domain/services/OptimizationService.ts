import { Optimization } from '../entities/Optimization';
import type { Relationship } from '../entities/Relationship';
import type { TableInfo } from '../entities/TableInfo';

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

export class OptimizationService {
  /**
   * Analyze schema and generate all optimizations
   *
   * Semantic: Comprehensive schema health check
   */
  analyzeSchema(tables: TableInfo[], relationships: Relationship[]): Optimization[] {
    const optimizations: Optimization[] = [];

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
  checkMissingPrimaryKeys(tables: TableInfo[]): Optimization[] {
    return tables
      .filter((table) => !table.hasPrimaryKey() && !table.isView())
      .map(
        (table) =>
          new Optimization(
            'missing_primary_key',
            table.name,
            'Table without primary key may cause replication and uniqueness issues',
            `ALTER TABLE ${table.name} ADD COLUMN id INTEGER PRIMARY KEY`,
            'high'
          )
      );
  }

  /**
   * Check for foreign keys without indexes
   *
   * Semantic: Foreign key columns without indexes cause slow joins
   */
  checkMissingIndexes(tables: TableInfo[], relationships: Relationship[]): Optimization[] {
    const optimizations: Optimization[] = [];

    for (const table of tables) {
      const fkColumns = table.getForeignKeyColumns();

      for (const column of fkColumns) {
        if (!table.hasIndexOnColumn(column)) {
          const rel = relationships.find((r) => r.fromTable === table.name && r.fromColumn === column);

          optimizations.push(
            new Optimization(
              'missing_index',
              table.name,
              `Foreign key column '${column}' without index may cause slow joins`,
              `CREATE INDEX idx_${table.name}_${column} ON ${table.name}(${column})`,
              'high',
              column
            )
          );
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
  checkNullableForeignKeys(tables: TableInfo[]): Optimization[] {
    const optimizations: Optimization[] = [];

    for (const table of tables) {
      const fkColumns = table.getForeignKeyColumns();

      for (const columnName of fkColumns) {
        const column = table.getColumn(columnName);
        if (column && column.isNullable) {
          optimizations.push(
            new Optimization(
              'nullable_foreign_key',
              table.name,
              `Foreign key column '${columnName}' is nullable - consider if relationship is truly optional`,
              `Review business logic: Should ${table.name}.${columnName} always reference ${table.name}?`,
              'medium',
              columnName
            )
          );
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
  checkRedundantIndexes(table: TableInfo): Optimization[] {
    const optimizations: Optimization[] = [];
    const indexes = Array.from(table.indexes);

    for (let i = 0; i < indexes.length; i++) {
      for (let j = 0; j < indexes.length; j++) {
        if (i === j) continue;

        const index1 = indexes[i];
        const index2 = indexes[j];

        // Check if index1 is a prefix of index2
        if (this.isIndexPrefix(index1.columns, index2.columns)) {
          optimizations.push(
            new Optimization(
              'redundant_index',
              table.name,
              `Index ${index1.name} is redundant - covered by ${index2.name}`,
              `DROP INDEX ${index1.name}`,
              'low'
            )
          );
        }
      }
    }

    return optimizations;
  }

  /**
   * Get optimizations filtered by priority
   */
  filterByPriority(optimizations: Optimization[], priority: 'high' | 'medium' | 'low'): Optimization[] {
    return optimizations.filter((opt) => opt.priority === priority);
  }

  /**
   * Get optimizations filtered by type
   */
  filterByType(optimizations: Optimization[], type: Optimization['type']): Optimization[] {
    return optimizations.filter((opt) => opt.type === type);
  }

  /**
   * Get optimizations for specific table
   */
  filterByTable(optimizations: Optimization[], tableName: string): Optimization[] {
    return optimizations.filter((opt) => opt.table === tableName);
  }

  /**
   * Sort optimizations by priority (high -> medium -> low)
   */
  sortByPriority(optimizations: Optimization[]): Optimization[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...optimizations].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Get summary statistics of optimizations
   */
  getSummary(optimizations: Optimization[]): {
    total: number;
    byPriority: { high: number; medium: number; low: number };
    byType: Map<string, number>;
  } {
    const byType = new Map<string, number>();

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
  private isIndexPrefix(columns1: readonly string[], columns2: readonly string[]): boolean {
    if (columns1.length >= columns2.length) return false;

    for (let i = 0; i < columns1.length; i++) {
      if (columns1[i] !== columns2[i]) return false;
    }

    return true;
  }
}
