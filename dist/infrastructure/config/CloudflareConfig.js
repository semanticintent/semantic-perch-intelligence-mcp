"use strict";
/**
 * 🎯 SEMANTIC INTENT: CloudflareConfig holds Cloudflare account credentials
 *
 * WHY: Infrastructure configuration for Cloudflare API access
 * - Account ID and API token are infrastructure concerns
 * - Loaded from environment variables (external configuration)
 * - Immutable configuration object
 *
 * INFRASTRUCTURE LAYER: Technical configuration, not domain knowledge
 * IMMUTABILITY: Frozen to prevent accidental modification
 * VALIDATION: Ensures required credentials are present
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareConfig = void 0;
class CloudflareConfig {
    accountId;
    apiToken;
    constructor(accountId, apiToken) {
        if (!accountId || accountId.trim().length === 0) {
            throw new Error('Cloudflare account ID is required');
        }
        if (!apiToken || apiToken.trim().length === 0) {
            throw new Error('Cloudflare API token is required');
        }
        this.accountId = accountId.trim();
        this.apiToken = apiToken.trim();
        Object.freeze(this);
    }
    /**
     * Create config from environment variables
     *
     * @param env - Environment variables object (process.env or custom)
     */
    static fromEnvironment(env) {
        const accountId = env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = env.CLOUDFLARE_API_TOKEN;
        if (!accountId) {
            throw new Error('CLOUDFLARE_ACCOUNT_ID environment variable is required');
        }
        if (!apiToken) {
            throw new Error('CLOUDFLARE_API_TOKEN environment variable is required');
        }
        return new CloudflareConfig(accountId, apiToken);
    }
    /**
     * Get masked token for logging (security)
     *
     * Returns: First 8 chars + ***
     */
    getMaskedToken() {
        if (this.apiToken.length <= 8) {
            return '***';
        }
        return `${this.apiToken.substring(0, 8)}...`;
    }
}
exports.CloudflareConfig = CloudflareConfig;
//# sourceMappingURL=CloudflareConfig.js.map