"use strict";
/**
 * SuggestOptimizationsUseCase.ts
 *
 * @semantic-intent Use case for suggesting database schema optimizations
 * Coordinates domain services to identify optimization opportunities
 *
 * @observable-anchoring
 * - Environment drives database selection (observable routing)
 * - Optimization suggestions based on observable schema patterns
 * - Cache key based on environment for performance
 *
 * @intent-preservation
 * - Environment semantic maintained throughout analysis
 * - Optimization suggestions preserve domain semantics
 * - Impact scores maintain semantic priority
 *
 * @semantic-over-structural
 * - Focuses on semantic performance patterns
 * - Suggests optimizations based on real-world impact
 * - Prioritizes semantic clarity over micro-optimizations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestOptimizationsUseCase = void 0;
/**
 * Use case: Suggest database optimizations
 *
 * Semantic Intent: Orchestrates domain services to identify optimization opportunities
 * Observable Anchoring: Cache based on environment, suggestions based on current schema state
 */
class SuggestOptimizationsUseCase {
    repository;
    optimizationService;
    relationshipAnalyzer;
    databaseConfig;
    cache;
    static CACHE_TTL_SECONDS = 600; // 10 minutes
    constructor(repository, optimizationService, relationshipAnalyzer, databaseConfig, cache) {
        this.repository = repository;
        this.optimizationService = optimizationService;
        this.relationshipAnalyzer = relationshipAnalyzer;
        this.databaseConfig = databaseConfig;
        this.cache = cache;
        Object.freeze(this);
    }
    /**
     * Execute optimization analysis
     *
     * Semantic: Environment drives database selection and optimization scope
     */
    async execute(request) {
        const environment = request.environment;
        // Observable: Cache key based on environment
        const cacheKey = `schema:${environment}`;
        // Check cache first (avoid repeated API calls)
        let schema = await this.cache.get(cacheKey);
        if (!schema) {
            // Fetch schema from repository
            const databaseId = this.databaseConfig.getDatabaseId(environment);
            schema = await this.repository.fetchDatabaseSchema(databaseId);
            // Cache for future requests (10-minute TTL)
            await this.cache.set(cacheKey, schema, SuggestOptimizationsUseCase.CACHE_TTL_SECONDS);
        }
        // Extract relationships from schema
        const relationships = this.relationshipAnalyzer.extractRelationships([...schema.tables]);
        // Get optimization suggestions from domain service
        const optimizations = this.optimizationService.analyzeSchema([...schema.tables], relationships);
        // Map domain Optimization entities to response DTOs
        const suggestions = optimizations.map((opt) => this.mapOptimizationToSuggestion(opt));
        return {
            databaseName: schema.name,
            environment: schema.environment,
            optimizationCount: suggestions.length,
            optimizations: suggestions,
            analyzedAt: new Date(),
        };
    }
    /**
     * Map domain Optimization entity to response DTO
     *
     * Semantic: Transform domain entity to presentation format
     */
    mapOptimizationToSuggestion(optimization) {
        return {
            type: optimization.type,
            table: optimization.table,
            column: optimization.column,
            reason: optimization.reason,
            suggestion: optimization.suggestion,
            priority: optimization.priority,
        };
    }
}
exports.SuggestOptimizationsUseCase = SuggestOptimizationsUseCase;
//# sourceMappingURL=SuggestOptimizationsUseCase.js.map