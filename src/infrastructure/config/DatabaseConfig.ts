import { Environment } from '../../domain/value-objects/Environment';

/**
 * 🎯 SEMANTIC INTENT: DatabaseConfig maps environments to D1 database IDs
 *
 * WHY: Infrastructure routing for environment-specific databases
 * - Development, staging, production databases are separate instances
 * - Environment semantic preserved: routing based on deployment context
 * - Loaded from environment variables
 *
 * INFRASTRUCTURE LAYER: Technical database routing configuration
 * INTENT PRESERVATION: Environment semantic maintained from domain to infrastructure
 */

export interface DatabaseInstance {
  name: string;
  id: string;
}

export class DatabaseConfig {
  private readonly databases: Map<Environment, DatabaseInstance>;

  constructor(databases: Map<Environment, DatabaseInstance>) {
    if (databases.size === 0) {
      throw new Error('At least one database must be configured');
    }

    this.databases = new Map(databases);
    Object.freeze(this);
  }

  /**
   * Get database instance for environment
   *
   * Semantic: Environment determines which database to use
   */
  getDatabaseInstance(environment: Environment): DatabaseInstance {
    const instance = this.databases.get(environment);

    if (!instance) {
      throw new Error(
        `No database configured for environment: ${environment}. ` +
          `Available: ${Array.from(this.databases.keys()).join(', ')}`
      );
    }

    return instance;
  }

  /**
   * Get database ID for environment
   */
  getDatabaseId(environment: Environment): string {
    return this.getDatabaseInstance(environment).id;
  }

  /**
   * Get database name for environment
   */
  getDatabaseName(environment: Environment): string {
    return this.getDatabaseInstance(environment).name;
  }

  /**
   * Check if environment has configured database
   */
  hasEnvironment(environment: Environment): boolean {
    return this.databases.has(environment);
  }

  /**
   * Get all configured environments
   */
  getConfiguredEnvironments(): Environment[] {
    return Array.from(this.databases.keys());
  }

  /**
   * Create config from environment variables
   */
  static fromEnvironment(env: Record<string, string | undefined>): DatabaseConfig {
    const databases = new Map<Environment, DatabaseInstance>();

    // Development database
    const devId = env.D1_DEV_DATABASE_ID || env.D1_DATABASE_ID;
    if (devId) {
      databases.set(Environment.DEVELOPMENT, {
        name: env.D1_DEV_DATABASE_NAME || 'development',
        id: devId,
      });
    }

    // Staging database
    const stagingId = env.D1_STAGING_DATABASE_ID;
    if (stagingId) {
      databases.set(Environment.STAGING, {
        name: env.D1_STAGING_DATABASE_NAME || 'staging',
        id: stagingId,
      });
    }

    // Production database
    const prodId = env.D1_PROD_DATABASE_ID || env.D1_PRODUCTION_DATABASE_ID;
    if (prodId) {
      databases.set(Environment.PRODUCTION, {
        name: env.D1_PROD_DATABASE_NAME || env.D1_PRODUCTION_DATABASE_NAME || 'production',
        id: prodId,
      });
    }

    if (databases.size === 0) {
      throw new Error(
        'No databases configured. Set at least one of: ' +
          'D1_DEV_DATABASE_ID, D1_STAGING_DATABASE_ID, D1_PROD_DATABASE_ID'
      );
    }

    return new DatabaseConfig(databases);
  }
}
