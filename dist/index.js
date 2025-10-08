"use strict";
/**
 * index.ts - Composition Root
 *
 * @semantic-intent Main entry point that wires all dependencies together
 * Implements Dependency Injection for hexagonal architecture
 *
 * @observable-anchoring
 * - Environment configuration drives database selection
 * - Configuration loaded from environment variables
 * - Dependencies injected from outer layers to inner layers
 *
 * @intent-preservation
 * - Composition root maintains clear dependency flow
 * - Infrastructure → Application → Domain → Presentation
 * - No business logic in composition root
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const MCPServer_js_1 = require("./presentation/mcp/MCPServer.js");
const AnalyzeSchemaUseCase_js_1 = require("./application/use-cases/AnalyzeSchemaUseCase.js");
const GetRelationshipsUseCase_js_1 = require("./application/use-cases/GetRelationshipsUseCase.js");
const ValidateSchemaUseCase_js_1 = require("./application/use-cases/ValidateSchemaUseCase.js");
const SuggestOptimizationsUseCase_js_1 = require("./application/use-cases/SuggestOptimizationsUseCase.js");
const SchemaAnalyzer_js_1 = require("./domain/services/SchemaAnalyzer.js");
const RelationshipAnalyzer_js_1 = require("./domain/services/RelationshipAnalyzer.js");
const OptimizationService_js_1 = require("./domain/services/OptimizationService.js");
const CloudflareAPIClient_js_1 = require("./infrastructure/http/CloudflareAPIClient.js");
const CloudflareD1Repository_js_1 = require("./infrastructure/adapters/CloudflareD1Repository.js");
const InMemoryCacheProvider_js_1 = require("./infrastructure/adapters/InMemoryCacheProvider.js");
const CloudflareConfig_js_1 = require("./infrastructure/config/CloudflareConfig.js");
const DatabaseConfig_js_1 = require("./infrastructure/config/DatabaseConfig.js");
const Environment_js_1 = require("./domain/value-objects/Environment.js");
/**
 * Load environment configuration
 * Silent mode to prevent stdout pollution (MCP uses stdio for communication)
 */
dotenv_1.default.config({ debug: false });
/**
 * Validate required environment variables
 */
function validateEnvironment() {
    const required = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach((key) => console.error(`   - ${key}`));
        console.error('\nPlease create a .env file with these variables.');
        console.error('See .env.example for reference.');
        process.exit(1);
    }
    // Validate at least one database is configured
    const hasDevDb = process.env.D1_DEV_DATABASE_ID && process.env.D1_DEV_DATABASE_NAME;
    const hasStagingDb = process.env.D1_STAGING_DATABASE_ID && process.env.D1_STAGING_DATABASE_NAME;
    const hasProdDb = process.env.D1_PROD_DATABASE_ID && process.env.D1_PROD_DATABASE_NAME;
    if (!hasDevDb && !hasStagingDb && !hasProdDb) {
        console.error('❌ No database configured!');
        console.error('   Please configure at least one database environment:');
        console.error('   - D1_DEV_DATABASE_ID + D1_DEV_DATABASE_NAME');
        console.error('   - D1_STAGING_DATABASE_ID + D1_STAGING_DATABASE_NAME');
        console.error('   - D1_PROD_DATABASE_ID + D1_PROD_DATABASE_NAME');
        process.exit(1);
    }
}
/**
 * Create database configuration from environment
 */
function createDatabaseConfig() {
    const databases = new Map();
    // Development database
    if (process.env.D1_DEV_DATABASE_ID && process.env.D1_DEV_DATABASE_NAME) {
        databases.set(Environment_js_1.Environment.DEVELOPMENT, {
            id: process.env.D1_DEV_DATABASE_ID,
            name: process.env.D1_DEV_DATABASE_NAME,
        });
    }
    // Staging database
    if (process.env.D1_STAGING_DATABASE_ID && process.env.D1_STAGING_DATABASE_NAME) {
        databases.set(Environment_js_1.Environment.STAGING, {
            id: process.env.D1_STAGING_DATABASE_ID,
            name: process.env.D1_STAGING_DATABASE_NAME,
        });
    }
    // Production database
    if (process.env.D1_PROD_DATABASE_ID && process.env.D1_PROD_DATABASE_NAME) {
        databases.set(Environment_js_1.Environment.PRODUCTION, {
            id: process.env.D1_PROD_DATABASE_ID,
            name: process.env.D1_PROD_DATABASE_NAME,
        });
    }
    return new DatabaseConfig_js_1.DatabaseConfig(databases);
}
/**
 * Composition Root: Wire all dependencies
 */
async function main() {
    try {
        // Validate environment
        validateEnvironment();
        console.error('🚀 Starting Semantic D1 MCP Server...');
        // Infrastructure Layer - External adapters
        const cloudflareConfig = new CloudflareConfig_js_1.CloudflareConfig(process.env.CLOUDFLARE_ACCOUNT_ID, process.env.CLOUDFLARE_API_TOKEN);
        const apiClient = new CloudflareAPIClient_js_1.CloudflareAPIClient(cloudflareConfig);
        const cache = new InMemoryCacheProvider_js_1.InMemoryCacheProvider();
        const databaseConfig = createDatabaseConfig();
        const repository = new CloudflareD1Repository_js_1.CloudflareD1Repository(apiClient, databaseConfig);
        // Log configured environments
        const configuredEnvs = Array.from(databaseConfig['databases'].keys());
        console.error(`📊 Configured environments: ${configuredEnvs.join(', ')}`);
        // Domain Layer - Business logic services
        const schemaAnalyzer = new SchemaAnalyzer_js_1.SchemaAnalyzer();
        const relationshipAnalyzer = new RelationshipAnalyzer_js_1.RelationshipAnalyzer();
        const optimizationService = new OptimizationService_js_1.OptimizationService();
        // Application Layer - Use cases (orchestration)
        const analyzeSchemaUseCase = new AnalyzeSchemaUseCase_js_1.AnalyzeSchemaUseCase(repository, schemaAnalyzer, databaseConfig, cache);
        const getRelationshipsUseCase = new GetRelationshipsUseCase_js_1.GetRelationshipsUseCase(repository, relationshipAnalyzer, databaseConfig, cache);
        const validateSchemaUseCase = new ValidateSchemaUseCase_js_1.ValidateSchemaUseCase(repository, schemaAnalyzer, databaseConfig, cache);
        const suggestOptimizationsUseCase = new SuggestOptimizationsUseCase_js_1.SuggestOptimizationsUseCase(repository, optimizationService, relationshipAnalyzer, databaseConfig, cache);
        // Presentation Layer - MCP Server
        const mcpServer = new MCPServer_js_1.D1DatabaseMCPServer(analyzeSchemaUseCase, getRelationshipsUseCase, validateSchemaUseCase, suggestOptimizationsUseCase);
        // Start the server
        await mcpServer.start();
        console.error('✅ Semantic D1 MCP Server running on stdio');
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server
main();
//# sourceMappingURL=index.js.map