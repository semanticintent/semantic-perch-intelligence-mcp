import type { DatabaseSchema } from '../entities/DatabaseSchema';
import type { Index } from '../entities/Index';
import type { TableInfo } from '../entities/TableInfo';

/**
 * 🎯 SEMANTIC INTENT: Repository port (interface) for database schema access
 *
 * WHY: Port defines domain needs without infrastructure coupling
 * - Abstracts Cloudflare D1 REST API details
 * - Domain layer depends on this interface
 * - Infrastructure layer implements this interface
 * - Enables testing with mocks/fakes
 *
 * PORT PATTERN: Interface owned by domain, implemented by infrastructure
 * DEPENDENCY INVERSION: Infrastructure depends on domain, not vice versa
 * SEMANTIC CONTRACTS: Methods express domain operations, not technical details
 */

export interface QueryResult {
  results: unknown[];
  success: boolean;
  meta?: {
    duration?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

export interface ICloudflareD1Repository {
  /**
   * Fetch complete database schema metadata
   *
   * Semantic: Get snapshot of all tables, indexes, relationships at current moment
   *
   * @param databaseId - D1 database identifier
   * @returns Complete schema aggregate root
   */
  fetchDatabaseSchema(databaseId: string): Promise<DatabaseSchema>;

  /**
   * Fetch detailed information for specific tables
   *
   * Semantic: Get table metadata (columns, indexes, foreign keys)
   *
   * @param databaseId - D1 database identifier
   * @param tableName - Optional: specific table to fetch (undefined = all tables)
   * @returns Array of table metadata
   */
  fetchTableDetails(databaseId: string, tableName?: string): Promise<TableInfo[]>;

  /**
   * Fetch index information from database
   *
   * Semantic: Get all index definitions for performance analysis
   *
   * @param databaseId - D1 database identifier
   * @returns Array of index metadata
   */
  fetchIndexInformation(databaseId: string): Promise<Index[]>;

  /**
   * Execute raw SQL query on database
   *
   * Semantic: Direct SQL access for specialized queries
   *
   * @param databaseId - D1 database identifier
   * @param sql - SQL query string
   * @returns Query result with rows and metadata
   */
  executeSQLQuery(databaseId: string, sql: string): Promise<QueryResult>;
}
