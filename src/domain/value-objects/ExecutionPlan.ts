/**
 * 🎯 SEMANTIC INTENT: ExecutionPlan captures the clarity and precision of action
 *
 * WHY: The "E" in ICE - measures how well we can execute the fix
 * - SQL precision (is the solution clear and correct?)
 * - Migration complexity (how hard is it to apply?)
 * - Rollback safety (can we undo it if needed?)
 * - Testing requirements (how do we verify it worked?)
 *
 * VALUE OBJECT: Immutable execution strategy
 * OBSERVABLE ANCHORING: Based on SQL characteristics and migration properties
 * SCORING GUIDANCE: 0-10 scale for execution clarity and safety
 */

export interface ExecutionFactors {
  sqlPrecision?: number; // 0-10: Is the SQL clear, correct, and safe?
  migrationComplexity?: number; // 0-10: How hard is it to apply? (inverse - lower is better)
  rollbackSafety?: number; // 0-10: Can we undo this easily?
  testingClarity?: number; // 0-10: Can we verify it worked?
  downtime?: number; // 0-10: Will this require downtime? (inverse)
}

export class ExecutionPlan {
  public readonly score: number;
  public readonly sql: string;
  public readonly factors: ExecutionFactors;
  public readonly reasoning: string;

  constructor(sql: string, factors: ExecutionFactors, reasoning: string) {
    if (!sql || sql.trim().length === 0) {
      throw new Error('ExecutionPlan SQL cannot be empty');
    }
    if (!reasoning || reasoning.trim().length === 0) {
      throw new Error('ExecutionPlan reasoning cannot be empty');
    }

    this.sql = sql.trim();
    this.factors = { ...factors };
    this.reasoning = reasoning.trim();

    // Calculate score as average of provided factors
    this.score = this.calculateScore();

    // Validate final score is in range
    if (this.score < 0 || this.score > 10) {
      throw new Error(`ExecutionPlan score must be 0-10, got ${this.score}`);
    }

    Object.freeze(this);
  }

  /**
   * Create execution plan for adding primary key
   *
   * Semantic: ALTER TABLE ADD COLUMN - straightforward but requires careful consideration
   * - High SQL precision (clear syntax)
   * - Medium migration complexity (need to ensure no duplicates first)
   * - Medium rollback safety (can drop column, but data loss risk)
   */
  static forAddPrimaryKey(tableName: string): ExecutionPlan {
    const sql = `ALTER TABLE ${tableName} ADD COLUMN id INTEGER PRIMARY KEY`;

    return new ExecutionPlan(
      sql,
      {
        sqlPrecision: 9, // Clear, standard SQL
        migrationComplexity: 6, // Need to check for duplicates first (inverse scoring)
        rollbackSafety: 7, // Can drop column, but be careful
        testingClarity: 9, // Easy to verify - check column exists
        downtime: 8, // Minimal downtime on SQLite
      },
      `Add primary key to ${tableName} - standard DDL operation`
    );
  }

  /**
   * Create execution plan for creating index
   *
   * Semantic: CREATE INDEX - low risk, high clarity
   * - High SQL precision
   * - Low migration complexity (straightforward)
   * - High rollback safety (can drop index safely)
   */
  static forCreateIndex(tableName: string, columnName: string): ExecutionPlan {
    const indexName = `idx_${tableName}_${columnName}`;
    const sql = `CREATE INDEX ${indexName} ON ${tableName}(${columnName})`;

    return new ExecutionPlan(
      sql,
      {
        sqlPrecision: 10, // Very clear, standard syntax
        migrationComplexity: 9, // Very easy to apply (inverse scoring)
        rollbackSafety: 10, // Can drop index with no data impact
        testingClarity: 9, // Easy to verify - check index exists
        downtime: 9, // No downtime required
      },
      `Create index on ${tableName}.${columnName} - safe, reversible operation`
    );
  }

  /**
   * Create execution plan for nullable foreign key (review only)
   *
   * Semantic: This is a business logic review, not a SQL change
   * - Low SQL precision (no SQL to execute)
   * - High complexity (requires business logic understanding)
   * - N/A rollback (no change to roll back)
   */
  static forNullableForeignKeyReview(tableName: string, columnName: string): ExecutionPlan {
    const sql = `-- Review: Should ${tableName}.${columnName} be NOT NULL?\n-- If yes: ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL`;

    return new ExecutionPlan(
      sql,
      {
        sqlPrecision: 5, // Conditional SQL, depends on business rules
        migrationComplexity: 4, // Requires business analysis (inverse scoring)
        rollbackSafety: 6, // Can revert to nullable, but may affect data
        testingClarity: 4, // Hard to test - requires business context
      },
      `Review business logic for ${tableName}.${columnName} - may require discussion`
    );
  }

  /**
   * Create execution plan for schema difference fix
   *
   * Semantic: DDL to align schemas between environments
   */
  static forSchemaDifference(
    type: 'missing_table' | 'missing_column' | 'type_mismatch',
    name: string,
    ddl: string
  ): ExecutionPlan {
    if (type === 'missing_table') {
      return new ExecutionPlan(
        ddl,
        {
          sqlPrecision: 8,
          migrationComplexity: 5, // Moderate complexity (inverse)
          rollbackSafety: 6, // Can drop table, but be careful
          testingClarity: 9,
          downtime: 7,
        },
        `Create missing table ${name} - requires testing of dependent code`
      );
    }

    if (type === 'missing_column') {
      return new ExecutionPlan(
        ddl,
        {
          sqlPrecision: 9,
          migrationComplexity: 7, // Easier than table (inverse)
          rollbackSafety: 8, // Can drop column, safer than table
          testingClarity: 9,
          downtime: 8,
        },
        `Add missing column ${name} - verify dependent queries`
      );
    }

    // type_mismatch
    return new ExecutionPlan(
      ddl,
      {
        sqlPrecision: 7,
        migrationComplexity: 4, // Complex - might need data migration (inverse)
        rollbackSafety: 5, // Type changes are risky
        testingClarity: 7,
        downtime: 6,
      },
      `Fix type mismatch for ${name} - requires data validation`
    );
  }

  /**
   * Create execution plan with custom SQL and factors
   */
  static custom(sql: string, factors: ExecutionFactors, reasoning: string): ExecutionPlan {
    return new ExecutionPlan(sql, factors, reasoning);
  }

  /**
   * Get human-readable description
   */
  getDescription(): string {
    return `Execution: ${this.score.toFixed(1)}/10 - ${this.reasoning}`;
  }

  /**
   * Get the SQL with proper formatting
   */
  getFormattedSQL(): string {
    return this.sql;
  }

  /**
   * Check if this execution is high risk (low score)
   */
  isHighRisk(): boolean {
    return this.score < 5.0;
  }

  /**
   * Check if this execution is safe (high score)
   */
  isSafe(): boolean {
    return this.score >= 7.0;
  }

  /**
   * Calculate score as weighted average of factors
   */
  private calculateScore(): number {
    const values = Object.values(this.factors).filter((v) => v !== undefined) as number[];

    if (values.length === 0) {
      throw new Error('ExecutionPlan must have at least one factor');
    }

    // Validate all factors are in range
    for (const value of values) {
      if (value < 0 || value > 10) {
        throw new Error(`ExecutionPlan factor must be 0-10, got ${value}`);
      }
    }

    // Simple average for now - could be weighted in future
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round((sum / values.length) * 10) / 10; // Round to 1 decimal
  }
}
