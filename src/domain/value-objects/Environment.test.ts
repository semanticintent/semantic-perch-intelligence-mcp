import { describe, it, expect } from 'vitest';
import { Environment, parseEnvironment, isValidEnvironment } from './Environment';

describe('Environment', () => {
  describe('enum values', () => {
    it('should have DEVELOPMENT value', () => {
      expect(Environment.DEVELOPMENT).toBe('development');
    });

    it('should have STAGING value', () => {
      expect(Environment.STAGING).toBe('staging');
    });

    it('should have PRODUCTION value', () => {
      expect(Environment.PRODUCTION).toBe('production');
    });
  });

  describe('parseEnvironment()', () => {
    it('should parse "development" to DEVELOPMENT', () => {
      expect(parseEnvironment('development')).toBe(Environment.DEVELOPMENT);
    });

    it('should parse "dev" to DEVELOPMENT', () => {
      expect(parseEnvironment('dev')).toBe(Environment.DEVELOPMENT);
    });

    it('should parse "DEVELOPMENT" (uppercase) to DEVELOPMENT', () => {
      expect(parseEnvironment('DEVELOPMENT')).toBe(Environment.DEVELOPMENT);
    });

    it('should parse "staging" to STAGING', () => {
      expect(parseEnvironment('staging')).toBe(Environment.STAGING);
    });

    it('should parse "stage" to STAGING', () => {
      expect(parseEnvironment('stage')).toBe(Environment.STAGING);
    });

    it('should parse "production" to PRODUCTION', () => {
      expect(parseEnvironment('production')).toBe(Environment.PRODUCTION);
    });

    it('should parse "prod" to PRODUCTION', () => {
      expect(parseEnvironment('prod')).toBe(Environment.PRODUCTION);
    });

    it('should throw error for invalid environment', () => {
      expect(() => parseEnvironment('invalid')).toThrow(
        'Invalid environment: "invalid". Must be one of: development, staging, production'
      );
    });

    it('should throw error for empty string', () => {
      expect(() => parseEnvironment('')).toThrow('Invalid environment');
    });
  });

  describe('isValidEnvironment()', () => {
    it('should return true for "development"', () => {
      expect(isValidEnvironment('development')).toBe(true);
    });

    it('should return true for "dev"', () => {
      expect(isValidEnvironment('dev')).toBe(true);
    });

    it('should return true for "staging"', () => {
      expect(isValidEnvironment('staging')).toBe(true);
    });

    it('should return true for "production"', () => {
      expect(isValidEnvironment('production')).toBe(true);
    });

    it('should return false for invalid value', () => {
      expect(isValidEnvironment('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidEnvironment('')).toBe(false);
    });
  });
});
