import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetRelationshipsUseCase } from './GetRelationshipsUseCase';
import { ICloudflareD1Repository } from '../../domain/repositories/ICloudflareD1Repository';
import { ICacheProvider } from '../ports/ICacheProvider';
import { RelationshipAnalyzer } from '../../domain/services/RelationshipAnalyzer';
import { DatabaseConfig } from '../../infrastructure/config/DatabaseConfig';
import { Environment } from '../../domain/value-objects/Environment';
import { DatabaseSchema } from '../../domain/entities/DatabaseSchema';
import { TableInfo } from '../../domain/entities/TableInfo';
import { Column } from '../../domain/entities/Column';
import { ForeignKey } from '../../domain/entities/ForeignKey';

describe('GetRelationshipsUseCase', () => {
	let useCase: GetRelationshipsUseCase;
	let mockRepository: ICloudflareD1Repository;
	let mockCache: ICacheProvider;
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

		// Real relationship analyzer
		relationshipAnalyzer = new RelationshipAnalyzer();

		// Mock database config
		const databases = new Map();
		databases.set(Environment.DEVELOPMENT, { name: 'dev_db', id: 'dev-123' });
		databases.set(Environment.PRODUCTION, { name: 'prod_db', id: 'prod-789' });
		mockDatabaseConfig = new DatabaseConfig(databases);

		useCase = new GetRelationshipsUseCase(
			mockRepository,
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
		it('should extract all relationships from schema', async () => {
			// Mock cache miss
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			// Create schema with relationships
			const usersColumns = [new Column('id', 'INTEGER', false, true, null)];
			const ordersColumns = [
				new Column('id', 'INTEGER', false, true, null),
				new Column('user_id', 'INTEGER', false, false, null),
			];
			const ordersForeignKeys = [new ForeignKey('orders', 'user_id', 'users', 'id', 'CASCADE', 'RESTRICT')];

			const usersTable = new TableInfo('users', 'table', usersColumns, [], []);
			const ordersTable = new TableInfo('orders', 'table', ordersColumns, [], ordersForeignKeys);

			const schema = new DatabaseSchema(
				'dev_db',
				Environment.DEVELOPMENT,
				[usersTable, ordersTable],
				new Date(),
			);

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			// Execute
			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			// Verify repository was called
			expect(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('dev-123');

			// Verify cache was set
			expect(mockCache.set).toHaveBeenCalledWith('schema:development', schema, 600);

			// Verify response
			expect(result.databaseName).toBe('dev_db');
			expect(result.environment).toBe(Environment.DEVELOPMENT);
			expect(result.relationshipCount).toBe(1);
			expect(result.relationships).toHaveLength(1);

			// Verify relationship details
			const rel = result.relationships[0];
			expect(rel.fromTable).toBe('orders');
			expect(rel.fromColumn).toBe('user_id');
			expect(rel.toTable).toBe('users');
			expect(rel.toColumn).toBe('id');
			expect(rel.onDelete).toBe('CASCADE');
			expect(rel.onUpdate).toBe('RESTRICT');
			expect(rel.isRequired).toBe(true);
		});

		it('should return cached schema when available', async () => {
			// Create and cache schema
			const table = new TableInfo('products', 'table', [new Column('id', 'INTEGER', false, true, null)], [], []);
			const cachedSchema = new DatabaseSchema(
				'dev_db',
				Environment.DEVELOPMENT,
				[table],
				new Date(),
			);

			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(cachedSchema);

			// Execute
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

		it('should filter relationships by table name when specified', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			// Create schema with multiple relationships
			const usersTable = new TableInfo('users', 'table', [new Column('id', 'INTEGER', false, true, null)], [], []);
			const ordersTable = new TableInfo(
				'orders',
				'table',
				[new Column('id', 'INTEGER', false, true, null)],
				[],
				[new ForeignKey('orders', 'user_id', 'users', 'id', 'CASCADE', null)],
			);
			const paymentsTable = new TableInfo(
				'payments',
				'table',
				[new Column('id', 'INTEGER', false, true, null)],
				[],
				[new ForeignKey('payments', 'order_id', 'orders', 'id', 'RESTRICT', null)],
			);

			const schema = new DatabaseSchema(
				'dev_db',
				Environment.DEVELOPMENT,
				[usersTable, ordersTable, paymentsTable],
				new Date(),
			);

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			// Execute with table filter
			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
				tableName: 'orders',
			});

			// Should return relationships where orders is either fromTable or toTable
			expect(result.relationshipCount).toBe(2);

			const fromOrders = result.relationships.find((r) => r.fromTable === 'orders');
			const toOrders = result.relationships.find((r) => r.toTable === 'orders');

			expect(fromOrders).toBeDefined();
			expect(fromOrders?.toTable).toBe('users');

			expect(toOrders).toBeDefined();
			expect(toOrders?.fromTable).toBe('payments');
		});

		it('should handle schema with no relationships', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			// Create schema without foreign keys
			const table = new TableInfo('standalone', 'table', [new Column('id', 'INTEGER', false, true, null)], [], []);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			expect(result.relationshipCount).toBe(0);
			expect(result.relationships).toHaveLength(0);
		});

		it('should handle different environments correctly', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const table = new TableInfo('items', 'table', [new Column('id', 'INTEGER', false, true, null)], [], []);
			const schema = new DatabaseSchema('prod_db', Environment.PRODUCTION, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.PRODUCTION,
			});

			// Verify correct database ID used
			expect(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('prod-789');

			// Verify correct cache key
			expect(mockCache.set).toHaveBeenCalledWith('schema:production', schema, 600);

			// Verify response environment
			expect(result.environment).toBe(Environment.PRODUCTION);
			expect(result.databaseName).toBe('prod_db');
		});

		it('should correctly identify required relationships', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const table1 = new TableInfo('table1', 'table', [new Column('id', 'INTEGER', false, true, null)], [], []);
			const table2 = new TableInfo(
				'table2',
				'table',
				[new Column('id', 'INTEGER', false, true, null)],
				[],
				[
					new ForeignKey('table2', 'fk1', 'table1', 'id', 'CASCADE', null), // Required (CASCADE)
					new ForeignKey('table2', 'fk2', 'table1', 'id', 'SET NULL', null), // Not required
				],
			);

			const schema = new DatabaseSchema(
				'dev_db',
				Environment.DEVELOPMENT,
				[table1, table2],
				new Date(),
			);

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			expect(result.relationshipCount).toBe(2);

			const cascadeRel = result.relationships.find((r) => r.onDelete === 'CASCADE');
			const setNullRel = result.relationships.find((r) => r.onDelete === 'SET NULL');

			expect(cascadeRel?.isRequired).toBe(true);
			expect(setNullRel?.isRequired).toBe(false);
		});

		it('should return empty array when filtering by non-existent table', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const table = new TableInfo(
				'users',
				'table',
				[new Column('id', 'INTEGER', false, true, null)],
				[],
				[new ForeignKey('users', 'dept_id', 'departments', 'id', null, null)],
			);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
				tableName: 'nonexistent',
			});

			expect(result.relationshipCount).toBe(0);
			expect(result.relationships).toHaveLength(0);
		});
	});
});
