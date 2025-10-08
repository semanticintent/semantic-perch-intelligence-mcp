"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetRelationshipsUseCase = void 0;
/**
 * Use case: Get table relationships
 *
 * Semantic Intent: Extract and analyze foreign key relationships between tables
 * Observable Anchoring: Relationships based on observable foreign key metadata
 */
class GetRelationshipsUseCase {
    repository;
    relationshipAnalyzer;
    databaseConfig;
    cache;
    static CACHE_TTL_SECONDS = 600; // 10 minutes
    constructor(repository, relationshipAnalyzer, databaseConfig, cache) {
        this.repository = repository;
        this.relationshipAnalyzer = relationshipAnalyzer;
        this.databaseConfig = databaseConfig;
        this.cache = cache;
        Object.freeze(this);
    }
    /**
     * Execute relationship extraction
     *
     * Semantic: Environment drives database selection, optional table filter
     */
    async execute(request) {
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
    async getSchema(environment) {
        const cacheKey = `schema:${environment}`;
        // Check cache first
        const cachedSchema = await this.cache.get(cacheKey);
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
    filterRelationshipsByTable(relationships, tableName) {
        return relationships.filter((rel) => rel.fromTable === tableName || rel.toTable === tableName);
    }
    /**
     * Format relationship entity into DTO
     *
     * Semantic: Transforms domain entity into presentation format
     */
    formatRelationship(relationship) {
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
exports.GetRelationshipsUseCase = GetRelationshipsUseCase;
//# sourceMappingURL=GetRelationshipsUseCase.js.map