import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidateSchemaUseCase, ValidationSeverity } from './ValidateSchemaUseCase';
import { ICloudflareD1Repository } from '../../domain/repositories/ICloudflareD1Repository';
import { ICacheProvider } from '../ports/ICacheProvider';
import { SchemaAnalyzer } from '../../domain/services/SchemaAnalyzer';
import { DatabaseConfig } from '../../infrastructure/config/DatabaseConfig';
import { Environment } from '../../domain/value-objects/Environment';
import { DatabaseSchema } from '../../domain/entities/DatabaseSchema';
import { TableInfo } from '../../domain/entities/TableInfo';
import { Column } from '../../domain/entities/Column';
import { ForeignKey } from '../../domain/entities/ForeignKey';

describe('ValidateSchemaUseCase', () => {
	let useCase: ValidateSchemaUseCase;
	let mockRepository: ICloudflareD1Repository;
	let mockCache: ICacheProvider;
	let schemaAnalyzer: SchemaAnalyzer;
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

		// Real schema analyzer
		schemaAnalyzer = new SchemaAnalyzer();

		// Mock database config
		const databases = new Map();
		databases.set(Environment.DEVELOPMENT, { name: 'dev_db', id: 'dev-123' });
		databases.set(Environment.PRODUCTION, { name: 'prod_db', id: 'prod-789' });
		mockDatabaseConfig = new DatabaseConfig(databases);

		useCase = new ValidateSchemaUseCase(mockRepository, schemaAnalyzer, mockDatabaseConfig, mockCache);

		vi.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create use case and freeze instance', () => {
			expect(Object.isFrozen(useCase)).toBe(true);
		});
	});

	describe('execute()', () => {
		it('should validate schema with no issues', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			// Create valid schema
			const columns = [new Column('id', 'INTEGER', true, false, null)];
			const table = new TableInfo('users', 'table', columns, [], []);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			expect(result.isValid).toBe(true);
			expect(result.errorCount).toBe(0);
			expect(result.warningCount).toBe(0);
			expect(result.infoCount).toBe(1); // No indexes info
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].category).toBe('No Indexes');
		});

		it('should detect table without primary key', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			// Table with no primary key
			const columns = [new Column('name', 'TEXT', false, false, null)];
			const table = new TableInfo('users', 'table', columns, [], []);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			expect(result.isValid).toBe(true); // No errors, just warnings
			expect(result.warningCount).toBe(1);
			const pkIssue = result.issues.find((i) => i.category === 'Missing Primary Key');
			expect(pkIssue).toBeDefined();
			expect(pkIssue?.severity).toBe(ValidationSeverity.WARNING);
			expect(pkIssue?.table).toBe('users');
		});

		it('should detect orphaned foreign key', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			// Foreign key references non-existent table
			const columns = [
				new Column('id', 'INTEGER', true, false, null),
				new Column('user_id', 'INTEGER', false, false, null),
			];
			const foreignKeys = [new ForeignKey('orders', 'user_id', 'users', 'id', 'CASCADE', null)];
			const table = new TableInfo('orders', 'table', columns, [], foreignKeys);
			const schema = new DatabaseSchema('dev_db', Environment.DEVELOPMENT, [table], new Date());

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			expect(result.isValid).toBe(false); // Has errors
			expect(result.errorCount).toBe(1);
			const fkIssue = result.issues.find((i) => i.category === 'Orphaned Foreign Key');
			expect(fkIssue).toBeDefined();
			expect(fkIssue?.severity).toBe(ValidationSeverity.ERROR);
			expect(fkIssue?.table).toBe('orders');
			expect(fkIssue?.column).toBe('user_id');
		});

		it('should detect invalid foreign key column reference', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			// Foreign key references non-existent column
			const usersColumns = [new Column('id', 'INTEGER', true, false, null)];
			const usersTable = new TableInfo('users', 'table', usersColumns, [], []);

			const ordersColumns = [
				new Column('id', 'INTEGER', true, false, null),
				new Column('user_id', 'INTEGER', false, false, null),
			];
			const foreignKeys = [
				new ForeignKey('orders', 'user_id', 'users', 'nonexistent_id', 'CASCADE', null),
			];
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

			expect(result.isValid).toBe(false);
			expect(result.errorCount).toBe(1);
			const fkIssue = result.issues.find((i) => i.category === 'Invalid Foreign Key');
			expect(fkIssue).toBeDefined();
			expect(fkIssue?.severity).toBe(ValidationSeverity.ERROR);
			expect(fkIssue?.table).toBe('orders');
			expect(fkIssue?.details?.referencedColumn).toBe('nonexistent_id');
		});

		it('should detect nullable foreign key without SET NULL', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const usersColumns = [new Column('id', 'INTEGER', true, false, null)];
			const usersTable = new TableInfo('users', 'table', usersColumns, [], []);

			const ordersColumns = [
				new Column('id', 'INTEGER', true, false, null),
				new Column('user_id', 'INTEGER', false, true, null), // Nullable
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

			expect(result.isValid).toBe(true); // Warning, not error
			expect(result.warningCount).toBeGreaterThan(0);
			const fkIssue = result.issues.find((i) => i.category === 'Nullable Foreign Key');
			expect(fkIssue).toBeDefined();
			expect(fkIssue?.severity).toBe(ValidationSeverity.WARNING);
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

		it('should count issues by severity correctly', async () => {
			(mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			// Create schema with multiple issues
			const usersColumns = [
				new Column('id', 'INTEGER', true, false, null),
				new Column('name', 'TEXT', false, true, null),
			];
			const usersTable = new TableInfo('users', 'table', usersColumns, [], []);

			const ordersColumns = [
				new Column('id', 'INTEGER', true, false, null),
				new Column('user_id', 'INTEGER', false, true, null), // Nullable FK
			];
			const foreignKeys = [
				new ForeignKey('orders', 'user_id', 'nonexistent', 'id', 'CASCADE', null), // Orphaned FK
			];
			const ordersTable = new TableInfo('orders', 'table', ordersColumns, [], foreignKeys);

			const noPkColumns = [new Column('value', 'TEXT', false, false, null)];
			const noPkTable = new TableInfo('settings', 'table', noPkColumns, [], []); // No primary key

			const schema = new DatabaseSchema(
				'dev_db',
				Environment.DEVELOPMENT,
				[usersTable, ordersTable, noPkTable],
				new Date(),
			);

			(mockRepository.fetchDatabaseSchema as ReturnType<typeof vi.fn>).mockResolvedValue(schema);

			const result = await useCase.execute({
				environment: Environment.DEVELOPMENT,
			});

			expect(result.isValid).toBe(false); // Has errors
			expect(result.errorCount).toBe(1); // Orphaned FK
			expect(result.warningCount).toBeGreaterThan(0); // No PK warnings
			expect(result.infoCount).toBeGreaterThan(0); // No indexes info
		});
	});
});
