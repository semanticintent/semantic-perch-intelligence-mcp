"use strict";
/**
 * 🎯 SEMANTIC INTENT: Environment represents deployment context
 *
 * WHY: Environment is a semantic anchor that preserves database selection intent
 * - "development" semantically means: testing, experimentation, safe to modify
 * - "staging" semantically means: pre-production validation, production-like
 * - "production" semantically means: live data, critical operations, read-carefully
 *
 * IMMUTABILITY: Value objects are immutable by design
 * OBSERVABLE: Environment is directly observable from configuration/context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = void 0;
exports.parseEnvironment = parseEnvironment;
exports.isValidEnvironment = isValidEnvironment;
var Environment;
(function (Environment) {
    Environment["DEVELOPMENT"] = "development";
    Environment["STAGING"] = "staging";
    Environment["PRODUCTION"] = "production";
})(Environment || (exports.Environment = Environment = {}));
/**
 * Parse string to Environment enum
 *
 * @throws Error if value is not a valid environment
 */
function parseEnvironment(value) {
    const normalized = value.toLowerCase();
    if (normalized === 'development' || normalized === 'dev') {
        return Environment.DEVELOPMENT;
    }
    if (normalized === 'staging' || normalized === 'stage') {
        return Environment.STAGING;
    }
    if (normalized === 'production' || normalized === 'prod') {
        return Environment.PRODUCTION;
    }
    throw new Error(`Invalid environment: "${value}". Must be one of: development, staging, production`);
}
/**
 * Check if value is a valid environment
 */
function isValidEnvironment(value) {
    try {
        parseEnvironment(value);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=Environment.js.map