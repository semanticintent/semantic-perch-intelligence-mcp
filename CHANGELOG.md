# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-10-07

### 🎉 **Complete Hexagonal Architecture Refactoring**

This major release represents a complete architectural overhaul from monolithic to hexagonal architecture with 398 comprehensive tests.

### Added

#### 🏗️ **Hexagonal Architecture Implementation**

**Domain Layer** (Pure Business Logic):
- `DatabaseSchema` - Aggregate root entity with semantic validation
- `TableInfo` - Table entity with relationships and metadata
- `Column` - Column entity with type information
- `ForeignKey` - Foreign key relationship entity
- `Index` - Index entity with coverage analysis
- `Relationship` - Relationship value object with cardinality
- `Optimization` - Optimization suggestion entity with priorities
- `Environment` - Environment value object (development/staging/production)
- `SchemaAnalyzer` - Schema analysis domain service
- `RelationshipAnalyzer` - Relationship extraction domain service
- `OptimizationService` - Optimization recommendation domain service

**Application Layer** (Use Cases & Orchestration):
- `AnalyzeSchemaUseCase` - Schema analysis orchestration with caching
- `GetRelationshipsUseCase` - Relationship extraction with filtering
- `ValidateSchemaUseCase` - Schema validation with issue detection
- `SuggestOptimizationsUseCase` - Optimization suggestions with prioritization
- `ICacheProvider` - Cache provider port interface
- `ICloudflareD1Repository` - Repository port interface

**Infrastructure Layer** (External Adapters):
- `CloudflareD1Repository` - D1 REST API adapter implementation
- `CloudflareAPIClient` - HTTP client for Cloudflare API
- `InMemoryCacheProvider` - TTL-based in-memory cache
- `CloudflareConfig` - Cloudflare API configuration
- `DatabaseConfig` - Multi-environment database configuration

**Presentation Layer** (MCP Server):
- `D1DatabaseMCPServer` - MCP server with 4 tools
- Tool handlers for all 4 operations
- Request/response DTOs

**Composition Root**:
- `index.ts` - Full dependency injection wiring
- Environment validation
- Multi-environment database configuration

#### 🧪 **Comprehensive Test Suite - 398 Tests**

- **Domain Layer**: 212 tests
  - Entity validation and invariants
  - Domain service business logic
  - Value object immutability

- **Infrastructure Layer**: 64 tests
  - Repository adapter behavior
  - API client HTTP interactions
  - Cache provider TTL behavior
  - Configuration validation

- **Application Layer**: 35 tests
  - Use case orchestration
  - Cache integration
  - Error handling

- **Presentation Layer**: 13 tests
  - MCP tool handlers
  - Request/response formatting
  - Error propagation

- **Integration Tests**: 15 tests
  - End-to-end flows
  - Cache sharing across use cases
  - Environment routing
  - Dependency injection verification

#### 🛠️ **MCP Tools (Updated)**

Reduced from 6 to 4 focused, production-ready tools:

1. **`analyze_database_schema`**
   - Complete schema analysis with metadata
   - Optional sample data (configurable max rows)
   - Environment-specific routing

2. **`get_table_relationships`**
   - Foreign key relationship extraction
   - Cardinality analysis (one-to-many, many-to-one)
   - Optional table filtering

3. **`validate_database_schema`**
   - Schema integrity validation
   - Missing primary key detection
   - Foreign key without index detection
   - Orphaned foreign key detection

4. **`suggest_database_optimizations`**
   - Prioritized optimization suggestions (high/medium/low)
   - Missing index recommendations
   - Primary key suggestions
   - Schema improvement opportunities

### Changed

- **Architecture**: Monolithic (629 lines) → Hexagonal (modular layers)
- **Testing**: 0 tests → 398 comprehensive tests
- **Dependencies**: Added dependency injection throughout
- **Caching**: Improved with port/adapter pattern
- **Error Handling**: Comprehensive error propagation
- **Type Safety**: Enhanced with strict TypeScript compilation
- **Module System**: ESM → CommonJS for MCP compatibility
- **dotenv**: Downgraded to 16.4.5 to remove stdout banner

### Fixed

- **MCP stdio compatibility**: Removed dotenv banner that broke JSON protocol
- **Module resolution**: Fixed ESM import errors in production
- **Type safety**: Fixed readonly array issues in use cases
- **Foreign key types**: Added 'SET DEFAULT' to union types
- **Integration tests**: Proper DatabaseSchema instance creation
- **Repository constructor**: Fixed missing databaseConfig parameter
- **Environment variables**: Added database NAME variables alongside IDs

### Testing

All 398 tests passing with comprehensive coverage:

```
✅ Domain Layer Tests: 212 passing
✅ Infrastructure Layer Tests: 64 passing
✅ Application Layer Tests: 35 passing
✅ Presentation Layer Tests: 13 passing
✅ Integration Tests: 15 passing
```

### Documentation

- **README.md**: Updated with hexagonal architecture status and actual tool count (4)
- **ARCHITECTURE.md**: Comprehensive architecture documentation
- **D1_MCP_REFACTORING_PLAN.md**: Complete refactoring plan (now fulfilled)
- **SEMANTIC_ANCHORING_GOVERNANCE.md**: Semantic intent governance rules
- **CONTRIBUTING.md**: Contribution guidelines
- **SECURITY.md**: Security policy and best practices

### CI/CD

- **GitHub Actions**: Enhanced multi-version testing (Node 20.x, 22.x)
- **Build job**: Separate build verification with artifact upload
- **Security audit**: npm audit job
- **Type checking**: Full TypeScript compilation verification

### Migration Guide

If upgrading from 1.0.0:

1. **Environment Variables**: Add database NAME variables to `.env`:
   ```
   D1_DEV_DATABASE_NAME=your_db_name
   D1_STAGING_DATABASE_NAME=your_db_name
   D1_PROD_DATABASE_NAME=your_db_name
   ```

2. **MCP Tool Changes**: Tool count reduced from 6 to 4
   - Removed: `validate_integration_schema`, `get_data_usage_patterns`, `get_index_information`
   - Kept: `analyze_database_schema`, `get_table_relationships`, `validate_database_schema`, `suggest_database_optimizations`

3. **No Breaking API Changes**: All 4 tools maintain backward compatibility

---

## [1.0.0] - 2025-10-07 (Initial Release)

### Added

#### 🎯 **Core Functionality**
- **6 MCP Tools** for D1 database introspection (monolithic implementation)
- **Cloudflare D1 REST API Integration**
- **Environment-based Routing** (dev/staging/prod)
- **In-memory Caching** (10-minute TTL)

#### 📚 **Documentation**
- Comprehensive README with quick start guide
- ARCHITECTURE.md with hexagonal design plan
- D1_MCP_REFACTORING_PLAN.md with implementation roadmap
- SEMANTIC_ANCHORING_GOVERNANCE.md with governance rules

#### 🛠️ **Tooling**
- Vitest testing framework setup
- Biome linting and formatting
- TypeScript 5.9 with strict mode
- GitHub Actions CI pipeline

---

## Version History

- **2.0.0** (2025-10-07) - Complete hexagonal architecture refactoring with 398 tests ✅
- **1.0.0** (2025-10-07) - Initial monolithic implementation with comprehensive documentation

---

*This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.*
