/**
 * AnalyzeSchemaUseCase.ts
 *
 * @semantic-intent Use case for comprehensive database schema analysis
 * Coordinates domain services to fulfill schema analysis requests
 *
 * @observable-anchoring
 * - Environment drives database selection (observable routing)
 * - Cache key based on observable environment value
 * - Sample data inclusion based on observable request flag
 *
 * @intent-preservation
 * - Environment semantic maintained throughout execution
 * - Cache preserves fetched schema integrity
 * - Analysis preserves domain business rules
 *
 * @semantic-over-structural
 * - Focuses on schema semantics, not query performance
 * - Cache TTL based on semantic freshness requirements (10 minutes)
 * - Sample data represents table content semantics
 */

import { ICloudflareD1Repository } from '../../domain/repositories/ICloudflareD1Repository';
import { ICacheProvider } from '../ports/ICacheProvider';
import { SchemaAnalyzer } from '../../domain/services/SchemaAnalyzer';
import { DatabaseSchema } from '../../domain/entities/DatabaseSchema';
import { Environment } from '../../domain/value-objects/Environment';
import { DatabaseConfig } from '../../infrastructure/config/DatabaseConfig';

/**
 * Request DTO for schema analysis
 *
 * Observable properties:
 * - environment: Which database environment to analyze
 * - includeSamples: Whether to fetch sample data from tables
 * - maxSampleRows: Maximum rows per table sample (default: 5)
 */
export interface AnalyzeSchemaRequest {
	environment: Environment;
	includeSamples?: boolean;
	maxSampleRows?: number;
}

/**
 * Response DTO for schema analysis
 *
 * Semantic: Complete schema analysis with metadata and optional samples
 */
export interface SchemaAnalysisResponse {
	databaseName: string;
	environment: Environment;
	tableCount: number;
	tables: TableAnalysis[];
	fetchedAt: Date;
}

/**
 * Table analysis details
 */
export interface TableAnalysis {
	name: string;
	type: 'table' | 'view';
	columnCount: number;
	columns: ColumnAnalysis[];
	indexes: IndexAnalysis[];
	foreignKeys: ForeignKeyAnalysis[];
	samples?: unknown[];
}

/**
 * Column analysis details
 */
export interface ColumnAnalysis {
	name: string;
	type: string;
	nullable: boolean;
	isPrimaryKey: boolean;
	defaultValue: string | null;
}

/**
 * Index analysis details
 */
export interface IndexAnalysis {
	name: string;
	columns: string[];
	isUnique: boolean;
	isPrimaryKey: boolean;
}

/**
 * Foreign key analysis details
 */
export interface ForeignKeyAnalysis {
	column: string;
	referencedTable: string;
	referencedColumn: string;
	onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | null;
	onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | null;
}

/**
 * Use case: Analyze database schema
 *
 * Semantic Intent: Orchestrates domain services to provide comprehensive schema analysis
 * Observable Anchoring: Cache based on environment, TTL based on freshness semantics
 */
export class AnalyzeSchemaUseCase {
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
	 * Execute schema analysis
	 *
	 * Semantic: Environment drives database selection and cache strategy
	 */
	async execute(request: AnalyzeSchemaRequest): Promise<SchemaAnalysisResponse> {
		const environment = request.environment;
		const includeSamples = request.includeSamples ?? true;
		const maxSampleRows = request.maxSampleRows ?? 5;

		// Observable: Cache key based on environment
		const cacheKey = `schema:${environment}`;

		// Check cache first (avoid repeated API calls)
		const cachedSchema = await this.cache.get<DatabaseSchema>(cacheKey);
		if (cachedSchema) {
			return this.formatResponse(cachedSchema, includeSamples, maxSampleRows);
		}

		// Fetch schema from repository
		const databaseId = this.databaseConfig.getDatabaseId(environment);
		const schema = await this.repository.fetchDatabaseSchema(databaseId);

		// Cache for future requests (10-minute TTL)
		await this.cache.set(cacheKey, schema, AnalyzeSchemaUseCase.CACHE_TTL_SECONDS);

		// Format and return response
		return this.formatResponse(schema, includeSamples, maxSampleRows);
	}

	/**
	 * Format database schema into analysis response
	 *
	 * Semantic: Transforms domain entities into presentation DTOs
	 */
	private async formatResponse(
		schema: DatabaseSchema,
		includeSamples: boolean,
		maxSampleRows: number,
	): Promise<SchemaAnalysisResponse> {
		const tables: TableAnalysis[] = [];

		for (const table of schema.tables) {
			const tableAnalysis: TableAnalysis = {
				name: table.name,
				type: table.type,
				columnCount: table.columns.length,
				columns: table.columns.map((col) => ({
					name: col.name,
					type: col.type,
					nullable: col.isNullable,
					isPrimaryKey: col.isPrimaryKey,
					defaultValue: col.defaultValue,
				})),
				indexes: table.indexes.map((idx) => ({
					name: idx.name,
					columns: [...idx.columns],
					isUnique: idx.isUnique,
					isPrimaryKey: idx.isPrimaryKey,
				})),
				foreignKeys: table.foreignKeys.map((fk) => ({
					column: fk.column,
					referencedTable: fk.referencesTable,
					referencedColumn: fk.referencesColumn,
					onDelete: fk.onDelete,
					onUpdate: fk.onUpdate,
				})),
			};

			// Fetch sample data if requested
			if (includeSamples) {
				const databaseId = this.databaseConfig.getDatabaseId(schema.environment);
				const samples = await this.fetchSampleData(databaseId, table.name, maxSampleRows);
				tableAnalysis.samples = samples;
			}

			tables.push(tableAnalysis);
		}

		return {
			databaseName: schema.name,
			environment: schema.environment,
			tableCount: schema.tables.length,
			tables,
			fetchedAt: schema.fetchedAt,
		};
	}

	/**
	 * Fetch sample data from table
	 *
	 * Observable: Queries actual table rows for semantic representation
	 */
	private async fetchSampleData(
		databaseId: string,
		tableName: string,
		maxRows: number,
	): Promise<unknown[]> {
		try {
			const sql = `SELECT * FROM "${tableName}" LIMIT ${maxRows}`;
			const result = await this.repository.executeSQLQuery(databaseId, sql);
			return result.results || [];
		} catch (error) {
			// If sample fetch fails, return empty array (don't fail entire analysis)
			return [];
		}
	}
}
