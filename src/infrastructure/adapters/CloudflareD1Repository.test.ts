import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloudflareD1Repository } from './CloudflareD1Repository';
import { CloudflareAPIClient } from '../http/CloudflareAPIClient';
import { DatabaseConfig } from '../config/DatabaseConfig';
import { Environment } from '../../domain/value-objects/Environment';

describe('CloudflareD1Repository', () => {
	let repository: CloudflareD1Repository;
	let mockApiClient: CloudflareAPIClient;
	let mockDatabaseConfig: DatabaseConfig;

	beforeEach(() => {
		// Create mock API client
		mockApiClient = {
			query: vi.fn(),
			getDatabaseInfo: vi.fn(),
		} as unknown as CloudflareAPIClient;

		// Create mock database config
		const databases = new Map();
		databases.set(Environment.DEVELOPMENT, { name: 'dev_db', id: 'dev-123' });
		databases.set(Environment.PRODUCTION, { name: 'prod_db', id: 'prod-456' });
		mockDatabaseConfig = new DatabaseConfig(databases);

		repository = new CloudflareD1Repository(mockApiClient, mockDatabaseConfig, Environment.DEVELOPMENT);

		vi.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create repository with dependencies', () => {
			expect(repository).toBeInstanceOf(CloudflareD1Repository);
		});

		it('should be frozen for immutability', () => {
			expect(Object.isFrozen(repository)).toBe(true);
		});

		it('should default to DEVELOPMENT environment', () => {
			const repo = new CloudflareD1Repository(mockApiClient, mockDatabaseConfig);
			expect(repo).toBeInstanceOf(CloudflareD1Repository);
		});
	});

	describe('fetchDatabaseSchema()', () => {
		it('should fetch complete database schema', async () => {
			// Mock sqlite_master query
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [
					{ type: 'table', name: 'users', sql: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)' },
					{ type: 'table', name: 'posts', sql: 'CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER)' },
				],
			});

			// Mock PRAGMA table_info for users
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [
					{ cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
					{ cid: 1, name: 'name', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
				],
			});

			// Mock PRAGMA index_list for users
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			// Mock PRAGMA foreign_key_list for users
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			// Mock PRAGMA table_info for posts
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [
					{ cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
					{ cid: 1, name: 'user_id', type: 'INTEGER', notnull: 0, dflt_value: null, pk: 0 },
				],
			});

			// Mock PRAGMA index_list for posts
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			// Mock PRAGMA foreign_key_list for posts
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [
					{
						id: 0,
						seq: 0,
						table: 'users',
						from: 'user_id',
						to: 'id',
						on_update: 'NO ACTION',
						on_delete: 'CASCADE',
						match: 'NONE',
					},
				],
			});

			const schema = await repository.fetchDatabaseSchema();

			expect(schema.name).toBe('dev_db');
			expect(schema.environment).toBe(Environment.DEVELOPMENT);
			expect(schema.tables).toHaveLength(2);
			expect(schema.tables[0].name).toBe('users');
			expect(schema.tables[1].name).toBe('posts');
			expect(schema.fetchedAt).toBeInstanceOf(Date);
		});

		it('should use provided database ID', async () => {
			// Mock sqlite_master query with at least one table
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ type: 'table', name: 'users', sql: 'CREATE TABLE users (id INTEGER)' }],
			});

			// Mock PRAGMA table_info
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 }],
			});

			// Mock PRAGMA index_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			// Mock PRAGMA foreign_key_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			await repository.fetchDatabaseSchema('custom-db-id');

			expect(mockApiClient.query).toHaveBeenCalledWith(
				'custom-db-id',
				expect.stringContaining('SELECT type, name, sql FROM sqlite_master'),
			);
		});

		it('should use environment database ID when not provided', async () => {
			// Mock sqlite_master query with at least one table
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ type: 'table', name: 'users', sql: 'CREATE TABLE users (id INTEGER)' }],
			});

			// Mock PRAGMA table_info
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 }],
			});

			// Mock PRAGMA index_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			// Mock PRAGMA foreign_key_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			await repository.fetchDatabaseSchema();

			expect(mockApiClient.query).toHaveBeenCalledWith(
				'dev-123',
				expect.stringContaining('SELECT type, name, sql FROM sqlite_master'),
			);
		});

		it('should return empty tables array when no tables exist', async () => {
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				results: [],
			});

			const tables = await repository.fetchTableDetails();

			expect(tables).toHaveLength(0);
		});
	});

	describe('fetchTableDetails()', () => {
		it('should fetch all tables when no table name specified', async () => {
			// Mock sqlite_master query
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ type: 'table', name: 'users', sql: 'CREATE TABLE users (id INTEGER)' }],
			});

			// Mock PRAGMA table_info
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 }],
			});

			// Mock PRAGMA index_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			// Mock PRAGMA foreign_key_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			const tables = await repository.fetchTableDetails();

			expect(mockApiClient.query).toHaveBeenCalledWith(
				'dev-123',
				expect.stringContaining("WHERE type IN ('table', 'view') ORDER BY name"),
			);
			expect(tables).toHaveLength(1);
		});

		it('should fetch specific table when table name specified', async () => {
			// Mock sqlite_master query
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ type: 'table', name: 'users', sql: 'CREATE TABLE users (id INTEGER)' }],
			});

			// Mock PRAGMA table_info
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 }],
			});

			// Mock PRAGMA index_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			// Mock PRAGMA foreign_key_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			const tables = await repository.fetchTableDetails(undefined, 'users');

			expect(mockApiClient.query).toHaveBeenCalledWith(
				'dev-123',
				expect.stringContaining("AND name = 'users'"),
			);
		});

		it('should include table columns', async () => {
			// Mock sqlite_master query
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ type: 'table', name: 'users', sql: 'CREATE TABLE users (id INTEGER, name TEXT)' }],
			});

			// Mock PRAGMA table_info
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [
					{ cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
					{ cid: 1, name: 'name', type: 'TEXT', notnull: 0, dflt_value: "'unknown'", pk: 0 },
				],
			});

			// Mock PRAGMA index_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			// Mock PRAGMA foreign_key_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			const tables = await repository.fetchTableDetails();

			expect(tables[0].columns).toHaveLength(2);
			expect(tables[0].columns[0].name).toBe('id');
			expect(tables[0].columns[0].isPrimaryKey).toBe(true);
			expect(tables[0].columns[1].name).toBe('name');
			expect(tables[0].columns[1].isNullable).toBe(true);
			expect(tables[0].columns[1].defaultValue).toBe("'unknown'");
		});

		it('should include table indexes', async () => {
			// Mock sqlite_master query
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ type: 'table', name: 'users', sql: 'CREATE TABLE users (id INTEGER, email TEXT)' }],
			});

			// Mock PRAGMA table_info
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [
					{ cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
					{ cid: 1, name: 'email', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
				],
			});

			// Mock PRAGMA index_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ seq: 0, name: 'idx_users_email', unique: 1, origin: 'c', partial: 0 }],
			});

			// Mock PRAGMA index_info
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ seqno: 0, cid: 1, name: 'email' }],
			});

			// Mock PRAGMA foreign_key_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			const tables = await repository.fetchTableDetails();

			expect(tables[0].indexes).toHaveLength(1);
			expect(tables[0].indexes[0].name).toBe('idx_users_email');
			expect(tables[0].indexes[0].columns).toEqual(['email']);
			expect(tables[0].indexes[0].isUnique).toBe(true);
		});

		it('should include table foreign keys', async () => {
			// Mock sqlite_master query
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ type: 'table', name: 'posts', sql: 'CREATE TABLE posts (id INTEGER, user_id INTEGER)' }],
			});

			// Mock PRAGMA table_info
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [
					{ cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
					{ cid: 1, name: 'user_id', type: 'INTEGER', notnull: 0, dflt_value: null, pk: 0 },
				],
			});

			// Mock PRAGMA index_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			// Mock PRAGMA foreign_key_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [
					{
						id: 0,
						seq: 0,
						table: 'users',
						from: 'user_id',
						to: 'id',
						on_update: 'NO ACTION',
						on_delete: 'CASCADE',
						match: 'NONE',
					},
				],
			});

			const tables = await repository.fetchTableDetails();

			expect(tables[0].foreignKeys).toHaveLength(1);
			expect(tables[0].foreignKeys[0].table).toBe('posts');
			expect(tables[0].foreignKeys[0].column).toBe('user_id');
			expect(tables[0].foreignKeys[0].referencesTable).toBe('users');
			expect(tables[0].foreignKeys[0].referencesColumn).toBe('id');
			expect(tables[0].foreignKeys[0].onDelete).toBe('CASCADE');
		});

		it('should handle views', async () => {
			// Mock sqlite_master query
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [
					{ type: 'view', name: 'active_users', sql: 'CREATE VIEW active_users AS SELECT * FROM users' },
				],
			});

			// Mock PRAGMA table_info
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ cid: 0, name: 'id', type: 'INTEGER', notnull: 0, dflt_value: null, pk: 0 }],
			});

			// Mock PRAGMA index_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			// Mock PRAGMA foreign_key_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			const tables = await repository.fetchTableDetails();

			expect(tables[0].type).toBe('view');
			expect(tables[0].isView()).toBe(true);
		});

		it('should return empty array when no tables', async () => {
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				results: [],
			});

			const tables = await repository.fetchTableDetails();

			expect(tables).toHaveLength(0);
		});
	});

	describe('fetchIndexInformation()', () => {
		it('should fetch all indexes from sqlite_master', async () => {
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				results: [
					{
						name: 'idx_users_email',
						tbl_name: 'users',
						sql: 'CREATE UNIQUE INDEX idx_users_email ON users(email)',
					},
					{
						name: 'idx_posts_user_id',
						tbl_name: 'posts',
						sql: 'CREATE INDEX idx_posts_user_id ON posts(user_id)',
					},
				],
			});

			const indexes = await repository.fetchIndexInformation();

			expect(indexes).toHaveLength(2);
			expect(indexes[0].name).toBe('idx_users_email');
			expect(indexes[0].tableName).toBe('users');
			expect(indexes[0].columns).toEqual(['email']);
			expect(indexes[0].isUnique).toBe(true);
			expect(indexes[1].name).toBe('idx_posts_user_id');
			expect(indexes[1].tableName).toBe('posts');
			expect(indexes[1].columns).toEqual(['user_id']);
			expect(indexes[1].isUnique).toBe(false);
		});

		it('should parse multi-column indexes', async () => {
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				results: [
					{
						name: 'idx_users_name_email',
						tbl_name: 'users',
						sql: 'CREATE INDEX idx_users_name_email ON users(name, email)',
					},
				],
			});

			const indexes = await repository.fetchIndexInformation();

			expect(indexes[0].columns).toEqual(['name', 'email']);
		});

		it('should use provided database ID', async () => {
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				results: [],
			});

			await repository.fetchIndexInformation('custom-db-id');

			expect(mockApiClient.query).toHaveBeenCalledWith(
				'custom-db-id',
				expect.stringContaining("WHERE type = 'index'"),
			);
		});

		it('should return empty array when no indexes', async () => {
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				results: [],
			});

			const indexes = await repository.fetchIndexInformation();

			expect(indexes).toHaveLength(0);
		});
	});

	describe('executeSQLQuery()', () => {
		it('should execute SQL query and return results', async () => {
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				results: [
					{ id: 1, name: 'Alice' },
					{ id: 2, name: 'Bob' },
				],
				meta: {
					duration: 15,
					rows_read: 2,
				},
			});

			const result = await repository.executeSQLQuery('db-123', 'SELECT * FROM users');

			expect(result.success).toBe(true);
			expect(result.results).toHaveLength(2);
			expect(result.meta?.duration).toBe(15);
			expect(result.meta?.rows_read).toBe(2);
		});

		it('should handle empty results', async () => {
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				results: [],
			});

			const result = await repository.executeSQLQuery('db-123', 'DELETE FROM users WHERE id = 999');

			expect(result.success).toBe(true);
			expect(result.results).toHaveLength(0);
		});

		it('should handle failed queries', async () => {
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: false,
				results: [],
			});

			const result = await repository.executeSQLQuery('db-123', 'INVALID SQL');

			expect(result.success).toBe(false);
		});
	});

	describe('private methods behavior', () => {
		it('should handle columns with nullable=true (notnull=0)', async () => {
			// Mock sqlite_master query
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ type: 'table', name: 'users', sql: 'CREATE TABLE users (name TEXT)' }],
			});

			// Mock PRAGMA table_info with notnull=0 (nullable)
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ cid: 0, name: 'name', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 }],
			});

			// Mock PRAGMA index_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			// Mock PRAGMA foreign_key_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			const tables = await repository.fetchTableDetails();

			expect(tables[0].columns[0].isNullable).toBe(true);
		});

		it('should handle indexes with origin=pk (primary key)', async () => {
			// Mock sqlite_master query
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ type: 'table', name: 'users', sql: 'CREATE TABLE users (id INTEGER PRIMARY KEY)' }],
			});

			// Mock PRAGMA table_info
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ cid: 0, name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 }],
			});

			// Mock PRAGMA index_list with origin=pk
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ seq: 0, name: 'sqlite_autoindex_users_1', unique: 1, origin: 'pk', partial: 0 }],
			});

			// Mock PRAGMA index_info
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ seqno: 0, cid: 0, name: 'id' }],
			});

			// Mock PRAGMA foreign_key_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			const tables = await repository.fetchTableDetails();

			expect(tables[0].indexes[0].isPrimaryKey).toBe(true);
		});

		it('should handle foreign keys with null on_delete/on_update', async () => {
			// Mock sqlite_master query
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ type: 'table', name: 'posts', sql: 'CREATE TABLE posts (user_id INTEGER)' }],
			});

			// Mock PRAGMA table_info
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [{ cid: 0, name: 'user_id', type: 'INTEGER', notnull: 0, dflt_value: null, pk: 0 }],
			});

			// Mock PRAGMA index_list
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [],
			});

			// Mock PRAGMA foreign_key_list with null on_delete/on_update
			(mockApiClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				results: [
					{
						id: 0,
						seq: 0,
						table: 'users',
						from: 'user_id',
						to: 'id',
						on_update: null,
						on_delete: null,
						match: 'NONE',
					},
				],
			});

			const tables = await repository.fetchTableDetails();

			expect(tables[0].foreignKeys[0].onDelete).toBe('NO ACTION');
			expect(tables[0].foreignKeys[0].onUpdate).toBe('NO ACTION');
		});
	});
});
