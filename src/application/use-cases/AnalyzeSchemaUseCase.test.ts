import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyzeSchemaUseCase } from './AnalyzeSchemaUseCase';
import { ICloudflareD1Repository } from '../../domain/repositories/ICloudflareD1Repository';
import { ICacheProvider } from '../ports/ICacheProvider';
import { SchemaAnalyzer } from '../../domain/services/SchemaAnalyzer';
import { DatabaseConfig } from '../../infrastructure/config/DatabaseConfig';
import { Environment } from '../../domain/value-objects/Environment';
import { DatabaseSchema } from '../../domain/entities/DatabaseSchema';
import { TableInfo } from '../../domain/entities/TableInfo';
import { Column } from '../../domain/entities/Column';
import { Index } from '../../domain/entities/Index';
import { ForeignKey } from '../../domain/entities/ForeignKey';

describe('AnalyzeSchemaUseCase', () => {
	let useCase: AnalyzeSchemaUseCase;
	let mockRepository: ICloudflareD1Repository;
	let mockCache: ICacheProvider;
	let mockSchemaAnalyzer: SchemaAnalyzer;
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

		// Mock schema analyzer
		mockSchemaAnalyzer = new SchemaAnalyzer();

		// Mock database config
		const databases = new Map();
		databases.set(Environment.DEVELOPMENT, { name: 'dev_db', id: 'dev-123' });
		databases.set(Environment.STAGING, { name: 'staging_db', id: 'staging-456' });
		databases.set(Environment.PRODUCTION, { name: 'prod_db', id: 'prod-789' });
		mockDatabaseConfig = new DatabaseConfig(databases);

		useCase = new AnalyzeSchemaUseCase(
			mockRepository,
			mockSchemaAnalyzer,
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
		it('should fetch schema and return analysis when cache is empty', async () => {
			// Mock cache miss
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			// Mock schema
			const columns = [
				new Column('id', 'INTEGER', false, true, null),
				new Column('name', 'TEXT', false, false, null),
			];
			const indexes = [new Index('idx_name', 'users', ['name'], false, false)];
			const foreignKeys: ForeignKey[] = [];
			const table = new TableInfo('users', 'table', columns, indexes, foreignKeys);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);
			(mockRepository.executeSQLQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				results: [{ id: 1, name: 'Alice' }],
			});

			// Execute
			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
				includeSamples: true,
				maxSampleRows: 5,
			});

			// Verify repository was called with correct database ID
			expect(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('dev-123');

			// Verify cache was set with 10-minute TTL
			expect(mockCache.set).toHaveBeenCalledWith('schema:development', schema, 600);

			// Verify response structure
			expect(result.databaseName).toBe('dev_db');
			expect(result.environment).toBe(Environment.DEVELOPMENT);
			expect(result.tableCount).toBe(1);
			expect(result.tables).toHaveLength(1);

			// Verify table analysis
			const tableAnalysis = result.tables[0];
			expect(tableAnalysis.name).toBe('users');
			expect(tableAnalysis.type).toBe('table');
			expect(tableAnalysis.columnCount).toBe(2);
			expect(tableAnalysis.columns).toHaveLength(2);
			expect(tableAnalysis.indexes).toHaveLength(1);
			expect(tableAnalysis.samples).toEqual([{ id: 1, name: 'Alice' }]);
		});

		it('should return cached schema when available', async () => {
			// Mock cached schema
			const columns = [new Column('id', 'INTEGER', false, true, null)];
			const table = new TableInfo('products', 'table', columns, [], []);
			const cachedSchema = new DatabaseSchema(
				'dev_db',
				Environment.DEVELOPMENT,
				[table],
				new Date(),
			);

			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(cachedSchema);

			// Execute
			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
				includeSamples: false,
			});

			// Verify cache was checked
			expect(mockCache.get).toHaveBeenCalledWith('schema:development');

			// Verify repository was NOT called
			expect(mockRepository.fetchDatabaseSchema).not.toHaveBeenCalled();

			// Verify cache was NOT set again
			expect(mockCache.set).not.toHaveBeenCalled();

			// Verify response uses cached data
			expect(result.databaseName).toBe('dev_db');
			expect(result.tableCount).toBe(1);
		});

		it('should handle different environments correctly', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const columns = [new Column('id', 'INTEGER', false, true, null)];
			const table = new TableInfo('orders', 'table', columns, [], []);
			const schema = new DatabaseSchema('prod_db', Environment.PRODUCTION, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			// Execute with production environment
			await useCase.execute({
				environment: Environment.PRODUCTION,
				includeSamples: false,
			});

			// Verify correct database ID used
			expect(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('prod-789');

			// Verify correct cache key
			expect(mockCache.set).toHaveBeenCalledWith('schema:production', schema, 600);
		});

		it('should include samples when includeSamples is true', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const columns = [new Column('id', 'INTEGER', false, true, null)];
			const table = new TableInfo('items', 'table', columns, [], []);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);
			(mockRepository.executeSQLQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				results: [{ id: 1 }, { id: 2 }],
			});

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
				includeSamples: true,
				maxSampleRows: 2,
			});

			// Verify sample query was executed
			expect(mockRepository.executeSQLQuery).toHaveBeenCalledWith(
				'dev-123',
				'SELECT * FROM "items" LIMIT 2',
			);

			// Verify samples are included
			expect(result.tables[0].samples).toEqual([{ id: 1 }, { id: 2 }]);
		});

		it('should exclude samples when includeSamples is false', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const columns = [new Column('id', 'INTEGER', false, true, null)];
			const table = new TableInfo('items', 'table', columns, [], []);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
				includeSamples: false,
			});

			// Verify sample query was NOT executed
			expect(mockRepository.executeSQLQuery).not.toHaveBeenCalled();

			// Verify samples are not included
			expect(result.tables[0].samples).toBeUndefined();
		});

		it('should use default values for optional parameters', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const columns = [new Column('id', 'INTEGER', false, true, null)];
			const table = new TableInfo('items', 'table', columns, [], []);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);
			(mockRepository.executeSQLQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				results: [],
			});

			// Execute with minimal request (no optional params)
			await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			// Verify default includeSamples=true and maxSampleRows=5
			expect(mockRepository.executeSQLQuery).toHaveBeenCalledWith(
				'dev-123',
				'SELECT * FROM "items" LIMIT 5',
			);
		});

		it('should handle sample fetch errors gracefully', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const columns = [new Column('id', 'INTEGER', false, true, null)];
			const table = new TableInfo('items', 'table', columns, [], []);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);
			(mockRepository.executeSQLQuery as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Table not found'),
			);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
				includeSamples: true,
			});

			// Verify sample fetch was attempted
			expect(mockRepository.executeSQLQuery).toHaveBeenCalled();

			// Verify empty array returned on error (doesn't fail entire analysis)
			expect(result.tables[0].samples).toEqual([]);
		});

		it('should correctly format all table metadata', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const columns = [
				new Column('id', 'INTEGER', true, false, null),
				new Column('name', 'TEXT', false, true, "'unknown'"),
			];
			const indexes = [
				new Index('pk_users', 'users', ['id'], true, true),
				new Index('idx_name', 'users', ['name'], false, false),
			];
			const foreignKeys = [
				new ForeignKey('users', 'department_id', 'departments', 'id', 'CASCADE', 'RESTRICT'),
			];
			const table = new TableInfo('users', 'table', columns, indexes, foreignKeys);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
				includeSamples: false,
			});

			const tableAnalysis = result.tables[0];

			// Verify columns
			expect(tableAnalysis.columns).toHaveLength(2);
			expect(tableAnalysis.columns[0]).toEqual({
				name: 'id',
				type: 'INTEGER',
				nullable: false,
				isPrimaryKey: true,
				defaultValue: null,
			});
			expect(tableAnalysis.columns[1]).toEqual({
				name: 'name',
				type: 'TEXT',
				nullable: true,
				isPrimaryKey: false,
				defaultValue: "'unknown'",
			});

			// Verify indexes
			expect(tableAnalysis.indexes).toHaveLength(2);
			expect(tableAnalysis.indexes[0]).toEqual({
				name: 'pk_users',
				columns: ['id'],
				isUnique: true,
				isPrimaryKey: true,
			});

			// Verify foreign keys
			expect(tableAnalysis.foreignKeys).toHaveLength(1);
			expect(tableAnalysis.foreignKeys[0]).toEqual({
				column: 'department_id',
				referencedTable: 'departments',
				referencedColumn: 'id',
				onDelete: 'CASCADE',
				onUpdate: 'RESTRICT',
			});
		});
	});
});
