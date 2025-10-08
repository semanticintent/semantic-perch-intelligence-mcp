"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareD1Repository = void 0;
const DatabaseSchema_1 = require("../../domain/entities/DatabaseSchema");
const TableInfo_1 = require("../../domain/entities/TableInfo");
const Column_1 = require("../../domain/entities/Column");
const Index_1 = require("../../domain/entities/Index");
const ForeignKey_1 = require("../../domain/entities/ForeignKey");
const Environment_1 = require("../../domain/value-objects/Environment");
/**
 * Repository adapter for Cloudflare D1 database access
 * Implements hexagonal architecture port using D1 REST API
 */
class CloudflareD1Repository {
    apiClient;
    databaseConfig;
    environment;
    constructor(apiClient, databaseConfig, environment = Environment_1.Environment.DEVELOPMENT) {
        this.apiClient = apiClient;
        this.databaseConfig = databaseConfig;
        this.environment = environment;
        Object.freeze(this);
    }
    /**
     * Fetch complete database schema for current environment
     */
    async fetchDatabaseSchema(databaseId) {
        const dbId = databaseId ?? this.databaseConfig.getDatabaseId(this.environment);
        const dbName = this.databaseConfig.getDatabaseName(this.environment);
        const tables = await this.fetchTableDetails(dbId);
        return new DatabaseSchema_1.DatabaseSchema(dbName, this.environment, tables, new Date());
    }
    /**
     * Fetch detailed table information including columns, indexes, foreign keys
     */
    async fetchTableDetails(databaseId, tableName) {
        const dbId = databaseId ?? this.databaseConfig.getDatabaseId(this.environment);
        // Query sqlite_master for table definitions
        const sql = tableName
            ? `SELECT type, name, sql FROM sqlite_master WHERE type IN ('table', 'view') AND name = '${tableName}' ORDER BY name`
            : "SELECT type, name, sql FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name";
        const response = await this.apiClient.query(dbId, sql);
        if (!response.success || !response.results || response.results.length === 0) {
            return [];
        }
        const tables = [];
        for (const row of response.results) {
            const tableRow = row;
            const tableType = tableRow.type;
            // Fetch column details using PRAGMA
            const columns = await this.fetchTableColumns(dbId, tableRow.name);
            // Fetch indexes for this table
            const indexes = await this.fetchTableIndexes(dbId, tableRow.name);
            // Fetch foreign keys for this table
            const foreignKeys = await this.fetchTableForeignKeys(dbId, tableRow.name);
            const table = new TableInfo_1.TableInfo(tableRow.name, tableType, columns, indexes, foreignKeys);
            tables.push(table);
        }
        return tables;
    }
    /**
     * Fetch index information for all tables or specific table
     */
    async fetchIndexInformation(databaseId) {
        const dbId = databaseId ?? this.databaseConfig.getDatabaseId(this.environment);
        // Query sqlite_master for all indexes
        const sql = "SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL ORDER BY tbl_name, name";
        const response = await this.apiClient.query(dbId, sql);
        if (!response.success || !response.results || response.results.length === 0) {
            return [];
        }
        const indexes = [];
        for (const row of response.results) {
            const indexRow = row;
            // Parse index columns from SQL
            const columns = this.parseIndexColumns(indexRow.sql);
            // Determine if unique from SQL
            const isUnique = indexRow.sql.toLowerCase().includes('unique');
            const index = new Index_1.Index(indexRow.name, indexRow.tbl_name, columns, isUnique, false);
            indexes.push(index);
        }
        return indexes;
    }
    /**
     * Execute arbitrary SQL query
     */
    async executeSQLQuery(databaseId, sql) {
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
    async fetchTableColumns(databaseId, tableName) {
        const sql = `PRAGMA table_info('${tableName}')`;
        const response = await this.apiClient.query(databaseId, sql);
        if (!response.success || !response.results || response.results.length === 0) {
            return [];
        }
        const columns = [];
        for (const row of response.results) {
            const colRow = row;
            const column = new Column_1.Column(colRow.name, colRow.type, colRow.pk === 1, // isPrimaryKey
            colRow.notnull === 0, // isNullable (notnull=0 means nullable)
            colRow.dflt_value);
            columns.push(column);
        }
        return columns;
    }
    /**
     * Fetch index information for a specific table using PRAGMA
     */
    async fetchTableIndexes(databaseId, tableName) {
        const sql = `PRAGMA index_list('${tableName}')`;
        const response = await this.apiClient.query(databaseId, sql);
        if (!response.success || !response.results || response.results.length === 0) {
            return [];
        }
        const indexes = [];
        for (const row of response.results) {
            const indexRow = row;
            // Fetch columns in this index
            const columns = await this.fetchIndexColumns(databaseId, indexRow.name);
            const index = new Index_1.Index(indexRow.name, tableName, columns, indexRow.unique === 1, // isUnique
            indexRow.origin === 'pk');
            indexes.push(index);
        }
        return indexes;
    }
    /**
     * Fetch column names for a specific index using PRAGMA
     */
    async fetchIndexColumns(databaseId, indexName) {
        const sql = `PRAGMA index_info('${indexName}')`;
        const response = await this.apiClient.query(databaseId, sql);
        if (!response.success || !response.results || response.results.length === 0) {
            return [];
        }
        const columns = [];
        for (const row of response.results) {
            const colRow = row;
            columns.push(colRow.name);
        }
        return columns;
    }
    /**
     * Fetch foreign key constraints for a specific table using PRAGMA
     */
    async fetchTableForeignKeys(databaseId, tableName) {
        const sql = `PRAGMA foreign_key_list('${tableName}')`;
        const response = await this.apiClient.query(databaseId, sql);
        if (!response.success || !response.results || response.results.length === 0) {
            return [];
        }
        const foreignKeys = [];
        for (const row of response.results) {
            const fkRow = row;
            const foreignKey = new ForeignKey_1.ForeignKey(tableName, fkRow.from, fkRow.table, fkRow.to, fkRow.on_delete ?? 'NO ACTION', fkRow.on_update ?? 'NO ACTION');
            foreignKeys.push(foreignKey);
        }
        return foreignKeys;
    }
    /**
     * Parse column names from index CREATE INDEX SQL statement
     */
    parseIndexColumns(sql) {
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
exports.CloudflareD1Repository = CloudflareD1Repository;
//# sourceMappingURL=CloudflareD1Repository.js.map