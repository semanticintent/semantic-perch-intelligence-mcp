import { Column } from './Column';
import { ForeignKey } from './ForeignKey';
import { Index } from './Index';

/**
 * 🎯 SEMANTIC INTENT: TableInfo is an aggregate root representing complete table metadata
 *
 * WHY: Tables are the primary organizational unit in relational databases
 * - Aggregate pattern: Combines columns, indexes, and foreign keys
 * - Observable from sqlite_master and PRAGMA statements
 * - Semantic boundary: Table is the consistency boundary for schema changes
 *
 * AGGREGATE ROOT: Coordinates columns, indexes, and foreign keys
 * OBSERVABLE PROPERTIES: All metadata directly observable from database
 * IMMUTABILITY: Frozen to preserve schema snapshot semantics
 */

export class TableInfo {
  public readonly name: string;
  public readonly type: 'table' | 'view';
  public readonly columns: readonly Column[];
  public readonly indexes: readonly Index[];
  public readonly foreignKeys: readonly ForeignKey[];

  constructor(
    name: string,
    type: 'table' | 'view',
    columns: Column[],
    indexes: Index[] = [],
    foreignKeys: ForeignKey[] = []
  ) {
    if (!name || name.trim().length === 0) {
      throw new Error('Table name cannot be empty');
    }

    if (columns.length === 0) {
      throw new Error('Table must have at least one column');
    }

    this.name = name.trim();
    this.type = type;
    this.columns = Object.freeze([...columns]);
    this.indexes = Object.freeze([...indexes]);
    this.foreignKeys = Object.freeze([...foreignKeys]);

    Object.freeze(this);
  }

  /**
   * Check if table has a primary key
   *
   * Semantic: Primary keys establish entity identity
   */
  hasPrimaryKey(): boolean {
    return this.columns.some((col) => col.isPrimaryKey);
  }

  /**
   * Get primary key column(s)
   *
   * Observable: Primary keys directly visible in schema
   */
  getPrimaryKeyColumns(): Column[] {
    return this.columns.filter((col) => col.isPrimaryKey);
  }

  /**
   * Check if table has foreign keys (relationships)
   *
   * Semantic: Foreign keys indicate relationships with other tables
   */
  hasForeignKeys(): boolean {
    return this.foreignKeys.length > 0;
  }

  /**
   * Check if specific column has an index
   *
   * Observable: Index coverage is directly observable
   */
  hasIndexOnColumn(columnName: string): boolean {
    return this.indexes.some((idx) => idx.coversColumn(columnName));
  }

  /**
   * Get column by name
   *
   * @returns Column or undefined if not found
   */
  getColumn(columnName: string): Column | undefined {
    return this.columns.find((col) => col.name === columnName);
  }

  /**
   * Get all foreign key columns (columns that reference other tables)
   */
  getForeignKeyColumns(): string[] {
    return [...new Set(this.foreignKeys.map((fk) => fk.column))];
  }

  /**
   * Check if table is a view (not a base table)
   */
  isView(): boolean {
    return this.type === 'view';
  }

  /**
   * Get required columns (NOT NULL without default)
   *
   * Semantic: Required columns must have values on insert
   */
  getRequiredColumns(): Column[] {
    return this.columns.filter((col) => col.isRequired());
  }

  /**
   * Get column count
   */
  getColumnCount(): number {
    return this.columns.length;
  }

  /**
   * Get index count
   */
  getIndexCount(): number {
    return this.indexes.length;
  }

  /**
   * Get foreign key count
   */
  getForeignKeyCount(): number {
    return this.foreignKeys.length;
  }

  /**
   * Get tables that this table references (via foreign keys)
   *
   * Semantic: Dependencies - tables we depend on
   */
  getReferencedTables(): string[] {
    return [...new Set(this.foreignKeys.map((fk) => fk.referencesTable))];
  }
}
