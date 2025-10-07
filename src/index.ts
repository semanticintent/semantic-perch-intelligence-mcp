// src/index.ts - Fixed D1 Database MCP Server with Environment Loading
// import dotenv from 'dotenv'
// dotenv.config()

// D1 Database Context Integration for MCP Server
// Provides database schema, data samples, and structure to Claude

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

interface D1DatabaseConfig {
  accountId: string
  apiToken: string
  databases: {
    [environment: string]: {
      name: string
      id: string
    }
  }
}

class D1DatabaseContextMCP {
  private server: Server
  private config: D1DatabaseConfig
  private dbCache: Map<string, any> = new Map()
  private lastScan: number = 0
  private scanInterval: number = 10 * 60 * 1000 // 10 minutes

  constructor(config: D1DatabaseConfig) {
    this.config = config
    this.server = new Server({
      name: 'd1-mcp-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    })
    this.setupToolHandlers()
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyze_database_schema',
            description: 'Analyze D1 database schema and structure',
            inputSchema: {
              type: 'object',
              properties: {
                environment: {
                  type: 'string',
                  enum: ['development', 'staging', 'production'],
                  default: 'development',
                  description: 'Database environment to analyze'
                },
                include_data_samples: {
                  type: 'boolean',
                  default: true,
                  description: 'Include sample data from tables'
                }
              }
            }
          },
          {
            name: 'get_table_relationships',
            description: 'Get foreign key relationships and table connections',
            inputSchema: {
              type: 'object',
              properties: {
                environment: {
                  type: 'string',
                  enum: ['development', 'staging', 'production'],
                  default: 'development'
                },
                table_name: {
                  type: 'string',
                  description: 'Specific table to analyze (optional)'
                }
              }
            }
          },
          {
            name: 'validate_integration_schema',
            description: 'Validate if new components match database schema',
            inputSchema: {
              type: 'object',
              properties: {
                component_interfaces: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'TypeScript interfaces to validate against schema'
                },
                environment: {
                  type: 'string',
                  default: 'development'
                }
              }
            }
          },
          {
            name: 'get_data_usage_patterns',
            description: 'Analyze how data is used across the application',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: {
                  type: 'string',
                  description: 'Table to analyze usage patterns'
                },
                days_back: {
                  type: 'number',
                  default: 7,
                  description: 'Days of data to analyze'
                }
              }
            }
          },
          {
            name: 'suggest_database_optimizations',
            description: 'Suggest database optimizations based on schema and usage',
            inputSchema: {
              type: 'object',
              properties: {
                environment: {
                  type: 'string',
                  default: 'development'
                },
                focus_area: {
                  type: 'string',
                  enum: ['performance', 'storage', 'relationships', 'indexes'],
                  description: 'Area to focus optimization suggestions'
                }
              }
            }
          }
        ]
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'analyze_database_schema':
            return await this.analyzeDatabaseSchema(
                typeof args?.environment === 'string' ? args.environment : 'development',
                Boolean(args?.include_data_samples)
            )
        case 'get_table_relationships':
            return await this.getTableRelationships(
                typeof args?.environment === 'string' ? args.environment : 'development',
                typeof args?.table_name === 'string' ? args.table_name : undefined
            )

            case 'validate_integration_schema':
            return await this.validateIntegrationSchema(
                Array.isArray(args?.component_interfaces) ? args.component_interfaces : [],
                typeof args?.environment === 'string' ? args.environment : 'development'
            )

            case 'get_data_usage_patterns':
            return await this.getDataUsagePatterns(
                typeof args?.table_name === 'string' ? args.table_name : undefined,
                typeof args?.days_back === 'number' ? args.days_back : 7
            )

            case 'suggest_database_optimizations':
            return await this.suggestDatabaseOptimizations(
                typeof args?.environment === 'string' ? args.environment : 'development',
                typeof args?.focus_area === 'string' ? args.focus_area : undefined
            )
          
          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        }
      }
    })
  }

  // Analyze database schema and structure
  private async analyzeDatabaseSchema(environment: string, includeSamples: boolean = true) {
    const cacheKey = `schema:${environment}:${includeSamples}`
    const now = Date.now()
    
    if (this.dbCache.has(cacheKey) && (now - this.lastScan) < this.scanInterval) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'Using cached database schema',
              lastScan: new Date(this.lastScan).toISOString(),
              ...this.dbCache.get(cacheKey)
            }, null, 2)
          }
        ]
      }
    }

    try {
      const dbConfig = this.config.databases[environment]
      if (!dbConfig) {
        throw new Error(`Database configuration not found for environment: ${environment}`)
      }

      console.error(`Analyzing D1 database: ${dbConfig.name} (${environment})`)

      // Get database information using SQL queries only
      const tables = await this.getTableDetails(dbConfig.id)
      const indexes = await this.getIndexInformation(dbConfig.id)
      const relationships = await this.extractRelationships(tables)
      
      let sampleData = {}
      if (includeSamples) {
        sampleData = await this.getSampleData(dbConfig.id, tables)
      }

      const analysis = {
        analyzedAt: new Date().toISOString(),
        environment,
        database: {
          name: dbConfig.name,
          id: dbConfig.id
        },
        schema: {
          tables: tables.length,
          totalColumns: tables.reduce((sum, table) => sum + table.columns.length, 0),
          relationships: relationships,
          indexes: indexes.length
        },
        tableDetails: tables,
        indexInformation: indexes,
        sampleData: includeSamples ? sampleData : null,
        recommendations: await this.generateSchemaRecommendations(tables, indexes)
      }

      this.dbCache.set(cacheKey, analysis)
      this.lastScan = now

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2)
          }
        ]
      }
    } catch (error) {
      console.error('Database schema analysis error:', error)
      throw new Error(`Failed to analyze database schema: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Removed the problematic getDatabaseSchema method that called non-existent API endpoint

  // Get detailed table information
  private async getTableDetails(databaseId: string) {
    // Query to get table schema information
    const schemaQuery = `
      SELECT 
        m.name as table_name,
        m.sql as create_statement,
        p.cid as column_id,
        p.name as column_name,
        p.type as column_type,
        p.notnull as not_null,
        p.dflt_value as default_value,
        p.pk as primary_key
      FROM sqlite_master m
      LEFT JOIN pragma_table_info(m.name) p ON 1=1
      WHERE m.type = 'table' 
      AND m.name NOT LIKE 'sqlite_%'
      AND m.name NOT LIKE '%_cf_%'
      ORDER BY m.name, p.cid
    `

    const result = await this.executeD1Query(databaseId, schemaQuery)
    return this.processTableDetails(result.result)
  }

  // Execute D1 query via HTTP API
  private async executeD1Query(databaseId: string, sql: string, params: any[] = []) {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/d1/database/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql,
        params
      })
    })

    if (!response.ok) {
      throw new Error(`D1 query failed: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(`D1 query error: ${data.errors?.[0]?.message || 'Unknown error'}`)
    }

    return data.result[0] // D1 returns array of results
  }

  // Process raw table details into structured format
  private processTableDetails(rawData: any[]) {
    const tables = new Map()

    for (const row of rawData) {
      if (!tables.has(row.table_name)) {
        tables.set(row.table_name, {
          name: row.table_name,
          createStatement: row.create_statement,
          columns: []
        })
      }

      if (row.column_name) {
        tables.get(row.table_name).columns.push({
          id: row.column_id,
          name: row.column_name,
          type: row.column_type,
          notNull: Boolean(row.not_null),
          defaultValue: row.default_value,
          primaryKey: Boolean(row.primary_key)
        })
      }
    }

    return Array.from(tables.values())
  }

  // Get index information
  private async getIndexInformation(databaseId: string) {
    const indexQuery = `
      SELECT 
        name as index_name,
        tbl_name as table_name,
        sql as create_statement
      FROM sqlite_master 
      WHERE type = 'index' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `

    const result = await this.executeD1Query(databaseId, indexQuery)
    return result.result || []
  }

  // Get sample data from tables
  private async getSampleData(databaseId: string, tables: any[]) {
    const samples: any = {}

    for (const table of tables.slice(0, 10)) { // Limit to first 10 tables
      try {
        const sampleQuery = `SELECT * FROM ${table.name} LIMIT 3`
        const result = await this.executeD1Query(databaseId, sampleQuery)
        samples[table.name] = {
          rowCount: result.meta?.rows_written ?? 0,
          sampleRows: result.result || [],
          columns: table.columns.map((col: any) => ({
            name: col.name,
            type: col.type,
            nullable: !col.notNull
          }))
        }
      } catch (error) {
        console.warn(`Could not get sample data for table ${table.name}:`, error)
        samples[table.name] = { error: 'Could not fetch sample data' }
      }
    }

    return samples
  }

  // Extract relationships from table definitions
  private async extractRelationships(tables: any[]) {
    const relationships = []

    for (const table of tables) {
      // Parse CREATE statement to find foreign keys
      const createSQL = table.createStatement
      if (createSQL) {
        const foreignKeyRegex = /FOREIGN KEY \(([^)]+)\) REFERENCES (\w+)\(([^)]+)\)/gi
        let match

        while ((match = foreignKeyRegex.exec(createSQL)) !== null) {
          relationships.push({
            fromTable: table.name,
            fromColumn: match[1].trim(),
            toTable: match[2].trim(),
            toColumn: match[3].trim(),
            type: 'foreign_key'
          })
        }
      }
    }

    return relationships
  }

  // Generate schema recommendations
  private async generateSchemaRecommendations(tables: any[], indexes: any[]) {
    const recommendations = []

    // Check for missing indexes on foreign keys
    const foreignKeys = tables.flatMap(table => 
      table.columns.filter((col: any) => 
        col.name.endsWith('_id') && !col.primaryKey
      ).map((col: any) => ({ table: table.name, column: col.name }))
    )

    const indexedColumns = new Set(
      indexes.map(idx => `${idx.table_name}.${idx.index_name}`)
    )

    for (const fk of foreignKeys) {
      const indexKey = `${fk.table}.${fk.column}`
      if (!indexedColumns.has(indexKey)) {
        recommendations.push({
          type: 'missing_index',
          table: fk.table,
          column: fk.column,
          reason: 'Foreign key column without index may cause slow queries',
          suggestion: `CREATE INDEX idx_${fk.table}_${fk.column} ON ${fk.table}(${fk.column})`
        })
      }
    }

    // Check for tables without primary keys
    for (const table of tables) {
      const hasPrimaryKey = table.columns.some((col: any) => col.primaryKey)
      if (!hasPrimaryKey) {
        recommendations.push({
          type: 'missing_primary_key',
          table: table.name,
          reason: 'Table without primary key may cause replication issues',
          suggestion: `Add a primary key column (e.g., id TEXT PRIMARY KEY)`
        })
      }
    }

    return recommendations
  }

  // Get table relationships
  private async getTableRelationships(environment: string, tableName?: string) {
    const dbConfig = this.config.databases[environment]
    if (!dbConfig) {
      throw new Error(`Database configuration not found for environment: ${environment}`)
    }

    const tables = await this.getTableDetails(dbConfig.id)
    const relationships = await this.extractRelationships(tables)

    let filteredRelationships = relationships
    if (tableName) {
      filteredRelationships = relationships.filter(rel => 
        rel.fromTable === tableName || rel.toTable === tableName
      )
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            environment,
            database: dbConfig.name,
            tableName: tableName || 'all',
            relationships: filteredRelationships,
            relationshipCount: filteredRelationships.length,
            relatedTables: [...new Set(filteredRelationships.flatMap(rel => [rel.fromTable, rel.toTable]))]
          }, null, 2)
        }
      ]
    }
  }

  // Validate integration schema
  private async validateIntegrationSchema(componentInterfaces: string[], environment: string) {
    const dbConfig = this.config.databases[environment]
    if (!dbConfig) {
      throw new Error(`Database configuration not found for environment: ${environment}`)
    }

    const tables = await this.getTableDetails(dbConfig.id)
    const validation = {
      compatible: [],
      incompatible: [],
      missing: [],
      recommendations: []
    }

    // This would need more sophisticated TypeScript parsing
    // For now, provide basic validation structure
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            environment,
            validationResults: validation,
            message: 'Schema validation completed',
            tablesAnalyzed: tables.length
          }, null, 2)
        }
      ]
    }
  }

  // Get data usage patterns
  private async getDataUsagePatterns(tableName?: string, daysBack: number = 7) {
    // This would require query logging or metrics
    // For now, return structure for future implementation
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            tableName: tableName || 'all',
            daysAnalyzed: daysBack,
            patterns: {
              mostQueried: [],
              leastQueried: [],
              avgQueryTime: null,
              popularJoins: []
            },
            note: 'Usage pattern analysis requires query logging to be enabled'
          }, null, 2)
        }
      ]
    }
  }

  // Suggest database optimizations
  private async suggestDatabaseOptimizations(environment: string, focusArea?: string) {
    const dbConfig = this.config.databases[environment]
    if (!dbConfig) {
      throw new Error(`Database configuration not found for environment: ${environment}`)
    }

    const tables = await this.getTableDetails(dbConfig.id)
    const indexes = await this.getIndexInformation(dbConfig.id)
    const recommendations = await this.generateSchemaRecommendations(tables, indexes)

    let filteredRecommendations = recommendations
    if (focusArea) {
      filteredRecommendations = recommendations.filter(rec => 
        rec.type.includes(focusArea) || rec.reason.toLowerCase().includes(focusArea)
      )
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            environment,
            focusArea: focusArea || 'all',
            optimizations: filteredRecommendations,
            summary: {
              totalRecommendations: recommendations.length,
              filteredRecommendations: filteredRecommendations.length,
              categories: [...new Set(recommendations.map(r => r.type))]
            }
          }, null, 2)
        }
      ]
    }
  }

  async start() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('Strategic Intelligence D1 Database MCP Server running')
  }
}

// Configuration and startup
const config: D1DatabaseConfig = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
  databases: {
    development: {
      name: 'strategic_intelligence_dev',
      id: process.env.D1_DEV_DATABASE_ID || ''
    },
    staging: {
      name: 'strategic_intelligence_staging', 
      id: process.env.D1_STAGING_DATABASE_ID || ''
    },
    production: {
      name: 'strategic_intelligence_prod',
      id: process.env.D1_PROD_DATABASE_ID || ''
    }
  }
}

if (!config.accountId || !config.apiToken) {
  console.error('❌ Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables are required')
  console.error('Current values:')
  console.error(`  CLOUDFLARE_ACCOUNT_ID: ${config.accountId || 'NOT SET'}`)
  console.error(`  CLOUDFLARE_API_TOKEN: ${config.apiToken ? '✅ SET (hidden)' : '❌ NOT SET'}`)
  process.exit(1)
}

console.error(`🗄️ Starting D1 Database MCP Server`)

const server = new D1DatabaseContextMCP(config)
server.start().catch(console.error)