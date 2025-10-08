/**
 * GetRelationshipsUseCase.ts
 *
 * @semantic-intent Use case for extracting table relationships
 * Coordinates domain services to analyze foreign key relationships
 *
 * @observable-anchoring
 * - Relationships based on observable foreign key definitions
 * - Environment drives database selection
 * - Optional table filtering based on observable table name
 *
 * @intent-preservation
 * - Relationship semantics preserved from domain layer
 * - Referential integrity intent maintained
 * - Environment semantic maintained throughout
 *
 * @semantic-over-structural
 * - Focuses on relationship semantics, not join performance
 * - Cascade rules represent semantic constraints
 */

import { ICloudflareD1Repository } from '../../domain/repositories/ICloudflareD1Repository';
import { ICacheProvider } from '../ports/ICacheProvider';
import { RelationshipAnalyzer } from '../../domain/services/RelationshipAnalyzer';
import { DatabaseConfig } from '../../infrastructure/config/DatabaseConfig';
import { Environment } from '../../domain/value-objects/Environment';
import { DatabaseSchema } from '../../domain/entities/DatabaseSchema';
import { Relationship } from '../../domain/entities/Relationship';

/**
 * Request DTO for relationship analysis
 *
 * Observable properties:
 * - environment: Which database environment to analyze
 * - tableName: Optional filter for specific table's relationships
 */
export interface GetRelationshipsRequest {
	environment: Environment;
	tableName?: string;
}

/**
 * Response DTO for relationship analysis
 */
export interface RelationshipsResponse {
	databaseName: string;
	environment: Environment;
	relationships: RelationshipDTO[];
	relationshipCount: number;
}

/**
 * Relationship DTO
 */
export interface RelationshipDTO {
	fromTable: string;
	fromColumn: string;
	toTable: string;
	toColumn: string;
	onDelete: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION' | null;
	onUpdate: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION' | null;
	isRequired: boolean;
}

/**
 * Use case: Get table relationships
 *
 * Semantic Intent: Extract and analyze foreign key relationships between tables
 * Observable Anchoring: Relationships based on observable foreign key metadata
 */
export class GetRelationshipsUseCase {
	private static readonly CACHE_TTL_SECONDS = 600; // 10 minutes

	constructor(
		private readonly repository: ICloudflareD1Repository,
		private readonly relationshipAnalyzer: RelationshipAnalyzer,
		private readonly databaseConfig: DatabaseConfig,
		private readonly cache: ICacheProvider,
	) {
		Object.freeze(this);
	}

	/**
	 * Execute relationship extraction
	 *
	 * Semantic: Environment drives database selection, optional table filter
	 */
	async execute(request: GetRelationshipsRequest): Promise<RelationshipsResponse> {
		const environment = request.environment;

		// Get or fetch schema (with caching)
		const schema = await this.getSchema(environment);

		// Extract relationships using domain service
		const allRelationships = this.relationshipAnalyzer.extractRelationships([...schema.tables]);

		// Filter by table if specified
		const relationships = request.tableName
			? this.filterRelationshipsByTable(allRelationships, request.tableName)
			: allRelationships;

		// Format and return response
		return {
			databaseName: schema.name,
			environment: schema.environment,
			relationships: relationships.map((rel) => this.formatRelationship(rel)),
			relationshipCount: relationships.length,
		};
	}

	/**
	 * Get schema from cache or repository
	 *
	 * Semantic: Reuses cached schema to avoid repeated API calls
	 */
	private async getSchema(environment: Environment): Promise<DatabaseSchema> {
		const cacheKey = `schema:${environment}`;

		// Check cache first
		const cachedSchema = await this.cache.get<DatabaseSchema>(cacheKey);
		if (cachedSchema) {
			return cachedSchema;
		}

		// Fetch from repository
		const databaseId = this.databaseConfig.getDatabaseId(environment);
		const schema = await this.repository.fetchDatabaseSchema(databaseId);

		// Cache for future requests
		await this.cache.set(cacheKey, schema, GetRelationshipsUseCase.CACHE_TTL_SECONDS);

		return schema;
	}

	/**
	 * Filter relationships by table name
	 *
	 * Observable: Filters based on observable table names in relationship
	 */
	private filterRelationshipsByTable(
		relationships: Relationship[],
		tableName: string,
	): Relationship[] {
		return relationships.filter(
			(rel) => rel.fromTable === tableName || rel.toTable === tableName,
		);
	}

	/**
	 * Format relationship entity into DTO
	 *
	 * Semantic: Transforms domain entity into presentation format
	 */
	private formatRelationship(relationship: Relationship): RelationshipDTO {
		return {
			fromTable: relationship.fromTable,
			fromColumn: relationship.fromColumn,
			toTable: relationship.toTable,
			toColumn: relationship.toColumn,
			onDelete: relationship.onDelete,
			onUpdate: relationship.onUpdate,
			isRequired: relationship.isRequired(),
		};
	}
}
