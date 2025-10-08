import { describe, it, expect } from 'vitest';
import { Environment } from '../../domain/value-objects/Environment';
import { DatabaseConfig } from './DatabaseConfig';

describe('DatabaseConfig', () => {
  describe('constructor', () => {
    it('should create config with databases', () => {
      const databases = new Map();
      databases.set(Environment.DEVELOPMENT, { name: 'dev_db', id: 'dev-123' });
      databases.set(Environment.PRODUCTION, { name: 'prod_db', id: 'prod-456' });

      const config = new DatabaseConfig(databases);

      expect(config.hasEnvironment(Environment.DEVELOPMENT)).toBe(true);
      expect(config.hasEnvironment(Environment.PRODUCTION)).toBe(true);
    });

    it('should throw error for empty databases', () => {
      expect(() => new DatabaseConfig(new Map())).toThrow(
        'At least one database must be configured'
      );
    });

    it('should be immutable', () => {
      const databases = new Map();
      databases.set(Environment.DEVELOPMENT, { name: 'dev', id: '123' });
      const config = new DatabaseConfig(databases);

      expect(Object.isFrozen(config)).toBe(true);
    });
  });

  describe('getDatabaseInstance()', () => {
    it('should return database instance for environment', () => {
      const databases = new Map();
      databases.set(Environment.DEVELOPMENT, { name: 'dev_db', id: 'dev-123' });

      const config = new DatabaseConfig(databases);
      const instance = config.getDatabaseInstance(Environment.DEVELOPMENT);

      expect(instance.name).toBe('dev_db');
      expect(instance.id).toBe('dev-123');
    });

    it('should throw error for unconfigured environment', () => {
      const databases = new Map();
      databases.set(Environment.DEVELOPMENT, { name: 'dev', id: '123' });

      const config = new DatabaseConfig(databases);

      expect(() => config.getDatabaseInstance(Environment.PRODUCTION)).toThrow(
        'No database configured for environment: production'
      );
    });

    it('should include available environments in error message', () => {
      const databases = new Map();
      databases.set(Environment.DEVELOPMENT, { name: 'dev', id: '123' });
      databases.set(Environment.STAGING, { name: 'stage', id: '456' });

      const config = new DatabaseConfig(databases);

      expect(() => config.getDatabaseInstance(Environment.PRODUCTION)).toThrow(
        'Available: development, staging'
      );
    });
  });

  describe('getDatabaseId()', () => {
    it('should return database ID', () => {
      const databases = new Map();
      databases.set(Environment.DEVELOPMENT, { name: 'dev', id: 'dev-123' });

      const config = new DatabaseConfig(databases);

      expect(config.getDatabaseId(Environment.DEVELOPMENT)).toBe('dev-123');
    });
  });

  describe('getDatabaseName()', () => {
    it('should return database name', () => {
      const databases = new Map();
      databases.set(Environment.DEVELOPMENT, { name: 'dev_db', id: '123' });

      const config = new DatabaseConfig(databases);

      expect(config.getDatabaseName(Environment.DEVELOPMENT)).toBe('dev_db');
    });
  });

  describe('hasEnvironment()', () => {
    it('should return true for configured environment', () => {
      const databases = new Map();
      databases.set(Environment.DEVELOPMENT, { name: 'dev', id: '123' });

      const config = new DatabaseConfig(databases);

      expect(config.hasEnvironment(Environment.DEVELOPMENT)).toBe(true);
    });

    it('should return false for unconfigured environment', () => {
      const databases = new Map();
      databases.set(Environment.DEVELOPMENT, { name: 'dev', id: '123' });

      const config = new DatabaseConfig(databases);

      expect(config.hasEnvironment(Environment.PRODUCTION)).toBe(false);
    });
  });

  describe('getConfiguredEnvironments()', () => {
    it('should return all configured environments', () => {
      const databases = new Map();
      databases.set(Environment.DEVELOPMENT, { name: 'dev', id: '123' });
      databases.set(Environment.PRODUCTION, { name: 'prod', id: '456' });

      const config = new DatabaseConfig(databases);
      const envs = config.getConfiguredEnvironments();

      expect(envs).toContain(Environment.DEVELOPMENT);
      expect(envs).toContain(Environment.PRODUCTION);
      expect(envs.length).toBe(2);
    });
  });

  describe('fromEnvironment()', () => {
    it('should load development database', () => {
      const env = {
        D1_DEV_DATABASE_ID: 'dev-123',
        D1_DEV_DATABASE_NAME: 'my_dev_db',
      };

      const config = DatabaseConfig.fromEnvironment(env);

      expect(config.hasEnvironment(Environment.DEVELOPMENT)).toBe(true);
      expect(config.getDatabaseName(Environment.DEVELOPMENT)).toBe('my_dev_db');
      expect(config.getDatabaseId(Environment.DEVELOPMENT)).toBe('dev-123');
    });

    it('should use D1_DATABASE_ID as fallback for dev', () => {
      const env = {
        D1_DATABASE_ID: 'dev-123',
      };

      const config = DatabaseConfig.fromEnvironment(env);

      expect(config.hasEnvironment(Environment.DEVELOPMENT)).toBe(true);
    });

    it('should use default name when not specified', () => {
      const env = {
        D1_DEV_DATABASE_ID: 'dev-123',
      };

      const config = DatabaseConfig.fromEnvironment(env);

      expect(config.getDatabaseName(Environment.DEVELOPMENT)).toBe('development');
    });

    it('should load staging database', () => {
      const env = {
        D1_DEV_DATABASE_ID: 'dev-123',
        D1_STAGING_DATABASE_ID: 'staging-456',
        D1_STAGING_DATABASE_NAME: 'my_staging_db',
      };

      const config = DatabaseConfig.fromEnvironment(env);

      expect(config.hasEnvironment(Environment.STAGING)).toBe(true);
      expect(config.getDatabaseName(Environment.STAGING)).toBe('my_staging_db');
    });

    it('should load production database', () => {
      const env = {
        D1_DEV_DATABASE_ID: 'dev-123',
        D1_PROD_DATABASE_ID: 'prod-789',
        D1_PROD_DATABASE_NAME: 'my_prod_db',
      };

      const config = DatabaseConfig.fromEnvironment(env);

      expect(config.hasEnvironment(Environment.PRODUCTION)).toBe(true);
      expect(config.getDatabaseName(Environment.PRODUCTION)).toBe('my_prod_db');
    });

    it('should support D1_PRODUCTION_DATABASE_ID alias', () => {
      const env = {
        D1_DEV_DATABASE_ID: 'dev-123',
        D1_PRODUCTION_DATABASE_ID: 'prod-789',
      };

      const config = DatabaseConfig.fromEnvironment(env);

      expect(config.hasEnvironment(Environment.PRODUCTION)).toBe(true);
    });

    it('should load all environments', () => {
      const env = {
        D1_DEV_DATABASE_ID: 'dev-123',
        D1_STAGING_DATABASE_ID: 'staging-456',
        D1_PROD_DATABASE_ID: 'prod-789',
      };

      const config = DatabaseConfig.fromEnvironment(env);

      expect(config.getConfiguredEnvironments().length).toBe(3);
    });

    it('should throw error when no databases configured', () => {
      const env = {
        SOME_OTHER_VAR: 'value',
      };

      expect(() => DatabaseConfig.fromEnvironment(env)).toThrow(
        'No databases configured'
      );
    });
  });
});
