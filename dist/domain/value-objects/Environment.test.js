"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Environment_1 = require("./Environment");
(0, vitest_1.describe)('Environment', () => {
    (0, vitest_1.describe)('enum values', () => {
        (0, vitest_1.it)('should have DEVELOPMENT value', () => {
            (0, vitest_1.expect)(Environment_1.Environment.DEVELOPMENT).toBe('development');
        });
        (0, vitest_1.it)('should have STAGING value', () => {
            (0, vitest_1.expect)(Environment_1.Environment.STAGING).toBe('staging');
        });
        (0, vitest_1.it)('should have PRODUCTION value', () => {
            (0, vitest_1.expect)(Environment_1.Environment.PRODUCTION).toBe('production');
        });
    });
    (0, vitest_1.describe)('parseEnvironment()', () => {
        (0, vitest_1.it)('should parse "development" to DEVELOPMENT', () => {
            (0, vitest_1.expect)((0, Environment_1.parseEnvironment)('development')).toBe(Environment_1.Environment.DEVELOPMENT);
        });
        (0, vitest_1.it)('should parse "dev" to DEVELOPMENT', () => {
            (0, vitest_1.expect)((0, Environment_1.parseEnvironment)('dev')).toBe(Environment_1.Environment.DEVELOPMENT);
        });
        (0, vitest_1.it)('should parse "DEVELOPMENT" (uppercase) to DEVELOPMENT', () => {
            (0, vitest_1.expect)((0, Environment_1.parseEnvironment)('DEVELOPMENT')).toBe(Environment_1.Environment.DEVELOPMENT);
        });
        (0, vitest_1.it)('should parse "staging" to STAGING', () => {
            (0, vitest_1.expect)((0, Environment_1.parseEnvironment)('staging')).toBe(Environment_1.Environment.STAGING);
        });
        (0, vitest_1.it)('should parse "stage" to STAGING', () => {
            (0, vitest_1.expect)((0, Environment_1.parseEnvironment)('stage')).toBe(Environment_1.Environment.STAGING);
        });
        (0, vitest_1.it)('should parse "production" to PRODUCTION', () => {
            (0, vitest_1.expect)((0, Environment_1.parseEnvironment)('production')).toBe(Environment_1.Environment.PRODUCTION);
        });
        (0, vitest_1.it)('should parse "prod" to PRODUCTION', () => {
            (0, vitest_1.expect)((0, Environment_1.parseEnvironment)('prod')).toBe(Environment_1.Environment.PRODUCTION);
        });
        (0, vitest_1.it)('should throw error for invalid environment', () => {
            (0, vitest_1.expect)(() => (0, Environment_1.parseEnvironment)('invalid')).toThrow('Invalid environment: "invalid". Must be one of: development, staging, production');
        });
        (0, vitest_1.it)('should throw error for empty string', () => {
            (0, vitest_1.expect)(() => (0, Environment_1.parseEnvironment)('')).toThrow('Invalid environment');
        });
    });
    (0, vitest_1.describe)('isValidEnvironment()', () => {
        (0, vitest_1.it)('should return true for "development"', () => {
            (0, vitest_1.expect)((0, Environment_1.isValidEnvironment)('development')).toBe(true);
        });
        (0, vitest_1.it)('should return true for "dev"', () => {
            (0, vitest_1.expect)((0, Environment_1.isValidEnvironment)('dev')).toBe(true);
        });
        (0, vitest_1.it)('should return true for "staging"', () => {
            (0, vitest_1.expect)((0, Environment_1.isValidEnvironment)('staging')).toBe(true);
        });
        (0, vitest_1.it)('should return true for "production"', () => {
            (0, vitest_1.expect)((0, Environment_1.isValidEnvironment)('production')).toBe(true);
        });
        (0, vitest_1.it)('should return false for invalid value', () => {
            (0, vitest_1.expect)((0, Environment_1.isValidEnvironment)('invalid')).toBe(false);
        });
        (0, vitest_1.it)('should return false for empty string', () => {
            (0, vitest_1.expect)((0, Environment_1.isValidEnvironment)('')).toBe(false);
        });
    });
});
//# sourceMappingURL=Environment.test.js.map