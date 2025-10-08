/**
 * ValidateSchemaUseCase.ts
 *
 * @semantic-intent Use case for validating database schema integrity
 * Coordinates domain services to identify potential schema issues
 *
 * @observable-anchoring
 * - Environment drives database selection (observable routing)
 * - Validation results based on observable schema state
 * - Cache key based on environment for performance
 *
 * @intent-preservation
 * - Environment semantic maintained throughout validation
 * - Schema integrity rules preserved from domain layer
 * - Validation errors maintain semantic context
 *
 * @semantic-over-structural
 * - Focuses on semantic integrity, not just syntax
 * - Validates relationships make semantic sense
 * - Checks for semantic anti-patterns
 */

import { ICloudflareD1Repository } from '../../domain/repositories/ICloudflareD1Repository';
import { ICacheProvider } from '../ports/ICacheProvider';
import { SchemaAnalyzer } from '../../domain/services/SchemaAnalyzer';
import { DatabaseSchema } from '../../domain/entities/DatabaseSchema';
import { Environment } from '../../domain/value-objects/Environment';
import { DatabaseConfig } from '../../infrastructure/config/DatabaseConfig';

/**
 * Request DTO for schema validation
 *
 * Observable properties:
 * - environment: Which database environment to validate
 */
export interface ValidateSchemaRequest {
	environment: Environment;
}

/**
 * Validation issue severity
 */
export enum ValidationSeverity {
	ERROR = 'ERROR',
	WARNING = 'WARNING',
	INFO = 'INFO',
}

/**
 * Individual validation issue
 */
export interface ValidationIssue {
	severity: ValidationSeverity;
	category: string;
	message: string;
	table?: string;
	column?: string;
	details?: Record<string, unknown>;
}

/**
 * Response DTO for schema validation
 *
 * Semantic: Complete validation results with categorized issues
 */
export interface SchemaValidationResponse {
	databaseName: string;
	environment: Environment;
	isValid: boolean;
	errorCount: number;
	warningCount: number;
	infoCount: number;
	issues: ValidationIssue[];
	validatedAt: Date;
}

/**
 * Use case: Validate database schema
 *
 * Semantic Intent: Orchestrates domain services to identify schema integrity issues
 * Observable Anchoring: Cache based on environment, validation based on current schema state
 */
export class ValidateSchemaUseCase {
	private static readonly CACHE_TTL_SECONDS = 600; // 10 minutes

	constructor(
		private readonly repository: ICloudflareD1Repository,
		private readonly schemaAnalyzer: SchemaAnalyzer,
		private readonly databaseConfig: DatabaseConfig,
		private readonly cache: ICacheProvider,
	) {
		Object.freeze(this);
	}

	/**
	 * Execute schema validation
	 *
	 * Semantic: Environment drives database selection and validation scope
	 */
	async execute(request: ValidateSchemaRequest): Promise<SchemaValidationResponse> {
		const environment = request.environment;

		// Observable: Cache key based on environment
		const cacheKey = `schema:${environment}`;

		// Check cache first (avoid repeated API calls)
		let schema = await this.cache.get<DatabaseSchema>(cacheKey);

		if (!schema) {
			// Fetch schema from repository
			const databaseId = this.databaseConfig.getDatabaseId(environment);
			schema = await this.repository.fetchDatabaseSchema(databaseId);

			// Cache for future requests (10-minute TTL)
			await this.cache.set(cacheKey, schema, ValidateSchemaUseCase.CACHE_TTL_SECONDS);
		}

		// Validate schema and collect issues
		const issues = this.validateSchema(schema);

		// Count issues by severity
		const errorCount = issues.filter((i) => i.severity === ValidationSeverity.ERROR).length;
		const warningCount = issues.filter((i) => i.severity === ValidationSeverity.WARNING).length;
		const infoCount = issues.filter((i) => i.severity === ValidationSeverity.INFO).length;

		return {
			databaseName: schema.name,
			environment: schema.environment,
			isValid: errorCount === 0,
			errorCount,
			warningCount,
			infoCount,
			issues,
			validatedAt: new Date(),
		};
	}

	/**
	 * Validate database schema
	 *
	 * Semantic: Apply domain validation rules to identify issues
	 */
	private validateSchema(schema: DatabaseSchema): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		// Validate each table
		for (const table of schema.tables) {
			// Check for tables without primary key
			const hasPrimaryKey = table.columns.some((col) => col.isPrimaryKey);
			if (!hasPrimaryKey) {
				issues.push({
					severity: ValidationSeverity.WARNING,
					category: 'Missing Primary Key',
					message: `Table '${table.name}' has no primary key`,
					table: table.name,
					details: {
						recommendation: 'Add a primary key column for better query performance and data integrity',
					},
				});
			}

			// Check for orphaned foreign keys (references non-existent tables)
			for (const fk of table.foreignKeys) {
				const referencedTableExists = schema.tables.some((t) => t.name === fk.referencesTable);
				if (!referencedTableExists) {
					issues.push({
						severity: ValidationSeverity.ERROR,
						category: 'Orphaned Foreign Key',
						message: `Foreign key references non-existent table '${fk.referencesTable}'`,
						table: table.name,
						column: fk.column,
						details: {
							referencedTable: fk.referencesTable,
							referencedColumn: fk.referencesColumn,
						},
					});
				} else {
					// Check if referenced column exists
					const referencedTable = schema.tables.find((t) => t.name === fk.referencesTable);
					const referencedColumnExists = referencedTable?.columns.some(
						(col) => col.name === fk.referencesColumn,
					);
					if (!referencedColumnExists) {
						issues.push({
							severity: ValidationSeverity.ERROR,
							category: 'Invalid Foreign Key',
							message: `Foreign key references non-existent column '${fk.referencesColumn}' in table '${fk.referencesTable}'`,
							table: table.name,
							column: fk.column,
							details: {
								referencedTable: fk.referencesTable,
								referencedColumn: fk.referencesColumn,
							},
						});
					}
				}
			}

			// Check for tables with no indexes (potential performance issue)
			if (table.indexes.length === 0 && table.type === 'table') {
				issues.push({
					severity: ValidationSeverity.INFO,
					category: 'No Indexes',
					message: `Table '${table.name}' has no indexes`,
					table: table.name,
					details: {
						recommendation: 'Consider adding indexes on frequently queried columns',
					},
				});
			}

			// Check for nullable foreign key columns (potential data integrity issue)
			for (const fk of table.foreignKeys) {
				const fkColumn = table.columns.find((col) => col.name === fk.column);
				if (fkColumn?.isNullable && fk.onDelete !== 'SET NULL') {
					issues.push({
						severity: ValidationSeverity.WARNING,
						category: 'Nullable Foreign Key',
						message: `Nullable foreign key column '${fk.column}' should have ON DELETE SET NULL`,
						table: table.name,
						column: fk.column,
						details: {
							currentOnDelete: fk.onDelete,
							recommendation: 'SET NULL',
						},
					});
				}
			}
		}

		return issues;
	}
}
