import type { ICloudflareD1Repository } from '../../domain/repositories/ICloudflareD1Repository';
import { SchemaComparator } from '../../domain/services/SchemaComparator';
import type { SchemaComparisonResult } from '../../domain/entities/SchemaComparisonResult';
import type { Environment } from '../../domain/value-objects/ContextAnalysis';

/**
 * 🎯 SEMANTIC INTENT: CompareSchemasUseCase orchestrates schema comparison between environments
 *
 * WHY: Application layer coordinates domain services to deliver business value
 * - Fetch schemas from two different databases/environments
 * - Use SchemaComparator to detect differences
 * - Return ICE-scored comparison results
 * - Enable migration planning and drift detection
 *
 * APPLICATION LAYER: Orchestrates domain services and infrastructure
 * USE CASE PATTERN: Single responsibility for schema comparison
 * DEPENDENCY INJECTION: Repository injected for testability
 */

export interface CompareSchemasInput {
  sourceDatabaseId: string;
  sourceEnvironment: Environment;
  targetDatabaseId: string;
  targetEnvironment: Environment;
}

export interface CompareSchemasOutput {
  result: SchemaComparisonResult;
  sourceTableCount: number;
  targetTableCount: number;
  executionTimeMs: number;
}

export class CompareSchemasUseCase {
  constructor(private readonly d1Repository: ICloudflareD1Repository) {}

  async execute(input: CompareSchemasInput): Promise<CompareSchemasOutput> {
    const startTime = Date.now();

    // Validate environments are different (or at least different databases)
    if (input.sourceDatabaseId === input.targetDatabaseId) {
      throw new Error('Cannot compare a database with itself. Source and target must be different.');
    }

    // Fetch source schema
    const sourceSchema = await this.d1Repository.fetchDatabaseSchema(input.sourceDatabaseId);

    // Fetch target schema
    const targetSchema = await this.d1Repository.fetchDatabaseSchema(input.targetDatabaseId);

    // Compare schemas using domain service
    const comparator = new SchemaComparator();
    const result = comparator.compare(
      sourceSchema,
      targetSchema,
      input.sourceEnvironment,
      input.targetEnvironment
    );

    const executionTimeMs = Date.now() - startTime;

    return {
      result,
      sourceTableCount: sourceSchema.tables.length,
      targetTableCount: targetSchema.tables.length,
      executionTimeMs,
    };
  }
}
