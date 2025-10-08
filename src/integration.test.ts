/**
 * Integration Tests
 *
 * @semantic-intent End-to-end tests verifying all layers work together
 * Tests the complete dependency graph from presentation to infrastructure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { D1DatabaseMCPServer } from './presentation/mcp/MCPServer';
import { AnalyzeSchemaUseCase } from './application/use-cases/AnalyzeSchemaUseCase';
import { GetRelationshipsUseCase } from './application/use-cases/GetRelationshipsUseCase';
import { ValidateSchemaUseCase } from './application/use-cases/ValidateSchemaUseCase';
import { SuggestOptimizationsUseCase } from './application/use-cases/SuggestOptimizationsUseCase';
import { SchemaAnalyzer } from './domain/services/SchemaAnalyzer';
import { RelationshipAnalyzer } from './domain/services/RelationshipAnalyzer';
import { OptimizationService } from './domain/services/OptimizationService';
import { ICloudflareD1Repository } from './domain/repositories/ICloudflareD1Repository';
import { ICacheProvider } from './application/ports/ICacheProvider';
import { DatabaseConfig } from './infrastructure/config/DatabaseConfig';
import { Environment } from './domain/value-objects/Environment';
import { DatabaseSchema } from './domain/entities/DatabaseSchema';

describe('Integration Tests', () => {
	let mcpServer: D1DatabaseMCPServer;
	let mockRepository: ICloudflareD1Repository;
	let mockCache: ICacheProvider;
	let databaseConfig: DatabaseConfig;

	beforeEach(() => {
		// Mock infrastructure adapters (to avoid real HTTP calls)
		mockRepository = {
			fetchDatabaseSchema: vi.fn().mockResolvedValue({
				name: 'test_db',
				environment: Environment.DEVELOPMENT,
				tables: [],
				fetchedAt: new Date(),
			}),
			fetchTableDetails: vi.fn(),
			fetchIndexInformation: vi.fn(),
			executeSQLQuery: vi.fn(),
		} as unknown as ICloudflareD1Repository;

		mockCache = {
			get: vi.fn().mockResolvedValue(undefined),
			set: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn(),
			clear: vi.fn(),
			has: vi.fn(),
		} as unknown as ICacheProvider;

		const databases = new Map();
		databases.set(Environment.DEVELOPMENT, { id: 'dev-db-123', name: 'test_dev' });
		databases.set(Environment.STAGING, { id: 'staging-db-456', name: 'test_staging' });
		databases.set(Environment.PRODUCTION, { id: 'prod-db-789', name: 'test_prod' });
		databaseConfig = new DatabaseConfig(databases);

		// Domain layer
		const schemaAnalyzer = new SchemaAnalyzer();
		const relationshipAnalyzer = new RelationshipAnalyzer();
		const optimizationService = new OptimizationService();

		// Application layer
		const analyzeSchemaUseCase = new AnalyzeSchemaUseCase(
			mockRepository,
			schemaAnalyzer,
			databaseConfig,
			mockCache,
		);

		const getRelationshipsUseCase = new GetRelationshipsUseCase(
			mockRepository,
			relationshipAnalyzer,
			databaseConfig,
			mockCache,
		);

		const validateSchemaUseCase = new ValidateSchemaUseCase(
			mockRepository,
			schemaAnalyzer,
			databaseConfig,
			mockCache,
		);

		const suggestOptimizationsUseCase = new SuggestOptimizationsUseCase(
			mockRepository,
			optimizationService,
			relationshipAnalyzer,
			databaseConfig,
			mockCache,
		);

		// Presentation layer
		mcpServer = new D1DatabaseMCPServer(
			analyzeSchemaUseCase,
			getRelationshipsUseCase,
			validateSchemaUseCase,
			suggestOptimizationsUseCase,
		);

		vi.clearAllMocks();
	});

	describe('Full Stack Integration', () => {
		it('should wire all dependencies correctly', () => {
			expect(mcpServer).toBeDefined();
			expect(Object.isFrozen(mcpServer)).toBe(true);
		});

		it('should successfully execute analyze schema through all layers', async () => {
			// Mock repository response
			vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue({
				name: 'test_dev',
				environment: Environment.DEVELOPMENT,
				tables: [],
				fetchedAt: new Date(),
			} as any);

			const result = await (mcpServer as any).handleAnalyzeSchema({
				environment: 'development',
				includeSamples: false,
			});

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.databaseName).toBe('test_dev');
			expect(parsed.environment).toBe('development');
		});

		it('should successfully execute get relationships through all layers', async () => {
			vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue({
				name: 'test_dev',
				environment: Environment.DEVELOPMENT,
				tables: [],
				fetchedAt: new Date(),
			} as any);

			const result = await (mcpServer as any).handleGetRelationships({
				environment: 'development',
			});

			expect(result.content).toHaveLength(1);
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.databaseName).toBe('test_dev');
			expect(parsed.relationships).toBeDefined();
		});

		it('should successfully execute validate schema through all layers', async () => {
			vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue({
				name: 'test_dev',
				environment: Environment.DEVELOPMENT,
				tables: [],
				fetchedAt: new Date(),
			} as any);

			const result = await (mcpServer as any).handleValidateSchema({
				environment: 'development',
			});

			expect(result.content).toHaveLength(1);
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.isValid).toBeDefined();
			expect(parsed.issues).toBeDefined();
		});

		it('should successfully execute suggest optimizations through all layers', async () => {
			vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue({
				name: 'test_dev',
				environment: Environment.DEVELOPMENT,
				tables: [],
				fetchedAt: new Date(),
			} as any);

			const result = await (mcpServer as any).handleSuggestOptimizations({
				environment: 'development',
			});

			expect(result.content).toHaveLength(1);
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.optimizations).toBeDefined();
			expect(parsed.optimizationCount).toBeDefined();
		});
	});

	describe('Cache Integration', () => {
		it('should cache schema across multiple use case calls', async () => {
			const mockSchema = {
				name: 'test_dev',
				environment: Environment.DEVELOPMENT,
				tables: [],
				fetchedAt: new Date(),
			};

			// Set up cache mock to return undefined first time, then cached value
			let cacheValue: any = undefined;
			(mockCache.get as any).mockImplementation(async () => cacheValue);
			(mockCache.set as any).mockImplementation(async (key: string, value: any) => {
				cacheValue = value;
			});

			const fetchSpy = vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue(mockSchema as any);

			// First call - should fetch
			await (mcpServer as any).handleAnalyzeSchema({
				environment: 'development',
				includeSamples: false,
			});

			expect(fetchSpy).toHaveBeenCalledTimes(1);

			// Second call - should use cache
			await (mcpServer as any).handleAnalyzeSchema({
				environment: 'development',
				includeSamples: false,
			});

			// Should still be 1 (cached)
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		});

		it('should share cache between different use cases', async () => {
			const mockSchema = {
				name: 'test_dev',
				environment: Environment.DEVELOPMENT,
				tables: [],
				fetchedAt: new Date(),
			};

			// Set up cache mock to simulate real caching
			let cacheValue: any = undefined;
			(mockCache.get as any).mockImplementation(async () => cacheValue);
			(mockCache.set as any).mockImplementation(async (key: string, value: any) => {
				cacheValue = value;
			});

			const fetchSpy = vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue(mockSchema as any);

			// Call analyze schema
			await (mcpServer as any).handleAnalyzeSchema({
				environment: 'development',
				includeSamples: false,
			});

			expect(fetchSpy).toHaveBeenCalledTimes(1);

			// Call validate schema - should use same cache
			await (mcpServer as any).handleValidateSchema({
				environment: 'development',
			});

			// Should still be 1 (cached)
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('Environment Configuration', () => {
		it('should route to correct database based on environment', async () => {
			const mockSchema = {
				name: 'test_prod',
				environment: Environment.PRODUCTION,
				tables: [],
				fetchedAt: new Date(),
			};

			const fetchSpy = vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue(mockSchema as any);

			await (mcpServer as any).handleAnalyzeSchema({
				environment: 'production',
				includeSamples: false,
			});

			expect(fetchSpy).toHaveBeenCalledWith('prod-db-789');
		});

		it('should handle all three environments correctly', async () => {
			const fetchSpy = vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockImplementation(async (dbId) => {
				const envMap: any = {
					'dev-db-123': Environment.DEVELOPMENT,
					'staging-db-456': Environment.STAGING,
					'prod-db-789': Environment.PRODUCTION,
				};
				return {
					name: 'test',
					environment: envMap[dbId],
					tables: [],
					fetchedAt: new Date(),
				};
			});

			await (mcpServer as any).handleAnalyzeSchema({ environment: 'development', includeSamples: false });
			expect(fetchSpy).toHaveBeenCalledWith('dev-db-123');

			await (mcpServer as any).handleAnalyzeSchema({ environment: 'staging', includeSamples: false });
			expect(fetchSpy).toHaveBeenCalledWith('staging-db-456');

			await (mcpServer as any).handleAnalyzeSchema({ environment: 'production', includeSamples: false });
			expect(fetchSpy).toHaveBeenCalledWith('prod-db-789');
		});
	});

	describe('Error Propagation', () => {
		it('should propagate repository errors through all layers', async () => {
			vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockRejectedValue(
				new Error('Database connection failed'),
			);

			await expect(
				(mcpServer as any).handleAnalyzeSchema({
					environment: 'development',
					includeSamples: false,
				}),
			).rejects.toThrow('Database connection failed');
		});

		it('should handle invalid environment gracefully', async () => {
			await expect(
				(mcpServer as any).handleAnalyzeSchema({
					environment: 'invalid',
					includeSamples: false,
				}),
			).rejects.toThrow();
		});
	});

	describe('Dependency Injection', () => {
		it('should use injected cache provider', async () => {
			const setSpy = vi.spyOn(mockCache, 'set');
			const getSpy = vi.spyOn(mockCache, 'get');

			vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue({
				name: 'test',
				environment: Environment.DEVELOPMENT,
				tables: [],
				fetchedAt: new Date(),
			} as any);

			await (mcpServer as any).handleAnalyzeSchema({
				environment: 'development',
				includeSamples: false,
			});

			expect(getSpy).toHaveBeenCalled();
			expect(setSpy).toHaveBeenCalled();
		});

		it('should use injected repository', async () => {
			const fetchSpy = vi.spyOn(mockRepository, 'fetchDatabaseSchema').mockResolvedValue({
				name: 'test',
				environment: Environment.DEVELOPMENT,
				tables: [],
				fetchedAt: new Date(),
			} as any);

			await (mcpServer as any).handleAnalyzeSchema({
				environment: 'development',
				includeSamples: false,
			});

			expect(fetchSpy).toHaveBeenCalled();
		});
	});

	describe('Lifecycle', () => {
		it('should have start method', () => {
			expect(typeof mcpServer.start).toBe('function');
		});

		it('should have stop method', () => {
			expect(typeof mcpServer.stop).toBe('function');
		});
	});
});
