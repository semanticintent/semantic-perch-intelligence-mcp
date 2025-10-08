/**
 * CloudflareD1Repository.ts
 *
 * @semantic-intent Infrastructure adapter implementing ICloudflareD1Repository port
 * Translates between Cloudflare D1 REST API and domain entities
 *
 * @observable-anchoring
 * - Uses CloudflareAPIClient for HTTP communication
 * - Parses sqlite_master schema metadata
 * - Executes PRAGMA statements for table structure
 * - Transforms API responses into domain entities
 *
 * @intent-preservation
 * - Environment semantics maintained through DatabaseConfig
 * - Schema structure captured in domain entities
 * - Database relationships expressed as domain Relationship entities
 *
 * @semantic-over-structural
 * - Focuses on schema meaning, not just structure
 * - Interprets foreign key constraints semantically
 * - Understands index purpose (PK, FK, unique)
 *
 * @immutability-protection
 * - Returns frozen domain entities
 * - No mutable state in repository
 */

import { ICloudflareD1Repository } from '../../domain/repositories/ICloudflareD1Repository';
import { DatabaseSchema } from '../../domain/entities/DatabaseSchema';
import { TableInfo } from '../../domain/entities/TableInfo';
import { Column } from '../../domain/entities/Column';
import { Index } from '../../domain/entities/Index';
import { ForeignKey } from '../../domain/entities/ForeignKey';
import { Environment } from '../../domain/value-objects/Environment';
import { CloudflareAPIClient } from '../http/CloudflareAPIClient';
import { DatabaseConfig } from '../config/DatabaseConfig';

export interface QueryResult {
	success: boolean;
	results: unknown[];
	meta?: {
		duration?: number;
		rows_read?: number;
		rows_written?: number;
	};
}

/**
 * Repository adapter for Cloudflare D1 database access
 * Implements hexagonal architecture port using D1 REST API
 */
export class CloudflareD1Repository implements ICloudflareD1Repository {
	constructor(
		private readonly apiClient: CloudflareAPIClient,
		private readonly databaseConfig: DatabaseConfig,
		private readonly environment: Environment = Environment.DEVELOPMENT,
	) {
		Object.freeze(this);
	}

	/**
	 * Fetch complete database schema for current environment
	 */
	async fetchDatabaseSchema(databaseId?: string): Promise<DatabaseSchema> {
		const dbId = databaseId ?? this.databaseConfig.getDatabaseId(this.environment);
		const dbName = this.databaseConfig.getDatabaseName(this.environment);

		const tables = await this.fetchTableDetails(dbId);

		return new DatabaseSchema(dbName, this.environment, tables, new Date());
	}

	/**
	 * Fetch detailed table information including columns, indexes, foreign keys
	 */
	async fetchTableDetails(databaseId?: string, tableName?: string): Promise<TableInfo[]> {
		const dbId = databaseId ?? this.databaseConfig.getDatabaseId(this.environment);

		// Query sqlite_master for table definitions
		const sql = tableName
			? `SELECT type, name, sql FROM sqlite_master WHERE type IN ('table', 'view') AND name = '${tableName}' ORDER BY name`
			: "SELECT type, name, sql FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name";

		const response = await this.apiClient.query(dbId, sql);

		if (!response.success || !response.results || response.results.length === 0) {
			return [];
		}

		const tables: TableInfo[] = [];

		for (const row of response.results) {
			const tableRow = row as { type: string; name: string; sql: string };
			const tableType = tableRow.type as 'table' | 'view';

			// Fetch column details using PRAGMA
			const columns = await this.fetchTableColumns(dbId, tableRow.name);

			// Fetch indexes for this table
			const indexes = await this.fetchTableIndexes(dbId, tableRow.name);

			// Fetch foreign keys for this table
			const foreignKeys = await this.fetchTableForeignKeys(dbId, tableRow.name);

			const table = new TableInfo(tableRow.name, tableType, columns, indexes, foreignKeys);
			tables.push(table);
		}

		return tables;
	}

	/**
	 * Fetch index information for all tables or specific table
	 */
	async fetchIndexInformation(databaseId?: string): Promise<Index[]> {
		const dbId = databaseId ?? this.databaseConfig.getDatabaseId(this.environment);

		// Query sqlite_master for all indexes
		const sql =
			"SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL ORDER BY tbl_name, name";

		const response = await this.apiClient.query(dbId, sql);

		if (!response.success || !response.results || response.results.length === 0) {
			return [];
		}

		const indexes: Index[] = [];

		for (const row of response.results) {
			const indexRow = row as { name: string; tbl_name: string; sql: string };

			// Parse index columns from SQL
			const columns = this.parseIndexColumns(indexRow.sql);

			// Determine if unique from SQL
			const isUnique = indexRow.sql.toLowerCase().includes('unique');

			const index = new Index(indexRow.name, indexRow.tbl_name, columns, isUnique, false);
			indexes.push(index);
		}

		return indexes;
	}

	/**
	 * Execute arbitrary SQL query
	 */
	async executeSQLQuery(databaseId: string, sql: string): Promise<QueryResult> {
		const response = await this.apiClient.query(databaseId, sql);

		return {
			success: response.success,
			results: response.results ?? [],
			meta: response.meta,
		};
	}

	/**
	 * Fetch column details for a specific table using PRAGMA
	 */
	private async fetchTableColumns(databaseId: string, tableName: string): Promise<Column[]> {
		const sql = `PRAGMA table_info('${tableName}')`;
		const response = await this.apiClient.query(databaseId, sql);

		if (!response.success || !response.results || response.results.length === 0) {
			return [];
		}

		const columns: Column[] = [];

		for (const row of response.results) {
			const colRow = row as {
				cid: number;
				name: string;
				type: string;
				notnull: number;
				dflt_value: string | null;
				pk: number;
			};

			const column = new Column(
				colRow.name,
				colRow.type,
				colRow.pk === 1, // isPrimaryKey
				colRow.notnull === 0, // isNullable (notnull=0 means nullable)
				colRow.dflt_value, // defaultValue
			);

			columns.push(column);
		}

		return columns;
	}

	/**
	 * Fetch index information for a specific table using PRAGMA
	 */
	private async fetchTableIndexes(databaseId: string, tableName: string): Promise<Index[]> {
		const sql = `PRAGMA index_list('${tableName}')`;
		const response = await this.apiClient.query(databaseId, sql);

		if (!response.success || !response.results || response.results.length === 0) {
			return [];
		}

		const indexes: Index[] = [];

		for (const row of response.results) {
			const indexRow = row as {
				seq: number;
				name: string;
				unique: number;
				origin: string;
				partial: number;
			};

			// Fetch columns in this index
			const columns = await this.fetchIndexColumns(databaseId, indexRow.name);

			const index = new Index(
				indexRow.name,
				tableName,
				columns,
				indexRow.unique === 1, // isUnique
				indexRow.origin === 'pk', // isPrimaryKey
			);

			indexes.push(index);
		}

		return indexes;
	}

	/**
	 * Fetch column names for a specific index using PRAGMA
	 */
	private async fetchIndexColumns(databaseId: string, indexName: string): Promise<string[]> {
		const sql = `PRAGMA index_info('${indexName}')`;
		const response = await this.apiClient.query(databaseId, sql);

		if (!response.success || !response.results || response.results.length === 0) {
			return [];
		}

		const columns: string[] = [];

		for (const row of response.results) {
			const colRow = row as { seqno: number; cid: number; name: string };
			columns.push(colRow.name);
		}

		return columns;
	}

	/**
	 * Fetch foreign key constraints for a specific table using PRAGMA
	 */
	private async fetchTableForeignKeys(databaseId: string, tableName: string): Promise<ForeignKey[]> {
		const sql = `PRAGMA foreign_key_list('${tableName}')`;
		const response = await this.apiClient.query(databaseId, sql);

		if (!response.success || !response.results || response.results.length === 0) {
			return [];
		}

		const foreignKeys: ForeignKey[] = [];

		for (const row of response.results) {
			const fkRow = row as {
				id: number;
				seq: number;
				table: string;
				from: string;
				to: string;
				on_update: string;
				on_delete: string;
				match: string;
			};

			const foreignKey = new ForeignKey(
				tableName,
				fkRow.from,
				fkRow.table,
				fkRow.to,
				fkRow.on_delete ?? 'NO ACTION',
				fkRow.on_update ?? 'NO ACTION',
			);

			foreignKeys.push(foreignKey);
		}

		return foreignKeys;
	}

	/**
	 * Parse column names from index CREATE INDEX SQL statement
	 */
	private parseIndexColumns(sql: string): string[] {
		// Extract column names from CREATE INDEX statement
		// Example: CREATE INDEX idx_users_email ON users(email)
		// Example: CREATE UNIQUE INDEX idx_users_username ON users(username, status)

		const match = sql.match(/\(([^)]+)\)/);
		if (!match) {
			return [];
		}

		const columnsStr = match[1];
		return columnsStr.split(',').map((col) => col.trim());
	}
}
