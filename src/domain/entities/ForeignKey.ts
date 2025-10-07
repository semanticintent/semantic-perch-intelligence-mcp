/**
 * 🎯 SEMANTIC INTENT: ForeignKey represents referential integrity relationship
 *
 * WHY: Foreign keys are semantic relationship markers
 * - Preserve referential integrity between tables
 * - Define cascade/restrict behavior semantics
 * - Observable from PRAGMA foreign_key_list
 *
 * OBSERVABLE PROPERTIES: Directly observable from database schema
 * SEMANTIC ANCHORING: Foreign keys indicate intentional data relationships
 * IMMUTABILITY: Frozen to preserve relationship semantics
 */

export type OnDeleteAction = 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';

export class ForeignKey {
  public readonly table: string;
  public readonly column: string;
  public readonly referencesTable: string;
  public readonly referencesColumn: string;
  public readonly onDelete: OnDeleteAction | null;
  public readonly onUpdate: OnDeleteAction | null;

  constructor(
    table: string,
    column: string,
    referencesTable: string,
    referencesColumn: string,
    onDelete: OnDeleteAction | null = null,
    onUpdate: OnDeleteAction | null = null
  ) {
    if (!table || table.trim().length === 0) {
      throw new Error('Foreign key table name cannot be empty');
    }
    if (!column || column.trim().length === 0) {
      throw new Error('Foreign key column name cannot be empty');
    }
    if (!referencesTable || referencesTable.trim().length === 0) {
      throw new Error('Referenced table name cannot be empty');
    }
    if (!referencesColumn || referencesColumn.trim().length === 0) {
      throw new Error('Referenced column name cannot be empty');
    }

    this.table = table.trim();
    this.column = column.trim();
    this.referencesTable = referencesTable.trim();
    this.referencesColumn = referencesColumn.trim();
    this.onDelete = onDelete;
    this.onUpdate = onUpdate;

    Object.freeze(this);
  }

  /**
   * Check if relationship is required (CASCADE or RESTRICT on delete)
   *
   * Semantic: CASCADE/RESTRICT implies required relationship
   */
  isRequired(): boolean {
    return this.onDelete === 'CASCADE' || this.onDelete === 'RESTRICT';
  }

  /**
   * Check if deletes cascade to child records
   */
  cascadesOnDelete(): boolean {
    return this.onDelete === 'CASCADE';
  }
}
