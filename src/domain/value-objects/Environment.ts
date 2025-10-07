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

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

/**
 * Parse string to Environment enum
 *
 * @throws Error if value is not a valid environment
 */
export function parseEnvironment(value: string): Environment {
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

  throw new Error(
    `Invalid environment: "${value}". Must be one of: development, staging, production`
  );
}

/**
 * Check if value is a valid environment
 */
export function isValidEnvironment(value: string): boolean {
  try {
    parseEnvironment(value);
    return true;
  } catch {
    return false;
  }
}
