# 🏗️ D1 MCP Server - Semantic Intent Refactoring Plan

> **Reference Implementation Plan**: Applying Semantic Intent as Single Source of Truth patterns to D1 Database MCP Server

---

## 📋 Executive Summary

**Current State**: Monolithic 629-line TypeScript file with no tests, documentation, or version control
**Target State**: Production-grade semantic intent reference implementation matching semantic-context-mcp standards
**Estimated Effort**: 12-16 hours of focused implementation
**Target Repository**: `https://github.com/semanticintent/semantic-d1-mcp`

---

## 🎯 Semantic Intent Guidelines to Apply

### **Core Principles** (from semantic-context-mcp)

1. **Semantic Over Structural**
   - Database schema analysis based on **semantic meaning** (table purpose, relationships)
   - NOT based on technical characteristics (row count, table size)

2. **Intent Preservation**
   - Database schema metadata maintains semantic contracts
   - Transformations preserve original intent (development vs production schemas)

3. **Observable Anchoring**
   - Base decisions on **directly observable properties** (table names, foreign keys, indexes)
   - Avoid derived behavioral triggers

4. **Domain Boundaries**
   - Clear separation: Database Schema Domain ≠ Query Optimization Domain ≠ MCP Protocol Domain

### **Architectural Standards**

- ✅ **Hexagonal (Ports & Adapters) Architecture**
- ✅ **Domain-Driven Design** with bounded contexts
- ✅ **70+ comprehensive unit tests** (target coverage: 90%+)
- ✅ **GitHub Actions CI/CD** with type-check, tests, coverage
- ✅ **Comprehensive documentation** (README, ARCHITECTURE, CONTRIBUTING, SECURITY)
- ✅ **Semantic Intent badges** and reference implementation status

---

## 📊 Current State Analysis

### **What Exists** ✅
```
d1-mcp-server/
├── src/
│   └── index.ts                    # 629 lines - everything in one file
├── package.json                     # Basic dependencies
├── tsconfig.json                    # TypeScript config (strict mode)
├── .env.example                     # Environment variables template
└── start-d1-mcp.sh                  # Startup script
```

### **What's Missing** ❌
- ❌ No README.md
- ❌ No tests (0% coverage)
- ❌ No git repository
- ❌ No CI/CD pipeline
- ❌ No architectural documentation
- ❌ No contribution guidelines
- ❌ No security policy
- ❌ No hexagonal architecture
- ❌ No domain-driven design
- ❌ No semantic intent governance

### **Current Capabilities** (6 MCP Tools)
1. `analyze_database_schema` - Schema analysis with sample data
2. `get_table_relationships` - Foreign key relationships
3. `validate_integration_schema` - TypeScript interface validation
4. `get_data_usage_patterns` - Usage pattern analysis (stubbed)
5. `suggest_database_optimizations` - Schema optimization recommendations
6. `get_index_information` - Index analysis

---

## 🏛️ Target Hexagonal Architecture

### **Proposed Structure**

```
src/
├── domain/                          # 🎯 DOMAIN LAYER - Business Logic
│   ├── entities/
│   │   ├── DatabaseSchema.ts        # Schema entity with validation
│   │   ├── TableInfo.ts             # Table metadata entity
│   │   ├── Relationship.ts          # Foreign key relationship
│   │   ├── Index.ts                 # Index information
│   │   └── Optimization.ts          # Optimization recommendation
│   ├── value-objects/
│   │   ├── Environment.ts           # Environment enum (dev/staging/prod)
│   │   ├── TableName.ts             # Validated table name
│   │   └── ColumnType.ts            # SQL column types
│   ├── repositories/
│   │   └── ICloudflareD1Repository.ts  # Port (interface)
│   └── services/
│       ├── SchemaAnalyzer.ts        # Schema analysis business logic
│       ├── RelationshipAnalyzer.ts  # Relationship extraction logic
│       ├── OptimizationService.ts   # Optimization recommendation logic
│       └── ValidationService.ts     # TypeScript interface validation
│
├── application/                     # 🎬 APPLICATION LAYER - Orchestration
│   ├── handlers/
│   │   ├── MCPToolHandler.ts        # MCP tool execution dispatcher
│   │   └── SchemaQueryHandler.ts   # Schema query orchestration
│   ├── ports/
│   │   └── ICacheProvider.ts        # Cache port (interface)
│   └── use-cases/
│       ├── AnalyzeSchemaUseCase.ts
│       ├── GetRelationshipsUseCase.ts
│       ├── ValidateSchemaUseCase.ts
│       └── SuggestOptimizationsUseCase.ts
│
├── infrastructure/                  # 🔧 INFRASTRUCTURE LAYER - Technical Adapters
│   ├── adapters/
│   │   ├── CloudflareD1Repository.ts   # Cloudflare D1 REST API adapter
│   │   └── InMemoryCacheProvider.ts    # Cache implementation
│   ├── config/
│   │   ├── DatabaseConfig.ts           # Environment-based config
│   │   └── CloudflareConfig.ts         # Account/API token config
│   └── http/
│       └── CloudflareAPIClient.ts      # HTTP client for D1 API
│
├── presentation/                    # 🎨 PRESENTATION LAYER - MCP Protocol
│   ├── mcp/
│   │   ├── MCPServer.ts             # MCP server initialization
│   │   └── ToolRegistry.ts          # Tool registration
│   └── dto/
│       ├── SchemaResponseDTO.ts     # Schema analysis response
│       ├── RelationshipResponseDTO.ts
│       └── OptimizationResponseDTO.ts
│
├── types.ts                         # Shared types
└── index.ts                         # Composition root (dependency injection)
```

### **Layer Responsibilities**

#### **Domain Layer** (Business Logic - Framework Independent)
**Semantic Intent**: Owns database schema semantics, relationships, and optimization rules

- **Entities**: Schema, Table, Relationship, Index
- **Value Objects**: Environment, TableName, ColumnType (immutable, validated)
- **Services**: Pure business logic for schema analysis
- **NO external dependencies** (no HTTP, no D1 API, no MCP protocol)

**Example Semantic Anchoring**:
```typescript
// ✅ SEMANTIC: Based on observable schema properties
class OptimizationService {
  analyzeIndexNeeds(table: TableInfo): Optimization[] {
    // Semantic: Foreign keys SEMANTICALLY need indexes
    if (table.hasForeignKey() && !table.hasIndexOnForeignKey()) {
      return [new MissingIndexOptimization(table.foreignKeyColumn)]
    }
  }
}
```

#### **Application Layer** (Orchestration - Use Cases)
**Semantic Intent**: Coordinates domain services to fulfill MCP tool requests

- **Use Cases**: High-level workflows (AnalyzeSchemaUseCase)
- **Handlers**: Translate MCP requests to domain operations
- **Ports**: Interfaces for infrastructure dependencies

**Example Intent Preservation**:
```typescript
// ✅ INTENT PRESERVED: Environment semantic maintained through transformation
class AnalyzeSchemaUseCase {
  async execute(request: { environment: Environment }): Promise<SchemaAnalysis> {
    // Intent: "development" schema analysis preserves semantic meaning
    const schema = await this.repository.fetchSchema(request.environment)
    return this.analyzer.analyze(schema) // Domain logic, no environment override
  }
}
```

#### **Infrastructure Layer** (Technical Adapters)
**Semantic Intent**: Implements ports, translates external APIs to domain concepts

- **Adapters**: Cloudflare D1 REST API implementation
- **Config**: Environment-based configuration
- **NO business logic** - pure translation

**Example Observable Anchoring**:
```typescript
// ✅ OBSERVABLE: Uses directly observable API response properties
class CloudflareD1Repository implements ICloudflareD1Repository {
  async fetchTableSchema(databaseId: string): Promise<TableInfo[]> {
    const response = await this.apiClient.query(`SELECT * FROM sqlite_master`)
    // Observable: Table names, types directly from sqlite_master
    return response.results.map(row => new TableInfo(row.name, row.type))
  }
}
```

#### **Presentation Layer** (MCP Protocol)
**Semantic Intent**: MCP tool definitions and response formatting

- **MCPServer**: Tool registration and protocol handling
- **DTOs**: Response shape for MCP clients

---

## 🎯 Domain-Driven Design: Bounded Contexts

### **1. Database Schema Context**
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

### **2. Relationship Context**
**Ubiquitous Language**:
- Relationship, Foreign Key, Reference, Cascade

**Responsibilities**:
- Extract table relationships
- Analyze referential integrity
- Map dependency graphs

**Semantic Anchors**:
- Foreign keys as semantic relationship markers
- Table references preserve original intent

### **3. Optimization Context**
**Ubiquitous Language**:
- Optimization, Recommendation, Index Strategy, Query Performance

**Responsibilities**:
- Analyze missing indexes
- Suggest schema improvements
- Performance recommendations

**Semantic Anchors**:
- Optimizations based on observable schema patterns
- NOT based on runtime query performance (different domain)

### **4. Environment Context**
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

## 📝 Implementation Plan

### **Phase 1: Foundation & Setup** (2-3 hours)

#### **1.1 Git Initialization**
```bash
cd /c/workspace/dev-tools/d1-mcp-server
git init
git add .
git commit -m "Initial commit - monolithic codebase before refactoring"
```

#### **1.2 Create Core Documentation**
- [ ] **README.md** - Following semantic-context-mcp template
  - Badges: License, CI, Tests, TypeScript, Semantic Intent, Reference Implementation
  - Quick Start guide
  - Architecture overview
  - Features (6 MCP tools)
  - Connection instructions (Claude Desktop, Cloudflare Playground)

- [ ] **ARCHITECTURE.md** - Hexagonal architecture documentation
  - Layer diagrams
  - Semantic intent anchoring examples
  - Domain boundaries
  - Ports & Adapters pattern

- [ ] **CONTRIBUTING.md** - Contribution guidelines
  - How to contribute
  - Semantic intent compliance
  - Testing requirements
  - PR process

- [ ] **SECURITY.md** - Security policy
  - Secrets management (API tokens, database IDs)
  - Vulnerability reporting
  - Security checklist

- [ ] **CODE_OF_CONDUCT.md** - Community standards

- [ ] **LICENSE** - MIT License

- [ ] **SEMANTIC_ANCHORING_GOVERNANCE.md** - D1-specific governance
  - Database schema semantic rules
  - Environment semantic preservation
  - Optimization anchoring patterns

#### **1.3 Update package.json**
```json
{
  "name": "@semanticintent/semantic-d1-mcp",
  "version": "1.0.0",
  "description": "Reference implementation of Semantic Intent patterns for D1 Database introspection via MCP",
  "keywords": [
    "mcp",
    "semantic-intent",
    "d1-database",
    "cloudflare",
    "database-introspection",
    "schema-analysis"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/semanticintent/semantic-d1-mcp.git"
  },
  "scripts": {
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write ."
  }
}
```

#### **1.4 Add Testing Infrastructure**
- [ ] Install Vitest, coverage tools
- [ ] Install Biome for linting/formatting
- [ ] Create `vitest.config.ts`
- [ ] Create `.github/workflows/ci.yml` (GitHub Actions)

---

### **Phase 2: Domain Layer Implementation** (3-4 hours)

#### **2.1 Create Domain Entities**

**src/domain/entities/DatabaseSchema.ts**
```typescript
/**
 * Semantic Intent: Represents complete database schema structure
 *
 * Observable Properties:
 * - Schema name (directly from D1 API)
 * - Environment (dev/staging/prod - semantic anchor)
 * - Tables collection (observable table metadata)
 *
 * Immutability: Schema snapshots are frozen at fetch time
 */
export class DatabaseSchema {
  constructor(
    public readonly name: string,
    public readonly environment: Environment,
    public readonly tables: ReadonlyArray<TableInfo>,
    public readonly fetchedAt: Date
  ) {
    Object.freeze(this) // Intent: Prevent semantic mutation
  }

  getTableByName(name: string): TableInfo | undefined {
    // Semantic: Table lookup based on observable name property
    return this.tables.find(t => t.name === name)
  }

  getRelatedTables(tableName: string): TableInfo[] {
    // Semantic: Relationships based on foreign key references
    return this.tables.filter(t =>
      t.foreignKeys.some(fk => fk.referencesTable === tableName)
    )
  }
}
```

**src/domain/entities/TableInfo.ts**
```typescript
/**
 * Semantic Intent: Table metadata with structural and semantic information
 *
 * Observable Properties:
 * - name: Table name from sqlite_master
 * - columns: Column definitions (observable schema)
 * - indexes: Index definitions (observable optimization markers)
 * - foreignKeys: Relationship markers (semantic connections)
 */
export class TableInfo {
  constructor(
    public readonly name: string,
    public readonly type: 'table' | 'view',
    public readonly columns: ReadonlyArray<Column>,
    public readonly indexes: ReadonlyArray<Index>,
    public readonly foreignKeys: ReadonlyArray<ForeignKey>
  ) {
    Object.freeze(this)
  }

  hasPrimaryKey(): boolean {
    // Observable: Primary key presence is directly observable
    return this.columns.some(col => col.isPrimaryKey)
  }

  hasForeignKey(): boolean {
    // Observable: Foreign keys are directly observable
    return this.foreignKeys.length > 0
  }

  hasIndexOnColumn(columnName: string): boolean {
    // Observable: Index existence is directly observable
    return this.indexes.some(idx => idx.columns.includes(columnName))
  }
}
```

**src/domain/entities/Relationship.ts**
```typescript
/**
 * Semantic Intent: Foreign key relationship between tables
 *
 * Semantic Anchoring: Relationships preserve referential integrity intent
 */
export class Relationship {
  constructor(
    public readonly fromTable: string,
    public readonly fromColumn: string,
    public readonly toTable: string,
    public readonly toColumn: string,
    public readonly onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | null
  ) {
    Object.freeze(this)
  }

  isRequired(): boolean {
    // Semantic: RESTRICT/CASCADE implies required relationship
    return this.onDelete === 'RESTRICT' || this.onDelete === 'CASCADE'
  }
}
```

**src/domain/entities/Optimization.ts**
```typescript
/**
 * Semantic Intent: Database optimization recommendation
 *
 * Observable Anchoring: Based on schema patterns, not runtime metrics
 */
export class Optimization {
  constructor(
    public readonly type: 'missing_index' | 'missing_primary_key' | 'inefficient_type',
    public readonly table: string,
    public readonly reason: string,
    public readonly suggestion: string,
    public readonly priority: 'high' | 'medium' | 'low'
  ) {
    Object.freeze(this)
  }
}
```

#### **2.2 Create Domain Services** (Business Logic)

**src/domain/services/SchemaAnalyzer.ts**
```typescript
/**
 * Semantic Intent: Pure business logic for schema analysis
 *
 * Domain Rules:
 * - Tables without primary keys are semantically incomplete
 * - Foreign key columns without indexes violate performance semantics
 * - Sample data preserves type semantics
 */
export class SchemaAnalyzer {
  analyzeTables(tables: TableInfo[]): AnalysisResult {
    // Pure domain logic - no infrastructure dependencies
  }

  extractSampleData(table: TableInfo, rows: unknown[]): SampleData {
    // Semantic: Sample data represents table content semantics
  }
}
```

**src/domain/services/RelationshipAnalyzer.ts**
```typescript
/**
 * Semantic Intent: Extract and analyze table relationships
 *
 * Semantic Anchoring: Relationships based on observable foreign keys
 */
export class RelationshipAnalyzer {
  extractRelationships(tables: TableInfo[]): Relationship[] {
    // Observable: Foreign keys are direct relationship markers
  }

  buildDependencyGraph(relationships: Relationship[]): DependencyGraph {
    // Semantic: Graph preserves referential integrity semantics
  }
}
```

**src/domain/services/OptimizationService.ts**
```typescript
/**
 * Semantic Intent: Generate schema optimization recommendations
 *
 * Observable Anchoring: Based on schema structure, NOT query patterns
 */
export class OptimizationService {
  analyzeIndexNeeds(tables: TableInfo[], relationships: Relationship[]): Optimization[] {
    const optimizations: Optimization[] = []

    // Semantic Rule: Foreign keys SEMANTICALLY need indexes
    for (const rel of relationships) {
      const table = tables.find(t => t.name === rel.fromTable)
      if (table && !table.hasIndexOnColumn(rel.fromColumn)) {
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

  checkPrimaryKeys(tables: TableInfo[]): Optimization[] {
    // Semantic Rule: Tables without primary keys violate relational semantics
  }
}
```

#### **2.3 Create Domain Repositories (Ports)**

**src/domain/repositories/ICloudflareD1Repository.ts**
```typescript
/**
 * Port: Interface for database schema access
 *
 * Semantic Intent: Abstract infrastructure details, expose domain concepts
 */
export interface ICloudflareD1Repository {
  fetchDatabaseSchema(databaseId: string): Promise<DatabaseSchema>
  fetchTableDetails(databaseId: string, tableName?: string): Promise<TableInfo[]>
  fetchIndexInformation(databaseId: string): Promise<Index[]>
  executeSQLQuery(databaseId: string, sql: string): Promise<QueryResult>
}
```

#### **2.4 Write Domain Tests** (30+ tests)

**Tests to Create**:
- [ ] `DatabaseSchema.test.ts` (10 tests)
  - Table lookup by name
  - Related tables extraction
  - Immutability protection

- [ ] `TableInfo.test.ts` (8 tests)
  - Primary key detection
  - Foreign key detection
  - Index lookup
  - Immutability

- [ ] `SchemaAnalyzer.test.ts` (15 tests)
  - Table analysis
  - Sample data extraction
  - Type inference

- [ ] `RelationshipAnalyzer.test.ts` (12 tests)
  - Relationship extraction
  - Dependency graph building
  - Circular dependency detection

- [ ] `OptimizationService.test.ts` (10 tests)
  - Missing index detection
  - Primary key checks
  - Optimization prioritization

**Target**: 55+ domain layer tests

---

### **Phase 3: Infrastructure Layer Implementation** (2-3 hours)

#### **3.1 Create Cloudflare D1 Adapter**

**src/infrastructure/adapters/CloudflareD1Repository.ts**
```typescript
/**
 * Adapter: Implements ICloudflareD1Repository using Cloudflare D1 REST API
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
    const query = `SELECT * FROM sqlite_master WHERE type='table'`
    const response = await this.httpClient.query(databaseId, query)

    // Translation: API response → Domain entities
    return this.parseTableInfo(response.results)
  }

  private parseTableInfo(apiResults: unknown[]): TableInfo[] {
    // Observable: Parse CREATE TABLE statements for semantic structure
  }
}
```

#### **3.2 Create Infrastructure Tests** (25+ tests)

**Tests to Create**:
- [ ] `CloudflareD1Repository.test.ts` (20 tests)
  - Mock HTTP responses
  - Schema parsing
  - Error handling (API failures)
  - Environment routing

- [ ] `CloudflareAPIClient.test.ts` (10 tests)
  - HTTP request formatting
  - Authentication headers
  - Response parsing
  - Rate limiting

**Target**: 30+ infrastructure layer tests

---

### **Phase 4: Application Layer Implementation** (2 hours)

#### **4.1 Create Use Cases**

**src/application/use-cases/AnalyzeSchemaUseCase.ts**
```typescript
/**
 * Use Case: Analyze database schema and provide comprehensive report
 *
 * Semantic Intent: Coordinate domain services to fulfill schema analysis request
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

    // Cache: Avoid repeated API calls (10-minute TTL)
    const cacheKey = `schema:${request.environment}`
    const cached = await this.cache.get<DatabaseSchema>(cacheKey)
    if (cached) return this.formatResponse(cached, request.includeSamples)

    // Domain: Fetch and analyze schema
    const schema = await this.repository.fetchDatabaseSchema(databaseId)
    const analysis = this.schemaAnalyzer.analyzeTables(schema.tables)

    // Cache and return
    await this.cache.set(cacheKey, schema, 600) // 10 minutes
    return this.formatResponse(schema, request.includeSamples)
  }
}
```

#### **4.2 Create Application Tests** (15+ tests)

**Tests to Create**:
- [ ] `AnalyzeSchemaUseCase.test.ts` (5 tests)
- [ ] `GetRelationshipsUseCase.test.ts` (4 tests)
- [ ] `ValidateSchemaUseCase.test.ts` (3 tests)
- [ ] `SuggestOptimizationsUseCase.test.ts` (4 tests)

**Target**: 16+ application layer tests

---

### **Phase 5: Presentation Layer (MCP)** (2 hours)

#### **5.1 Create MCP Server**

**src/presentation/mcp/MCPServer.ts**
```typescript
/**
 * Presentation: MCP Server with tool registration
 *
 * Semantic Intent: Expose domain capabilities via MCP protocol
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
                default: true,
                description: 'Include sample data from tables'
              }
            },
            required: ['environment']
          }
        },
        // ... other 5 tools
      ]
    }))

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Dispatch to appropriate use case
      switch (request.params.name) {
        case 'analyze_database_schema':
          return this.handleAnalyzeSchema(request.params.arguments)
        // ... other tools
      }
    })
  }
}
```

#### **5.2 Create Presentation Tests** (12+ tests)

**Tests to Create**:
- [ ] `MCPServer.test.ts` (12 tests)
  - Tool registration
  - Request routing
  - Response formatting
  - Error handling

**Target**: 12+ presentation layer tests

---

### **Phase 6: Integration & Entry Point** (1 hour)

#### **6.1 Composition Root**

**src/index.ts** (Dependency Injection)
```typescript
/**
 * Composition Root: Wire all dependencies together
 *
 * Semantic Intent: Single place for dependency graph construction
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
const validationService = new ValidationService()

// Application Layer
const analyzeSchemaUseCase = new AnalyzeSchemaUseCase(repository, schemaAnalyzer, cache)
const getRelationshipsUseCase = new GetRelationshipsUseCase(repository, relationshipAnalyzer)
const validateSchemaUseCase = new ValidateSchemaUseCase(repository, validationService)
const suggestOptimizationsUseCase = new SuggestOptimizationsUseCase(repository, optimizationService)

// Presentation Layer
const mcpServer = new D1DatabaseMCPServer(
  analyzeSchemaUseCase,
  getRelationshipsUseCase,
  validateSchemaUseCase,
  suggestOptimizationsUseCase
)

// Start server
const transport = new StdioServerTransport()
await mcpServer.connect(transport)
```

#### **6.2 Integration Tests** (15+ tests)

**Tests to Create**:
- [ ] `integration.test.ts` (15 tests)
  - End-to-end schema analysis flow
  - Relationship extraction flow
  - Optimization suggestion flow
  - Error scenarios

**Target**: 15+ integration tests

---

### **Phase 7: CI/CD & Automation** (1 hour)

#### **7.1 GitHub Actions Workflow**

**.github/workflows/ci.yml**
```yaml
name: CI

on:
  push:
    branches: [ master, main ]
  pull_request:
    branches: [ master, main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Run tests
        run: npm test

      - name: Test coverage
        run: npm run test:coverage

      - name: Lint
        run: npm run lint
```

#### **7.2 Dependabot Configuration**

**.github/dependabot.yml**
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "automated"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "ci"
      - "dependencies"
```

---

### **Phase 8: Documentation Finalization** (1-2 hours)

#### **8.1 README.md** (Comprehensive)
- Badges (License, CI, Tests, TypeScript, Semantic Intent)
- Quick Start guide
- Architecture overview with diagram
- 6 MCP tools documentation
- Connection instructions (Claude Desktop, Cloudflare Playground)
- Testing guide
- Contributing section
- Security section

#### **8.2 ARCHITECTURE.md**
- Hexagonal architecture explanation
- Layer responsibilities
- Semantic intent examples per layer
- Domain-driven design bounded contexts
- Ports & Adapters pattern

#### **8.3 SEMANTIC_ANCHORING_GOVERNANCE.md**
- D1-specific semantic rules
- Observable properties (sqlite_master, foreign keys, indexes)
- Intent preservation (environment semantics)
- Domain boundaries enforcement

---

### **Phase 9: GitHub Repository Setup** (30 min)

#### **9.1 Create GitHub Repository**
1. Create `semanticintent/semantic-d1-mcp` repository
2. Update git remote
3. Push all branches

#### **9.2 Configure Repository**
- Enable GitHub Actions
- Add repository topics: `mcp`, `semantic-intent`, `d1-database`, `cloudflare`
- Add description: "Reference implementation of Semantic Intent patterns for D1 Database introspection via MCP"
- Enable Discussions
- Add issue templates (bug report, feature request)

---

## 📊 Success Metrics

### **Code Quality**
- ✅ **90%+ test coverage** (target: 95%+)
- ✅ **70+ comprehensive tests** (domain: 55, infrastructure: 30, application: 16, presentation: 12, integration: 15)
- ✅ **TypeScript strict mode** with no `any` types
- ✅ **100% CI passing** (type-check, tests, lint)

### **Architecture**
- ✅ **Hexagonal architecture** with clear layer boundaries
- ✅ **Domain-driven design** with bounded contexts
- ✅ **Ports & Adapters** pattern throughout
- ✅ **Immutability** protection on domain entities
- ✅ **Dependency injection** at composition root

### **Documentation**
- ✅ **Comprehensive README** (400+ lines)
- ✅ **Architecture documentation** (200+ lines)
- ✅ **Semantic governance** documentation (150+ lines)
- ✅ **Contributing guide** (150+ lines)
- ✅ **Security policy** (100+ lines)
- ✅ **Code of Conduct**

### **Semantic Intent Compliance**
- ✅ **Observable anchoring** examples in each layer
- ✅ **Intent preservation** through transformations
- ✅ **Semantic over structural** decision-making
- ✅ **Domain boundaries** respected
- ✅ **Reference implementation** badges and status

---

## 🚀 Execution Checklist

### **Pre-Implementation**
- [ ] Review semantic-context-mcp codebase for patterns
- [ ] Set up local development environment
- [ ] Create project timeline

### **Phase 1: Foundation** ✅
- [ ] Git initialization
- [ ] Create README.md skeleton
- [ ] Create ARCHITECTURE.md
- [ ] Create CONTRIBUTING.md
- [ ] Create SECURITY.md
- [ ] Create CODE_OF_CONDUCT.md
- [ ] Create LICENSE
- [ ] Create SEMANTIC_ANCHORING_GOVERNANCE.md
- [ ] Update package.json with metadata
- [ ] Install testing dependencies (Vitest, coverage)
- [ ] Install linting/formatting (Biome)
- [ ] Create vitest.config.ts
- [ ] Create GitHub Actions CI workflow

### **Phase 2: Domain Layer** ✅
- [ ] Create DatabaseSchema entity + tests
- [ ] Create TableInfo entity + tests
- [ ] Create Relationship entity + tests
- [ ] Create Optimization entity + tests
- [ ] Create Index entity + tests
- [ ] Create Column entity + tests
- [ ] Create SchemaAnalyzer service + tests
- [ ] Create RelationshipAnalyzer service + tests
- [ ] Create OptimizationService + tests
- [ ] Create ValidationService + tests
- [ ] Create ICloudflareD1Repository port
- [ ] Verify 55+ domain tests passing

### **Phase 3: Infrastructure Layer** ✅
- [ ] Create CloudflareAPIClient + tests
- [ ] Create CloudflareD1Repository + tests
- [ ] Create InMemoryCacheProvider + tests
- [ ] Create DatabaseConfig
- [ ] Create CloudflareConfig
- [ ] Verify 30+ infrastructure tests passing

### **Phase 4: Application Layer** ✅
- [ ] Create AnalyzeSchemaUseCase + tests
- [ ] Create GetRelationshipsUseCase + tests
- [ ] Create ValidateSchemaUseCase + tests
- [ ] Create SuggestOptimizationsUseCase + tests
- [ ] Create MCPToolHandler
- [ ] Verify 16+ application tests passing

### **Phase 5: Presentation Layer** ✅
- [ ] Create MCPServer + tests
- [ ] Create ToolRegistry
- [ ] Create response DTOs
- [ ] Verify 12+ presentation tests passing

### **Phase 6: Integration** ✅
- [ ] Create index.ts composition root
- [ ] Create integration tests (15+)
- [ ] Verify all 128+ tests passing
- [ ] Verify 90%+ coverage

### **Phase 7: CI/CD** ✅
- [ ] Create GitHub Actions workflow
- [ ] Create Dependabot config
- [ ] Verify CI passing on push
- [ ] Add status badges to README

### **Phase 8: Documentation** ✅
- [ ] Finalize README.md (400+ lines)
- [ ] Finalize ARCHITECTURE.md (200+ lines)
- [ ] Finalize SEMANTIC_ANCHORING_GOVERNANCE.md (150+ lines)
- [ ] Finalize CONTRIBUTING.md (150+ lines)
- [ ] Finalize SECURITY.md (100+ lines)
- [ ] Create CHANGELOG.md

### **Phase 9: GitHub** ✅
- [ ] Create GitHub repository
- [ ] Push code to GitHub
- [ ] Configure repository settings
- [ ] Enable GitHub Actions
- [ ] Enable Discussions
- [ ] Add topics
- [ ] Create issue templates
- [ ] Verify all badges green

---

## 🎯 Post-Implementation

### **Verification**
1. Clone fresh repository
2. Run `npm install`
3. Run `npm test` - verify 128+ tests pass
4. Run `npm run test:coverage` - verify 90%+ coverage
5. Run `npm run type-check` - verify no errors
6. Run `npm run lint` - verify no errors
7. Start MCP server and test with Claude Desktop
8. Verify all 6 tools work correctly

### **Promotion**
1. Add to semanticintent organization
2. Link from semantic-context-mcp as sibling project
3. Share in MCP community
4. Write blog post about semantic intent patterns

---

## 📚 References

- **semantic-context-mcp**: https://github.com/semanticintent/semantic-context-mcp
- **MCP Documentation**: https://modelcontextprotocol.io
- **Hexagonal Architecture**: https://alistair.cockburn.us/hexagonal-architecture/
- **Domain-Driven Design**: Eric Evans, "Domain-Driven Design"

---

**This plan ensures semantic-d1-mcp becomes a production-grade reference implementation matching semantic-context-mcp standards, demonstrating semantic intent principles through database introspection.** 🏗️

---

*Created: 2025-10-07*
*Target Completion: 12-16 hours*
*Status: Ready for Implementation*
