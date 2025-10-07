/**
 * 🎯 SEMANTIC INTENT: Index represents database index metadata
 *
 * WHY: Indexes are semantic performance optimization markers
 * - name: Observable identifier
 * - tableName: Table being indexed
 * - columns: Indexed columns (order matters for composite indexes)
 * - isUnique: Semantic uniqueness constraint
 *
 * OBSERVABLE PROPERTIES: Directly observable from sqlite_master
 * SEMANTIC ANCHORING: Indexes indicate intentional query optimization
 * IMMUTABILITY: Frozen to preserve schema semantics
 */

export class Index {
  public readonly name: string;
  public readonly tableName: string;
  public readonly columns: readonly string[];
  public readonly isUnique: boolean;

  constructor(name: string, tableName: string, columns: string[], isUnique: boolean = false) {
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

    Object.freeze(this);
  }

  /**
   * Check if this is a composite index (multiple columns)
   *
   * Semantic: Composite indexes optimize multi-column queries
   */
  isComposite(): boolean {
    return this.columns.length > 1;
  }

  /**
   * Check if index covers a specific column
   *
   * Observable: Column coverage is directly observable
   */
  coversColumn(columnName: string): boolean {
    return this.columns.includes(columnName);
  }

  /**
   * Check if index is the first column (most selective)
   *
   * Semantic: First column in composite index can be used alone
   */
  hasColumnAsPrefix(columnName: string): boolean {
    return this.columns[0] === columnName;
  }

  /**
   * Get index column count
   */
  getColumnCount(): number {
    return this.columns.length;
  }
}
