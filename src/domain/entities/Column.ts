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

export class Column {
  public readonly name: string;
  public readonly type: string;
  public readonly isPrimaryKey: boolean;
  public readonly isNullable: boolean;
  public readonly defaultValue: string | null;

  constructor(
    name: string,
    type: string,
    isPrimaryKey: boolean = false,
    isNullable: boolean = true,
    defaultValue: string | null = null
  ) {
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
  isRequired(): boolean {
    return !this.isNullable && this.defaultValue === null;
  }

  /**
   * Check if column has a default value
   */
  hasDefault(): boolean {
    return this.defaultValue !== null;
  }

  /**
   * Get SQL type category
   *
   * Semantic: Group types by semantic meaning
   */
  getTypeCategory(): 'text' | 'numeric' | 'blob' | 'unknown' {
    const normalizedType = this.type.toUpperCase();

    if (normalizedType.includes('TEXT') || normalizedType.includes('CHAR')) {
      return 'text';
    }

    if (
      normalizedType.includes('INT') ||
      normalizedType.includes('REAL') ||
      normalizedType.includes('NUMERIC') ||
      normalizedType.includes('DECIMAL')
    ) {
      return 'numeric';
    }

    if (normalizedType.includes('BLOB')) {
      return 'blob';
    }

    return 'unknown';
  }
}
