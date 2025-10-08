/**
 * index.ts - Composition Root
 *
 * @semantic-intent Main entry point that wires all dependencies together
 * Implements Dependency Injection for hexagonal architecture
 *
 * @observable-anchoring
 * - Environment configuration drives database selection
 * - Configuration loaded from environment variables
 * - Dependencies injected from outer layers to inner layers
 *
 * @intent-preservation
 * - Composition root maintains clear dependency flow
 * - Infrastructure → Application → Domain → Presentation
 * - No business logic in composition root
 */

import dotenv from 'dotenv';
import { D1DatabaseMCPServer } from './presentation/mcp/MCPServer.js';
import { AnalyzeSchemaUseCase } from './application/use-cases/AnalyzeSchemaUseCase.js';
import { GetRelationshipsUseCase } from './application/use-cases/GetRelationshipsUseCase.js';
import { ValidateSchemaUseCase } from './application/use-cases/ValidateSchemaUseCase.js';
import { SuggestOptimizationsUseCase } from './application/use-cases/SuggestOptimizationsUseCase.js';
import { SchemaAnalyzer } from './domain/services/SchemaAnalyzer.js';
import { RelationshipAnalyzer } from './domain/services/RelationshipAnalyzer.js';
import { OptimizationService } from './domain/services/OptimizationService.js';
import { CloudflareAPIClient } from './infrastructure/http/CloudflareAPIClient.js';
import { CloudflareD1Repository } from './infrastructure/adapters/CloudflareD1Repository.js';
import { InMemoryCacheProvider } from './infrastructure/adapters/InMemoryCacheProvider.js';
import { CloudflareConfig } from './infrastructure/config/CloudflareConfig.js';
import { DatabaseConfig } from './infrastructure/config/DatabaseConfig.js';
import { Environment } from './domain/value-objects/Environment.js';

/**
 * Load environment configuration
 */
dotenv.config();

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
	const required = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'];
	const missing = required.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		console.error('❌ Missing required environment variables:');
		missing.forEach((key) => console.error(`   - ${key}`));
		console.error('\nPlease create a .env file with these variables.');
		console.error('See .env.example for reference.');
		process.exit(1);
	}

	// Validate at least one database is configured
	const hasDevDb = process.env.D1_DEV_DATABASE_ID && process.env.D1_DEV_DATABASE_NAME;
	const hasStagingDb = process.env.D1_STAGING_DATABASE_ID && process.env.D1_STAGING_DATABASE_NAME;
	const hasProdDb = process.env.D1_PROD_DATABASE_ID && process.env.D1_PROD_DATABASE_NAME;

	if (!hasDevDb && !hasStagingDb && !hasProdDb) {
		console.error('❌ No database configured!');
		console.error('   Please configure at least one database environment:');
		console.error('   - D1_DEV_DATABASE_ID + D1_DEV_DATABASE_NAME');
		console.error('   - D1_STAGING_DATABASE_ID + D1_STAGING_DATABASE_NAME');
		console.error('   - D1_PROD_DATABASE_ID + D1_PROD_DATABASE_NAME');
		process.exit(1);
	}
}

/**
 * Create database configuration from environment
 */
function createDatabaseConfig(): DatabaseConfig {
	const databases = new Map();

	// Development database
	if (process.env.D1_DEV_DATABASE_ID && process.env.D1_DEV_DATABASE_NAME) {
		databases.set(Environment.DEVELOPMENT, {
			id: process.env.D1_DEV_DATABASE_ID,
			name: process.env.D1_DEV_DATABASE_NAME,
		});
	}

	// Staging database
	if (process.env.D1_STAGING_DATABASE_ID && process.env.D1_STAGING_DATABASE_NAME) {
		databases.set(Environment.STAGING, {
			id: process.env.D1_STAGING_DATABASE_ID,
			name: process.env.D1_STAGING_DATABASE_NAME,
		});
	}

	// Production database
	if (process.env.D1_PROD_DATABASE_ID && process.env.D1_PROD_DATABASE_NAME) {
		databases.set(Environment.PRODUCTION, {
			id: process.env.D1_PROD_DATABASE_ID,
			name: process.env.D1_PROD_DATABASE_NAME,
		});
	}

	return new DatabaseConfig(databases);
}

/**
 * Composition Root: Wire all dependencies
 */
async function main() {
	try {
		// Validate environment
		validateEnvironment();

		console.error('🚀 Starting Semantic D1 MCP Server...');

		// Infrastructure Layer - External adapters
		const cloudflareConfig = new CloudflareConfig(
			process.env.CLOUDFLARE_ACCOUNT_ID!,
			process.env.CLOUDFLARE_API_TOKEN!,
		);

		const apiClient = new CloudflareAPIClient(cloudflareConfig);
		const repository = new CloudflareD1Repository(apiClient);
		const cache = new InMemoryCacheProvider();
		const databaseConfig = createDatabaseConfig();

		// Log configured environments
		const configuredEnvs = Array.from(databaseConfig['databases'].keys());
		console.error(`📊 Configured environments: ${configuredEnvs.join(', ')}`);

		// Domain Layer - Business logic services
		const schemaAnalyzer = new SchemaAnalyzer();
		const relationshipAnalyzer = new RelationshipAnalyzer();
		const optimizationService = new OptimizationService();

		// Application Layer - Use cases (orchestration)
		const analyzeSchemaUseCase = new AnalyzeSchemaUseCase(
			repository,
			schemaAnalyzer,
			databaseConfig,
			cache,
		);

		const getRelationshipsUseCase = new GetRelationshipsUseCase(
			repository,
			relationshipAnalyzer,
			databaseConfig,
			cache,
		);

		const validateSchemaUseCase = new ValidateSchemaUseCase(
			repository,
			schemaAnalyzer,
			databaseConfig,
			cache,
		);

		const suggestOptimizationsUseCase = new SuggestOptimizationsUseCase(
			repository,
			optimizationService,
			relationshipAnalyzer,
			databaseConfig,
			cache,
		);

		// Presentation Layer - MCP Server
		const mcpServer = new D1DatabaseMCPServer(
			analyzeSchemaUseCase,
			getRelationshipsUseCase,
			validateSchemaUseCase,
			suggestOptimizationsUseCase,
		);

		// Start the server
		await mcpServer.start();
		console.error('✅ Semantic D1 MCP Server running on stdio');
	} catch (error) {
		console.error('❌ Failed to start server:', error);
		process.exit(1);
	}
}

// Start the server
main();
