import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SuggestOptimizationsUseCase } from './SuggestOptimizationsUseCase';
import { ICloudflareD1Repository } from '../../domain/repositories/ICloudflareD1Repository';
import { ICacheProvider } from '../ports/ICacheProvider';
import { OptimizationService } from '../../domain/services/OptimizationService';
import { RelationshipAnalyzer } from '../../domain/services/RelationshipAnalyzer';
import { DatabaseConfig } from '../../infrastructure/config/DatabaseConfig';
import { Environment } from '../../domain/value-objects/Environment';
import { DatabaseSchema } from '../../domain/entities/DatabaseSchema';
import { TableInfo } from '../../domain/entities/TableInfo';
import { Column } from '../../domain/entities/Column';
import { Index } from '../../domain/entities/Index';
import { ForeignKey } from '../../domain/entities/ForeignKey';

describe('SuggestOptimizationsUseCase', () => {
	let useCase: SuggestOptimizationsUseCase;
	let mockRepository: ICloudflareD1Repository;
	let mockCache: ICacheProvider;
	let optimizationService: OptimizationService;
	let relationshipAnalyzer: RelationshipAnalyzer;
	let mockDatabaseConfig: DatabaseConfig;

	beforeEach(() => {
		// Mock repository
		mockRepository = {
			fetchDatabaseSchema: vi.fn(),
			fetchTableDetails: vi.fn(),
			fetchIndexInformation: vi.fn(),
			executeSQLQuery: vi.fn(),
		} as unknown as ICloudflareD1Repository;

		// Mock cache
		mockCache = {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			clear: vi.fn(),
			has: vi.fn(),
		} as unknown as ICacheProvider;

		// Real optimization service and relationship analyzer
		optimizationService = new OptimizationService();
		relationshipAnalyzer = new RelationshipAnalyzer();

		// Mock database config
		const databases = new Map();
		databases.set(Environment.DEVELOPMENT, { name: 'dev_db', id: 'dev-123' });
		databases.set(Environment.PRODUCTION, { name: 'prod_db', id: 'prod-789' });
		mockDatabaseConfig = new DatabaseConfig(databases);

		useCase = new SuggestOptimizationsUseCase(
			mockRepository,
			optimizationService,
			relationshipAnalyzer,
			mockDatabaseConfig,
			mockCache,
		);

		vi.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create use case and freeze instance', () => {
			expect(Object.isFrozen(useCase)).toBe(true);
		});
	});

	describe('execute()', () => {
		it('should suggest optimizations for schema', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			// Create schema with optimization opportunities - table without primary key
			const columns = [new Column('name', 'TEXT', false, false, null)];
			const table = new TableInfo('users', 'table', columns, [], []);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			expect(result.databaseName).toBe('dev_db');
			expect(result.environment).toBe(Environment.DEVELOPMENT);
			expect(result.optimizationCount).toBeGreaterThan(0);
			expect(result.optimizations).toBeInstanceOf(Array);
		});

		it('should suggest index on foreign key column', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const usersColumns = [new Column('id', 'INTEGER', true, false, null)];
			const usersTable = new TableInfo('users', 'table', usersColumns, [], []);

			const ordersColumns = [
				new Column('id', 'INTEGER', true, false, null),
				new Column('user_id', 'INTEGER', false, false, null),
			];
			const foreignKeys = [new ForeignKey('orders', 'user_id', 'users', 'id', 'CASCADE', null)];
			// No index on user_id
			const ordersTable = new TableInfo('orders', 'table', ordersColumns, [], foreignKeys);

			const schema = new DatabaseSchema(
				'dev_db',
				Environment.DEVELOPMENT,
				[usersTable, ordersTable],
				new Date(),
			);

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			// Should suggest index on foreign key
			const fkIndexSuggestion = result.optimizations.find(
				(opt) => opt.type === 'missing_index' && opt.column === 'user_id',
			);
			expect(fkIndexSuggestion).toBeDefined();
			expect(fkIndexSuggestion?.table).toBe('orders');
		});

		it('should not suggest index if already exists', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const usersColumns = [new Column('id', 'INTEGER', true, false, null)];
			const usersTable = new TableInfo('users', 'table', usersColumns, [], []);

			const ordersColumns = [
				new Column('id', 'INTEGER', true, false, null),
				new Column('user_id', 'INTEGER', false, false, null),
			];
			const foreignKeys = [new ForeignKey('orders', 'user_id', 'users', 'id', 'CASCADE', null)];
			const indexes = [new Index('idx_user_id', 'orders', ['user_id'], false, false)];
			const ordersTable = new TableInfo('orders', 'table', ordersColumns, indexes, foreignKeys);

			const schema = new DatabaseSchema(
				'dev_db',
				Environment.DEVELOPMENT,
				[usersTable, ordersTable],
				new Date(),
			);

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			// Should NOT suggest index on user_id since it exists
			const fkIndexSuggestion = result.optimizations.find(
				(opt) => opt.type === 'missing_index' && opt.column === 'user_id',
			);
			expect(fkIndexSuggestion).toBeUndefined();
		});

		it('should use cached schema when available', async () => {
			const columns = [new Column('id', 'INTEGER', true, false, null)];
			const table = new TableInfo('products', 'table', columns, [], []);
			const cachedSchema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(cachedSchema);

			await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			// Verify cache was checked
			expect(mockCache.get).toHaveBeenCalledWith('schema:development');

			// Verify repository was NOT called
			expect(mockRepository.fetchDatabaseSchema).not.toHaveBeenCalled();

			// Verify cache was NOT set again
			expect(mockCache.set).not.toHaveBeenCalled();
		});

		it('should handle different environments correctly', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const columns = [new Column('id', 'INTEGER', true, false, null)];
			const table = new TableInfo('items', 'table', columns, [], []);
			const schema = new DatabaseSchema('prod_db', Environment.PRODUCTION, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.PRODUCTION,
			});

			// Verify correct database ID used
			expect(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('prod-789');

			// Verify correct cache key
			expect(mockCache.set).toHaveBeenCalledWith('schema:production', schema, 600);

			expect(result.environment).toBe(Environment.PRODUCTION);
			expect(result.databaseName).toBe('prod_db');
		});

		it('should include optimization details', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const columns = [
				new Column('id', 'INTEGER', true, false, null),
				new Column('email', 'TEXT', false, false, null),
			];
			const table = new TableInfo('users', 'table', columns, [], []);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			if (result.optimizations.length > 0) {
				const opt = result.optimizations[0];
				expect(opt.type).toBeDefined();
				expect(opt.reason).toBeDefined();
				expect(opt.suggestion).toBeDefined();
				expect(opt.priority).toBeDefined();
			}
		});

		it('should handle schema with no optimization opportunities', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			// Well-optimized table
			const columns = [new Column('id', 'INTEGER', true, false, null)];
			const indexes = [new Index('pk_id', 'users', ['id'], true, true)];
			const table = new TableInfo('users', 'table', columns, indexes, []);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			expect(result.optimizationCount).toBe(0);
			expect(result.optimizations).toHaveLength(0);
		});

		it('should map optimization properties correctly', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const usersColumns = [new Column('id', 'INTEGER', true, false, null)];
			const usersTable = new TableInfo('users', 'table', usersColumns, [], []);

			const ordersColumns = [
				new Column('id', 'INTEGER', true, false, null),
				new Column('user_id', 'INTEGER', false, false, null),
			];
			const foreignKeys = [new ForeignKey('orders', 'user_id', 'users', 'id', 'CASCADE', null)];
			const ordersTable = new TableInfo('orders', 'table', ordersColumns, [], foreignKeys);

			const schema = new DatabaseSchema(
				'dev_db',
				Environment.DEVELOPMENT,
				[usersTable, ordersTable],
				new Date(),
			);

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			const fkOpt = result.optimizations.find((opt) => opt.column === 'user_id');
			if (fkOpt) {
				expect(fkOpt.type).toBe('missing_index');
				expect(fkOpt.table).toBe('orders');
				expect(fkOpt.column).toBe('user_id');
				expect(['high', 'medium', 'low']).toContain(fkOpt.priority);
				expect(fkOpt.reason).toBeDefined();
				expect(fkOpt.suggestion).toBeDefined();
			}
		});
	});
});
