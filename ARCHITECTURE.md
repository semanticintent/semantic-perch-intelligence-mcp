# 🏛️ Architecture Documentation

## Overview

**Semantic D1 MCP** implements **Domain-Driven Hexagonal Architecture** (Ports and Adapters) to achieve clean separation of concerns, testability, and semantic intent preservation.

This document explains the architectural patterns, layer responsibilities, and design decisions that make this a reference implementation for semantic intent principles.

---

## Table of Contents

- [Hexagonal Architecture](#hexagonal-architecture)
- [Layer Responsibilities](#layer-responsibilities)
- [Domain-Driven Design](#domain-driven-design)
- [Semantic Intent Patterns](#semantic-intent-patterns)
- [Dependency Flow](#dependency-flow)
- [Testing Strategy](#testing-strategy)

---

## Hexagonal Architecture

### Visual Representation

```
┌──────────────────────────────────────────────────────────────┐
│                     External World                            │
│  (Claude Desktop, MCP Clients, HTTP Requests)                │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                         │
│                  (MCP Protocol Adapters)                     │
│                                                              │
│  ┌────────────────┐          ┌──────────────────┐          │
│  │  MCPServer     │          │  ToolRegistry    │          │
│  │  - Tool defs   │          │  - 6 MCP tools   │          │
│  │  - Routing     │          │  - Validation    │          │
│  └────────────────┘          └──────────────────┘          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│                (Orchestration & Use Cases)                   │
│                                                              │
│  ┌──────────────────┐  ┌─────────────────────────┐         │
│  │ Use Cases        │  │ Handlers                │         │
│  │ - AnalyzeSchema  │  │ - MCPToolHandler        │         │
│  │ - GetRelations   │  │ - SchemaQueryHandler    │         │
│  │ - Optimize       │  │                         │         │
│  └──────────────────┘  └─────────────────────────┘         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                            │
│                   (Business Logic)                           │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │ Entities                                     │           │
│  │ - DatabaseSchema (name, environment, tables) │           │
│  │ - TableInfo (columns, indexes, foreign keys) │           │
│  │ - Relationship (from/to tables, semantics)   │           │
│  │ - Optimization (recommendations)             │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │ Services (Pure Business Logic)               │           │
│  │ - SchemaAnalyzer                             │           │
│  │ - RelationshipAnalyzer                       │           │
│  │ - OptimizationService                        │           │
│  │ - ValidationService                          │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │ Ports (Interfaces)                           │           │
│  │ - ICloudflareD1Repository                    │           │
│  │ - ICacheProvider                             │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                         │
│              (Technical Implementations)                     │
│                                                              │
│  ┌──────────────────┐        ┌──────────────────┐          │
│  │ Adapters         │        │ HTTP Client      │          │
│  │ - CloudflareD1   │        │ - API calls      │          │
│  │   Repository     │        │ - Auth headers   │          │
│  │ - InMemoryCache  │        │ - Error handling │          │
│  └──────────────────┘        └──────────────────┘          │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │ Configuration                                │           │
│  │ - DatabaseConfig (env-based routing)         │           │
│  │ - CloudflareConfig (account, tokens)         │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     External Services                        │
│            (Cloudflare D1 REST API)                         │
└─────────────────────────────────────────────────────────────┘
```

### Why Hexagonal Architecture?

1. **Testability**: Domain logic can be tested without infrastructure
2. **Flexibility**: Swap D1 for PostgreSQL without touching domain code
3. **Semantic Clarity**: Clear boundaries enforce semantic intent preservation
4. **Maintainability**: Changes localized to specific layers
5. **AI-Friendly**: Clear structure helps AI understand intent

---

## Layer Responsibilities

### 1. Domain Layer (Core Business Logic)

**Location**: `src/domain/`

**Responsibility**: Pure business logic independent of infrastructure

**Semantic Intent**: Owns database schema semantics, relationships, optimization rules

#### Entities

**DatabaseSchema**
```typescript
/**
 * Semantic Intent: Complete database schema snapshot
 *
 * Observable Properties:
 * - name: Database name from D1
 * - environment: Semantic anchor (development/staging/production)
 * - tables: Collection of table metadata
 * - fetchedAt: Snapshot timestamp
 *
 * Immutability: Frozen at construction to preserve semantic intent
 */
export class DatabaseSchema {
  constructor(
    public readonly name: string,
    public readonly environment: Environment,
    public readonly tables: ReadonlyArray<TableInfo>,
    public readonly fetchedAt: Date
  ) {
    Object.freeze(this) // Prevent semantic mutation
  }
}
```

**TableInfo**
```typescript
/**
 * Semantic Intent: Table structure with semantic markers
 *
 * Observable Properties:
 * - name: Table name from sqlite_master
 * - columns: Column definitions (types, constraints)
 * - indexes: Performance optimization markers
 * - foreignKeys: Semantic relationship markers
 */
export class TableInfo {
  hasForeignKey(): boolean {
    // Observable: Foreign keys directly visible in schema
    return this.foreignKeys.length > 0
  }

  hasIndexOnColumn(columnName: string): boolean {
    // Observable: Index presence is directly observable
    return this.indexes.some(idx => idx.columns.includes(columnName))
  }
}
```

#### Services (Business Logic)

**SchemaAnalyzer**
```typescript
/**
 * Semantic Intent: Pure schema analysis logic
 *
 * NO infrastructure dependencies:
 * - No HTTP calls
 * - No D1 API
 * - No MCP protocol
 *
 * Only operates on domain entities
 */
export class SchemaAnalyzer {
  analyzeTables(tables: TableInfo[]): AnalysisResult {
    // Semantic: Table structure analysis based on observable properties
    return {
      tableCount: tables.length,
      hasPrimaryKeys: tables.every(t => t.hasPrimaryKey()),
      foreignKeyCount: tables.reduce((sum, t) => sum + t.foreignKeys.length, 0)
    }
  }
}
```

**OptimizationService**
```typescript
/**
 * Semantic Intent: Generate schema optimization recommendations
 *
 * Observable Anchoring: Based on schema structure, NOT runtime metrics
 */
export class OptimizationService {
  analyzeIndexNeeds(tables: TableInfo[], relationships: Relationship[]): Optimization[] {
    const optimizations: Optimization[] = []

    // Semantic Rule: Foreign keys SEMANTICALLY need indexes
    for (const rel of relationships) {
      const table = tables.find(t => t.name === rel.fromTable)
      if (table && !table.hasIndexOnColumn(rel.fromColumn)) {
        // Observable: Missing index is directly observable
        optimizations.push(new Optimization(
          'missing_index',
          rel.fromTable,
          'Foreign key column without index may cause slow joins',
          `CREATE INDEX idx_${rel.fromTable}_${rel.fromColumn} ON ${rel.fromTable}(${rel.fromColumn})`,
          'high'
        ))
      }
    }

    return optimizations
  }
}
```

#### Ports (Interfaces)

```typescript
/**
 * Port: Interface for database access
 *
 * Semantic Intent: Define domain needs without implementation details
 */
export interface ICloudflareD1Repository {
  fetchDatabaseSchema(databaseId: string): Promise<DatabaseSchema>
  fetchTableDetails(databaseId: string, tableName?: string): Promise<TableInfo[]>
  fetchIndexInformation(databaseId: string): Promise<Index[]>
  executeSQLQuery(databaseId: string, sql: string): Promise<QueryResult>
}
```

---

### 2. Application Layer (Orchestration)

**Location**: `src/application/`

**Responsibility**: Coordinate domain services to fulfill use cases

**Semantic Intent**: Preserve intent through transformations

#### Use Cases

**AnalyzeSchemaUseCase**
```typescript
/**
 * Use Case: Analyze database schema comprehensively
 *
 * Intent Preservation: Environment semantic maintained throughout
 */
export class AnalyzeSchemaUseCase {
  constructor(
    private readonly repository: ICloudflareD1Repository,
    private readonly schemaAnalyzer: SchemaAnalyzer,
    private readonly cache: ICacheProvider
  ) {}

  async execute(request: AnalyzeSchemaRequest): Promise<SchemaAnalysisResponse> {
    // Intent: Environment semantic drives database selection
    const databaseId = this.getDatabaseId(request.environment)

    // Cache: Performance optimization (10-minute TTL)
    const cacheKey = `schema:${request.environment}`
    const cached = await this.cache.get<DatabaseSchema>(cacheKey)
    if (cached) {
      return this.formatResponse(cached, request.includeSamples)
    }

    // Domain: Fetch and analyze
    const schema = await this.repository.fetchDatabaseSchema(databaseId)
    const analysis = this.schemaAnalyzer.analyzeTables(schema.tables)

    // Cache and return
    await this.cache.set(cacheKey, schema, 600)
    return this.formatResponse(schema, request.includeSamples)
  }

  private getDatabaseId(environment: Environment): string {
    // Semantic: Environment mapping preserved without override
    return this.config.databases[environment].id
  }
}
```

#### Handlers

**MCPToolHandler**
```typescript
/**
 * Handler: Dispatch MCP tool requests to appropriate use cases
 *
 * Semantic Intent: Translate MCP protocol to domain operations
 */
export class MCPToolHandler {
  async handleToolCall(toolName: string, arguments: unknown): Promise<ToolResult> {
    switch (toolName) {
      case 'analyze_database_schema':
        return this.analyzeSchemaUseCase.execute(arguments as AnalyzeSchemaRequest)

      case 'get_table_relationships':
        return this.getRelationshipsUseCase.execute(arguments as GetRelationshipsRequest)

      // ... other tools
    }
  }
}
```

---

### 3. Infrastructure Layer (Technical Adapters)

**Location**: `src/infrastructure/`

**Responsibility**: Implement ports using external services/APIs

**Semantic Intent**: Translate external APIs to domain concepts

#### Adapters

**CloudflareD1Repository**
```typescript
/**
 * Adapter: Implements ICloudflareD1Repository using D1 REST API
 *
 * Semantic Intent: Translate D1 API responses to domain entities
 * Observable Anchoring: Use API response properties directly
 */
export class CloudflareD1Repository implements ICloudflareD1Repository {
  constructor(
    private readonly config: CloudflareConfig,
    private readonly httpClient: CloudflareAPIClient
  ) {}

  async fetchDatabaseSchema(databaseId: string): Promise<DatabaseSchema> {
    // Infrastructure: HTTP call to D1 API
    const tables = await this.fetchTableDetails(databaseId)

    // Semantic: Preserve environment from config
    return new DatabaseSchema(
      this.getDatabaseName(databaseId),
      this.getEnvironment(databaseId),
      tables,
      new Date()
    )
  }

  async fetchTableDetails(databaseId: string, tableName?: string): Promise<TableInfo[]> {
    // Observable: sqlite_master contains schema semantics
    let query = `SELECT * FROM sqlite_master WHERE type='table'`
    if (tableName) {
      query += ` AND name='${tableName}'`
    }

    const response = await this.httpClient.query(databaseId, query)

    // Translation: API response → Domain entities
    return this.parseTableInfo(response.results)
  }

  private parseTableInfo(apiResults: unknown[]): TableInfo[] {
    return apiResults.map(row => {
      // Observable: Parse CREATE TABLE statements for semantic structure
      const columns = this.parseColumns(row.sql)
      const indexes = this.parseIndexes(row.sql)
      const foreignKeys = this.parseForeignKeys(row.sql)

      return new TableInfo(
        row.name,
        row.type as 'table' | 'view',
        columns,
        indexes,
        foreignKeys
      )
    })
  }
}
```

**CloudflareAPIClient**
```typescript
/**
 * HTTP Client: Cloudflare D1 REST API communication
 *
 * Responsibilities:
 * - Authentication (API tokens)
 * - Request formatting
 * - Error handling
 * - Rate limiting
 */
export class CloudflareAPIClient {
  async query(databaseId: string, sql: string): Promise<D1Response> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${databaseId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql })
      }
    )

    if (!response.ok) {
      throw new CloudflareAPIError(`D1 query failed: ${response.statusText}`)
    }

    return response.json()
  }
}
```

---

### 4. Presentation Layer (MCP Protocol)

**Location**: `src/presentation/`

**Responsibility**: Expose domain capabilities via MCP protocol

**Semantic Intent**: Tool definitions reflect domain operations

#### MCP Server

**MCPServer**
```typescript
/**
 * Presentation: MCP Server with tool registration
 *
 * Semantic Intent: Expose domain capabilities as MCP tools
 */
export class D1DatabaseMCPServer {
  private server: Server

  constructor(
    private readonly analyzeSchemaUseCase: AnalyzeSchemaUseCase,
    private readonly getRelationshipsUseCase: GetRelationshipsUseCase,
    private readonly validateSchemaUseCase: ValidateSchemaUseCase,
    private readonly suggestOptimizationsUseCase: SuggestOptimizationsUseCase
  ) {
    this.server = new Server({
      name: 'semantic-d1-mcp',
      version: '1.0.0'
    }, {
      capabilities: { tools: {} }
    })

    this.registerTools()
  }

  private registerTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_database_schema',
          description: 'Analyze D1 database schema structure and metadata',
          inputSchema: {
            type: 'object',
            properties: {
              environment: {
                type: 'string',
                enum: ['development', 'staging', 'production'],
                description: 'Database environment to analyze'
              },
              include_samples: {
                type: 'boolean',
                default: true
              }
            },
            required: ['environment']
          }
        }
        // ... 5 more tools
      ]
    }))

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Dispatch to use cases
      return this.toolHandler.handleToolCall(
        request.params.name,
        request.params.arguments
      )
    })
  }
}
```

---

## Domain-Driven Design

### Bounded Contexts

#### 1. Schema Context

**Ubiquitous Language**:
- Schema, Table, Column, Constraint, Index
- Primary Key, Foreign Key, Unique Constraint

**Responsibilities**:
- Schema structure analysis
- Constraint validation
- Metadata extraction

**Semantic Anchors**:
- Table semantics defined by `sqlite_master` metadata
- Column semantics from CREATE TABLE statements

#### 2. Relationship Context

**Ubiquitous Language**:
- Relationship, Foreign Key, Reference, Cascade

**Responsibilities**:
- Extract table relationships
- Analyze referential integrity
- Map dependency graphs

**Semantic Anchors**:
- Foreign keys as semantic relationship markers
- Table references preserve original intent

#### 3. Optimization Context

**Ubiquitous Language**:
- Optimization, Recommendation, Index Strategy

**Responsibilities**:
- Analyze missing indexes
- Suggest schema improvements
- Performance recommendations

**Semantic Anchors**:
- Optimizations based on observable schema patterns
- NOT based on runtime query performance (different domain)

#### 4. Environment Context

**Ubiquitous Language**:
- Environment (development, staging, production)
- Database Instance, Configuration

**Responsibilities**:
- Environment-specific database routing
- Configuration management

**Semantic Anchors**:
- Environment semantic preserved through all layers
- No cross-environment data leakage

---

## Semantic Intent Patterns

### 1. Semantic Over Structural

**Rule**: Use observable meaning, not technical characteristics

```typescript
// ✅ SEMANTIC: Based on foreign key presence (observable)
const needsIndex = table.hasForeignKey() && !table.hasIndexOnForeignKey()

// ❌ STRUCTURAL: Based on row count (derived metric)
const needsIndex = table.rowCount > 10000
```

### 2. Intent Preservation

**Rule**: Maintain semantic contracts through transformations

```typescript
// ✅ Environment semantic preserved
const schema = await repository.fetchDatabaseSchema(Environment.PRODUCTION)
// Domain layer never overrides "production" intent

// ❌ Intent override violation
if (isQuickAnalysis) {
  environment = Environment.DEVELOPMENT // Violates user intent!
}
```

### 3. Observable Anchoring

**Rule**: Base decisions on directly observable properties

```typescript
// ✅ Observable: Foreign keys visible in schema
const relationships = parseForeignKeys(createTableSQL)

// ❌ Inferred: Guessing from query patterns
const relationships = inferFromQueryLogs(logs)
```

### 4. Immutability Protection

**Rule**: Freeze entities to prevent semantic violations

```typescript
export class DatabaseSchema {
  constructor(/* ... */) {
    Object.freeze(this) // Prevent accidental mutation
  }
}
```

---

## Dependency Flow

### Dependency Inversion Principle

```
Presentation ──depends on──> Application ──depends on──> Domain
     │                            │                          ▲
     │                            │                          │
     └────────────────────────────▼──────────────────────────┘
                          Infrastructure (implements ports)
```

**Key Point**: All layers depend on Domain (abstractions), not Infrastructure (details)

### Composition Root

**src/index.ts** (Dependency Injection)

```typescript
/**
 * Composition Root: Wire all dependencies
 *
 * Semantic Intent: Single place for dependency graph
 */

// Configuration
const config = loadConfiguration()

// Infrastructure Layer
const apiClient = new CloudflareAPIClient(config.accountId, config.apiToken)
const repository = new CloudflareD1Repository(config, apiClient)
const cache = new InMemoryCacheProvider()

// Domain Layer
const schemaAnalyzer = new SchemaAnalyzer()
const relationshipAnalyzer = new RelationshipAnalyzer()
const optimizationService = new OptimizationService()

// Application Layer
const analyzeSchemaUseCase = new AnalyzeSchemaUseCase(repository, schemaAnalyzer, cache)
const getRelationshipsUseCase = new GetRelationshipsUseCase(repository, relationshipAnalyzer)
const suggestOptimizationsUseCase = new SuggestOptimizationsUseCase(repository, optimizationService)

// Presentation Layer
const mcpServer = new D1DatabaseMCPServer(
  analyzeSchemaUseCase,
  getRelationshipsUseCase,
  suggestOptimizationsUseCase
)

// Start
await mcpServer.start()
```

---

## Testing Strategy

### Layer-Specific Testing

#### Domain Layer Tests (55+ tests)

**Strategy**: Pure unit tests, no mocks needed

```typescript
describe('SchemaAnalyzer', () => {
  it('should detect tables without primary keys', () => {
    const table = new TableInfo('users', 'table',
      [new Column('name', 'TEXT', false)], // no primary key
      [], []
    )

    const analyzer = new SchemaAnalyzer()
    const result = analyzer.analyzeTables([table])

    expect(result.hasPrimaryKeys).toBe(false)
  })
})
```

#### Infrastructure Layer Tests (30+ tests)

**Strategy**: Mock HTTP responses

```typescript
describe('CloudflareD1Repository', () => {
  it('should fetch and parse table schema', async () => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({
        results: [{
          name: 'users',
          type: 'table',
          sql: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)'
        }]
      })
    }

    const repository = new CloudflareD1Repository(config, mockClient)
    const schema = await repository.fetchDatabaseSchema('test-db-id')

    expect(schema.tables).toHaveLength(1)
    expect(schema.tables[0].name).toBe('users')
  })
})
```

#### Application Layer Tests (16+ tests)

**Strategy**: Mock repository and services

```typescript
describe('AnalyzeSchemaUseCase', () => {
  it('should cache schema analysis results', async () => {
    const mockCache = new InMemoryCacheProvider()
    const useCase = new AnalyzeSchemaUseCase(mockRepository, mockAnalyzer, mockCache)

    await useCase.execute({ environment: 'production', includeSamples: true })
    await useCase.execute({ environment: 'production', includeSamples: true })

    expect(mockRepository.fetchDatabaseSchema).toHaveBeenCalledTimes(1) // Cached!
  })
})
```

#### Integration Tests (15+ tests)

**Strategy**: End-to-end with test database

```typescript
describe('End-to-End Schema Analysis', () => {
  it('should analyze schema and suggest optimizations', async () => {
    const result = await mcpServer.call('analyze_database_schema', {
      environment: 'development',
      include_samples: true
    })

    expect(result.tables).toBeDefined()
    expect(result.optimizations).toBeDefined()
  })
})
```

---

## Benefits of This Architecture

### 1. Testability
- Domain logic tested without HTTP calls
- Mock infrastructure easily
- Fast unit tests

### 2. Flexibility
- Swap D1 for PostgreSQL → only change Infrastructure
- Add new MCP tools → only change Presentation
- Change caching strategy → only change Infrastructure

### 3. Semantic Clarity
- Clear boundaries enforce intent preservation
- Observable properties explicit in domain
- Business rules centralized in services

### 4. Maintainability
- Changes localized to specific layers
- Easy to understand where logic belongs
- Refactoring safe with tests

### 5. AI-Friendly
- Clear structure helps AI understand intent
- Comments explain WHY, not just WHAT
- Semantic patterns consistent throughout

---

## Related Documentation

- [README.md](README.md) - Project overview and quick start
- [D1_MCP_REFACTORING_PLAN.md](D1_MCP_REFACTORING_PLAN.md) - Refactoring roadmap
- [SEMANTIC_ANCHORING_GOVERNANCE.md](SEMANTIC_ANCHORING_GOVERNANCE.md) - Governance rules
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

---

**This architecture demonstrates how to build maintainable, testable, AI-friendly database tools using semantic intent patterns and hexagonal architecture.** 🏛️
