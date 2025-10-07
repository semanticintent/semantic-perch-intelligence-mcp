import type { OnDeleteAction } from './ForeignKey';

/**
 * 🎯 SEMANTIC INTENT: Relationship represents semantic connection between tables
 *
 * WHY: Relationships are higher-level semantic abstractions of foreign keys
 * - Foreign keys are implementation details (column-level)
 * - Relationships are semantic connections (table-level)
 * - Preserves referential integrity semantics
 *
 * SEMANTIC ANCHORING: Based on observable foreign key constraints
 * OBSERVABLE PROPERTIES: Derived from foreign key metadata
 * IMMUTABILITY: Frozen to preserve relationship semantics
 */

export class Relationship {
  public readonly fromTable: string;
  public readonly fromColumn: string;
  public readonly toTable: string;
  public readonly toColumn: string;
  public readonly onDelete: OnDeleteAction | null;
  public readonly onUpdate: OnDeleteAction | null;

  constructor(
    fromTable: string,
    fromColumn: string,
    toTable: string,
    toColumn: string,
    onDelete: OnDeleteAction | null = null,
    onUpdate: OnDeleteAction | null = null
  ) {
    if (!fromTable || fromTable.trim().length === 0) {
      throw new Error('Relationship fromTable cannot be empty');
    }
    if (!fromColumn || fromColumn.trim().length === 0) {
      throw new Error('Relationship fromColumn cannot be empty');
    }
    if (!toTable || toTable.trim().length === 0) {
      throw new Error('Relationship toTable cannot be empty');
    }
    if (!toColumn || toColumn.trim().length === 0) {
      throw new Error('Relationship toColumn cannot be empty');
    }

    this.fromTable = fromTable.trim();
    this.fromColumn = fromColumn.trim();
    this.toTable = toTable.trim();
    this.toColumn = toColumn.trim();
    this.onDelete = onDelete;
    this.onUpdate = onUpdate;

    Object.freeze(this);
  }

  /**
   * Check if relationship is required (CASCADE or RESTRICT)
   *
   * Semantic: CASCADE/RESTRICT implies tight coupling
   */
  isRequired(): boolean {
    return this.onDelete === 'CASCADE' || this.onDelete === 'RESTRICT';
  }

  /**
   * Check if relationship cascades deletes
   *
   * Semantic: CASCADE means child records are deleted with parent
   */
  cascadesOnDelete(): boolean {
    return this.onDelete === 'CASCADE';
  }

  /**
   * Check if relationship is optional (SET NULL or NO ACTION)
   *
   * Semantic: Optional relationships can exist independently
   */
  isOptional(): boolean {
    return this.onDelete === 'SET NULL' || this.onDelete === 'NO ACTION' || this.onDelete === null;
  }

  /**
   * Get relationship direction description
   *
   * Semantic: "posts references users" (many-to-one typical pattern)
   */
  getDescription(): string {
    return `${this.fromTable}.${this.fromColumn} → ${this.toTable}.${this.toColumn}`;
  }

  /**
   * Check if this is a self-referential relationship
   *
   * Semantic: Table referencing itself (e.g., parent_id in categories)
   */
  isSelfReferential(): boolean {
    return this.fromTable === this.toTable;
  }
}
