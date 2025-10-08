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

import { ICloudflareD1Repository } from '../../domain/repositories/ICloudflareD1Repository';
import { ICacheProvider } from '../ports/ICacheProvider';
import { OptimizationService } from '../../domain/services/OptimizationService';
import { RelationshipAnalyzer } from '../../domain/services/RelationshipAnalyzer';
import { DatabaseSchema } from '../../domain/entities/DatabaseSchema';
import { Environment } from '../../domain/value-objects/Environment';
import { DatabaseConfig } from '../../infrastructure/config/DatabaseConfig';
import { Optimization } from '../../domain/entities/Optimization';

/**
 * Request DTO for optimization suggestions
 *
 * Observable properties:
 * - environment: Which database environment to analyze
 */
export interface SuggestOptimizationsRequest {
	environment: Environment;
}

/**
 * Response DTO for optimization suggestions
 *
 * Semantic: Complete list of optimization opportunities with impact scores
 */
export interface OptimizationSuggestionsResponse {
	databaseName: string;
	environment: Environment;
	optimizationCount: number;
	optimizations: OptimizationSuggestion[];
	analyzedAt: Date;
}

/**
 * Individual optimization suggestion
 */
export interface OptimizationSuggestion {
	type: string;
	table: string;
	column: string | null;
	reason: string;
	suggestion: string;
	priority: 'high' | 'medium' | 'low';
}

/**
 * Use case: Suggest database optimizations
 *
 * Semantic Intent: Orchestrates domain services to identify optimization opportunities
 * Observable Anchoring: Cache based on environment, suggestions based on current schema state
 */
export class SuggestOptimizationsUseCase {
	private static readonly CACHE_TTL_SECONDS = 600; // 10 minutes

	constructor(
		private readonly repository: ICloudflareD1Repository,
		private readonly optimizationService: OptimizationService,
		private readonly relationshipAnalyzer: RelationshipAnalyzer,
		private readonly databaseConfig: DatabaseConfig,
		private readonly cache: ICacheProvider,
	) {
		Object.freeze(this);
	}

	/**
	 * Execute optimization analysis
	 *
	 * Semantic: Environment drives database selection and optimization scope
	 */
	async execute(request: SuggestOptimizationsRequest): Promise<OptimizationSuggestionsResponse> {
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
	private mapOptimizationToSuggestion(optimization: Optimization): OptimizationSuggestion {
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
