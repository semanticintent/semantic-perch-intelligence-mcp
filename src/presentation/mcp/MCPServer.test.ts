import { describe, it, expect, beforeEach, vi } from 'vitest';
import { D1DatabaseMCPServer } from './MCPServer';
import { AnalyzeSchemaUseCase } from '../../application/use-cases/AnalyzeSchemaUseCase';
import { GetRelationshipsUseCase } from '../../application/use-cases/GetRelationshipsUseCase';
import { ValidateSchemaUseCase } from '../../application/use-cases/ValidateSchemaUseCase';
import { SuggestOptimizationsUseCase } from '../../application/use-cases/SuggestOptimizationsUseCase';
import { CompareSchemasUseCase } from '../../application/use-cases/CompareSchemasUseCase';
import { Environment } from '../../domain/value-objects/Environment';

describe('D1DatabaseMCPServer', () => {
	let server: D1DatabaseMCPServer;
	let mockAnalyzeSchemaUseCase: AnalyzeSchemaUseCase;
	let mockGetRelationshipsUseCase: GetRelationshipsUseCase;
	let mockValidateSchemaUseCase: ValidateSchemaUseCase;
	let mockSuggestOptimizationsUseCase: SuggestOptimizationsUseCase;
	let mockCompareSchemasUseCase: CompareSchemasUseCase;

	beforeEach(() => {
		// Mock use cases
		mockAnalyzeSchemaUseCase = {
			execute: vi.fn(),
		} as unknown as AnalyzeSchemaUseCase;

		mockGetRelationshipsUseCase = {
			execute: vi.fn(),
		} as unknown as GetRelationshipsUseCase;

		mockValidateSchemaUseCase = {
			execute: vi.fn(),
		} as unknown as ValidateSchemaUseCase;

		mockSuggestOptimizationsUseCase = {
			execute: vi.fn(),
		} as unknown as SuggestOptimizationsUseCase;

		mockCompareSchemasUseCase = {
			execute: vi.fn(),
		} as unknown as CompareSchemasUseCase;

		server = new D1DatabaseMCPServer(
			mockAnalyzeSchemaUseCase,
			mockGetRelationshipsUseCase,
			mockValidateSchemaUseCase,
			mockSuggestOptimizationsUseCase,
			mockCompareSchemasUseCase,
		);

		vi.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create server instance and freeze it', () => {
			expect(server).toBeDefined();
			expect(Object.isFrozen(server)).toBe(true);
		});
	});

	describe('handleAnalyzeSchema', () => {
		it('should call AnalyzeSchemaUseCase with correct parameters', async () => {
			const mockResponse = {
				databaseName: 'test_db',
				environment: Environment.DEVELOPMENT,
				tableCount: 1,
				tables: [],
				fetchedAt: new Date(),
			};

			(mockAnalyzeSchemaUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResponse,
			);

			// Access private method via type assertion for testing
			const result = await (server as any).handleAnalyzeSchema({
				environment: 'development',
				includeSamples: true,
				maxSampleRows: 5,
			});

			expect(mockAnalyzeSchemaUseCase.execute).toHaveBeenCalledWith({
				environment: Environment.DEVELOPMENT,
				includeSamples: true,
				maxSampleRows: 5,
			});

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
			const parsedResult = JSON.parse(result.content[0].text);
			expect(parsedResult.databaseName).toBe(mockResponse.databaseName);
		});

		it('should use default values for optional parameters', async () => {
			const mockResponse = {
				databaseName: 'test_db',
				environment: Environment.PRODUCTION,
				tableCount: 0,
				tables: [],
				fetchedAt: new Date(),
			};

			(mockAnalyzeSchemaUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResponse,
			);

			await (server as any).handleAnalyzeSchema({
				environment: 'production',
			});

			expect(mockAnalyzeSchemaUseCase.execute).toHaveBeenCalledWith({
				environment: Environment.PRODUCTION,
				includeSamples: undefined,
				maxSampleRows: undefined,
			});
		});
	});

	describe('handleGetRelationships', () => {
		it('should call GetRelationshipsUseCase with correct parameters', async () => {
			const mockResponse = {
				databaseName: 'test_db',
				environment: Environment.DEVELOPMENT,
				relationships: [],
				relationshipCount: 0,
			};

			(mockGetRelationshipsUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResponse,
			);

			const result = await (server as any).handleGetRelationships({
				environment: 'development',
				tableName: 'users',
			});

			expect(mockGetRelationshipsUseCase.execute).toHaveBeenCalledWith({
				environment: Environment.DEVELOPMENT,
				tableName: 'users',
			});

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
			const parsedResult = JSON.parse(result.content[0].text);
			expect(parsedResult.databaseName).toBe(mockResponse.databaseName);
		});

		it('should handle requests without tableName filter', async () => {
			const mockResponse = {
				databaseName: 'test_db',
				environment: Environment.STAGING,
				relationships: [],
				relationshipCount: 0,
			};

			(mockGetRelationshipsUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResponse,
			);

			await (server as any).handleGetRelationships({
				environment: 'staging',
			});

			expect(mockGetRelationshipsUseCase.execute).toHaveBeenCalledWith({
				environment: Environment.STAGING,
				tableName: undefined,
			});
		});
	});

	describe('handleValidateSchema', () => {
		it('should call ValidateSchemaUseCase with correct parameters', async () => {
			const mockResponse = {
				databaseName: 'test_db',
				environment: Environment.DEVELOPMENT,
				isValid: true,
				errorCount: 0,
				warningCount: 0,
				infoCount: 0,
				issues: [],
				validatedAt: new Date(),
			};

			(mockValidateSchemaUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResponse,
			);

			const result = await (server as any).handleValidateSchema({
				environment: 'development',
			});

			expect(mockValidateSchemaUseCase.execute).toHaveBeenCalledWith({
				environment: Environment.DEVELOPMENT,
			});

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
			const parsedResult = JSON.parse(result.content[0].text);
			expect(parsedResult.databaseName).toBe(mockResponse.databaseName);
		});

		it('should handle validation with errors', async () => {
			const mockResponse = {
				databaseName: 'test_db',
				environment: Environment.PRODUCTION,
				isValid: false,
				errorCount: 2,
				warningCount: 1,
				infoCount: 0,
				issues: [
					{
						severity: 'ERROR' as const,
						category: 'Orphaned Foreign Key',
						message: 'Test error',
					},
				],
				validatedAt: new Date(),
			};

			(mockValidateSchemaUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResponse,
			);

			const result = await (server as any).handleValidateSchema({
				environment: 'production',
			});

			const parsedResult = JSON.parse(result.content[0].text);
			expect(parsedResult.isValid).toBe(false);
			expect(parsedResult.errorCount).toBe(2);
		});
	});

	describe('handleSuggestOptimizations', () => {
		it('should call SuggestOptimizationsUseCase with correct parameters', async () => {
			const mockResponse = {
				databaseName: 'test_db',
				environment: Environment.DEVELOPMENT,
				optimizationCount: 1,
				optimizations: [
					{
						type: 'missing_index',
						table: 'orders',
						column: 'user_id',
						reason: 'Foreign key without index',
						suggestion: 'CREATE INDEX idx_user_id ON orders(user_id)',
						priority: 'high' as const,
					},
				],
				analyzedAt: new Date(),
			};

			(mockSuggestOptimizationsUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResponse,
			);

			const result = await (server as any).handleSuggestOptimizations({
				environment: 'development',
			});

			expect(mockSuggestOptimizationsUseCase.execute).toHaveBeenCalledWith({
				environment: Environment.DEVELOPMENT,
			});

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
			const parsedResult = JSON.parse(result.content[0].text);
			expect(parsedResult.optimizationCount).toBe(1);
			expect(parsedResult.optimizations).toHaveLength(1);
		});

		it('should handle schema with no optimizations', async () => {
			const mockResponse = {
				databaseName: 'test_db',
				environment: Environment.PRODUCTION,
				optimizationCount: 0,
				optimizations: [],
				analyzedAt: new Date(),
			};

			(mockSuggestOptimizationsUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResponse,
			);

			const result = await (server as any).handleSuggestOptimizations({
				environment: 'production',
			});

			const parsedResult = JSON.parse(result.content[0].text);
			expect(parsedResult.optimizationCount).toBe(0);
			expect(parsedResult.optimizations).toHaveLength(0);
		});
	});

	describe('error handling', () => {
		it('should format JSON responses correctly', async () => {
			const mockResponse = {
				databaseName: 'test_db',
				environment: Environment.DEVELOPMENT,
				tableCount: 0,
				tables: [],
				fetchedAt: new Date('2024-01-01T00:00:00Z'),
			};

			(mockAnalyzeSchemaUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
				mockResponse,
			);

			const result = await (server as any).handleAnalyzeSchema({
				environment: 'development',
			});

			// Verify JSON is properly formatted
			expect(() => JSON.parse(result.content[0].text)).not.toThrow();
			const parsed = JSON.parse(result.content[0].text);
			expect(parsed.databaseName).toBe('test_db');
		});

		it('should handle use case execution errors gracefully', async () => {
			(mockAnalyzeSchemaUseCase.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Database connection failed'),
			);

			// The error should propagate up to be caught by the CallToolRequestSchema handler
			await expect((server as any).handleAnalyzeSchema({ environment: 'development' })).rejects.toThrow(
				'Database connection failed',
			);
		});
	});

	describe('lifecycle', () => {
		it('should have start method', () => {
			expect(typeof server.start).toBe('function');
		});

		it('should have stop method', () => {
			expect(typeof server.stop).toBe('function');
		});
	});
});
