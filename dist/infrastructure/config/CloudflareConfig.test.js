"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const CloudflareConfig_1 = require("./CloudflareConfig");
(0, vitest_1.describe)('CloudflareConfig', () => {
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create config with valid parameters', () => {
            const config = new CloudflareConfig_1.CloudflareConfig('account123', 'token456');
            (0, vitest_1.expect)(config.accountId).toBe('account123');
            (0, vitest_1.expect)(config.apiToken).toBe('token456');
        });
        (0, vitest_1.it)('should trim whitespace', () => {
            const config = new CloudflareConfig_1.CloudflareConfig('  account123  ', '  token456  ');
            (0, vitest_1.expect)(config.accountId).toBe('account123');
            (0, vitest_1.expect)(config.apiToken).toBe('token456');
        });
        (0, vitest_1.it)('should throw error for empty account ID', () => {
            (0, vitest_1.expect)(() => new CloudflareConfig_1.CloudflareConfig('', 'token')).toThrow('Cloudflare account ID is required');
        });
        (0, vitest_1.it)('should throw error for whitespace-only account ID', () => {
            (0, vitest_1.expect)(() => new CloudflareConfig_1.CloudflareConfig('   ', 'token')).toThrow('Cloudflare account ID is required');
        });
        (0, vitest_1.it)('should throw error for empty API token', () => {
            (0, vitest_1.expect)(() => new CloudflareConfig_1.CloudflareConfig('account', '')).toThrow('Cloudflare API token is required');
        });
        (0, vitest_1.it)('should throw error for whitespace-only API token', () => {
            (0, vitest_1.expect)(() => new CloudflareConfig_1.CloudflareConfig('account', '   ')).toThrow('Cloudflare API token is required');
        });
        (0, vitest_1.it)('should be immutable', () => {
            const config = new CloudflareConfig_1.CloudflareConfig('account', 'token');
            (0, vitest_1.expect)(Object.isFrozen(config)).toBe(true);
        });
    });
    (0, vitest_1.describe)('fromEnvironment()', () => {
        (0, vitest_1.it)('should create config from environment variables', () => {
            const env = {
                CLOUDFLARE_ACCOUNT_ID: 'account123',
                CLOUDFLARE_API_TOKEN: 'token456',
            };
            const config = CloudflareConfig_1.CloudflareConfig.fromEnvironment(env);
            (0, vitest_1.expect)(config.accountId).toBe('account123');
            (0, vitest_1.expect)(config.apiToken).toBe('token456');
        });
        (0, vitest_1.it)('should throw error when account ID missing', () => {
            const env = {
                CLOUDFLARE_API_TOKEN: 'token456',
            };
            (0, vitest_1.expect)(() => CloudflareConfig_1.CloudflareConfig.fromEnvironment(env)).toThrow('CLOUDFLARE_ACCOUNT_ID environment variable is required');
        });
        (0, vitest_1.it)('should throw error when API token missing', () => {
            const env = {
                CLOUDFLARE_ACCOUNT_ID: 'account123',
            };
            (0, vitest_1.expect)(() => CloudflareConfig_1.CloudflareConfig.fromEnvironment(env)).toThrow('CLOUDFLARE_API_TOKEN environment variable is required');
        });
        (0, vitest_1.it)('should handle undefined environment variables', () => {
            const env = {
                SOME_OTHER_VAR: 'value',
            };
            (0, vitest_1.expect)(() => CloudflareConfig_1.CloudflareConfig.fromEnvironment(env)).toThrow('CLOUDFLARE_ACCOUNT_ID environment variable is required');
        });
    });
    (0, vitest_1.describe)('getMaskedToken()', () => {
        (0, vitest_1.it)('should mask long tokens', () => {
            const config = new CloudflareConfig_1.CloudflareConfig('account', 'verylongtokenstring123456');
            const masked = config.getMaskedToken();
            (0, vitest_1.expect)(masked).toBe('verylong...');
            (0, vitest_1.expect)(masked).not.toContain('tokenstring');
        });
        (0, vitest_1.it)('should mask short tokens completely', () => {
            const config = new CloudflareConfig_1.CloudflareConfig('account', 'short');
            const masked = config.getMaskedToken();
            (0, vitest_1.expect)(masked).toBe('***');
        });
        (0, vitest_1.it)('should mask 8-character tokens', () => {
            const config = new CloudflareConfig_1.CloudflareConfig('account', '12345678');
            const masked = config.getMaskedToken();
            (0, vitest_1.expect)(masked).toBe('***');
        });
        (0, vitest_1.it)('should show first 8 chars for 9+ character tokens', () => {
            const config = new CloudflareConfig_1.CloudflareConfig('account', '123456789abc');
            const masked = config.getMaskedToken();
            (0, vitest_1.expect)(masked).toBe('12345678...');
        });
    });
});
//# sourceMappingURL=CloudflareConfig.test.js.map