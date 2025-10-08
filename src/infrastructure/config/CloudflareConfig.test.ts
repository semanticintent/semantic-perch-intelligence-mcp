import { describe, it, expect } from 'vitest';
import { CloudflareConfig } from './CloudflareConfig';

describe('CloudflareConfig', () => {
  describe('constructor', () => {
    it('should create config with valid parameters', () => {
      const config = new CloudflareConfig('account123', 'token456');

      expect(config.accountId).toBe('account123');
      expect(config.apiToken).toBe('token456');
    });

    it('should trim whitespace', () => {
      const config = new CloudflareConfig('  account123  ', '  token456  ');

      expect(config.accountId).toBe('account123');
      expect(config.apiToken).toBe('token456');
    });

    it('should throw error for empty account ID', () => {
      expect(() => new CloudflareConfig('', 'token')).toThrow('Cloudflare account ID is required');
    });

    it('should throw error for whitespace-only account ID', () => {
      expect(() => new CloudflareConfig('   ', 'token')).toThrow(
        'Cloudflare account ID is required'
      );
    });

    it('should throw error for empty API token', () => {
      expect(() => new CloudflareConfig('account', '')).toThrow('Cloudflare API token is required');
    });

    it('should throw error for whitespace-only API token', () => {
      expect(() => new CloudflareConfig('account', '   ')).toThrow(
        'Cloudflare API token is required'
      );
    });

    it('should be immutable', () => {
      const config = new CloudflareConfig('account', 'token');

      expect(Object.isFrozen(config)).toBe(true);
    });
  });

  describe('fromEnvironment()', () => {
    it('should create config from environment variables', () => {
      const env = {
        CLOUDFLARE_ACCOUNT_ID: 'account123',
        CLOUDFLARE_API_TOKEN: 'token456',
      };

      const config = CloudflareConfig.fromEnvironment(env);

      expect(config.accountId).toBe('account123');
      expect(config.apiToken).toBe('token456');
    });

    it('should throw error when account ID missing', () => {
      const env = {
        CLOUDFLARE_API_TOKEN: 'token456',
      };

      expect(() => CloudflareConfig.fromEnvironment(env)).toThrow(
        'CLOUDFLARE_ACCOUNT_ID environment variable is required'
      );
    });

    it('should throw error when API token missing', () => {
      const env = {
        CLOUDFLARE_ACCOUNT_ID: 'account123',
      };

      expect(() => CloudflareConfig.fromEnvironment(env)).toThrow(
        'CLOUDFLARE_API_TOKEN environment variable is required'
      );
    });

    it('should handle undefined environment variables', () => {
      const env = {
        SOME_OTHER_VAR: 'value',
      };

      expect(() => CloudflareConfig.fromEnvironment(env)).toThrow(
        'CLOUDFLARE_ACCOUNT_ID environment variable is required'
      );
    });
  });

  describe('getMaskedToken()', () => {
    it('should mask long tokens', () => {
      const config = new CloudflareConfig('account', 'verylongtokenstring123456');
      const masked = config.getMaskedToken();

      expect(masked).toBe('verylong...');
      expect(masked).not.toContain('tokenstring');
    });

    it('should mask short tokens completely', () => {
      const config = new CloudflareConfig('account', 'short');
      const masked = config.getMaskedToken();

      expect(masked).toBe('***');
    });

    it('should mask 8-character tokens', () => {
      const config = new CloudflareConfig('account', '12345678');
      const masked = config.getMaskedToken();

      expect(masked).toBe('***');
    });

    it('should show first 8 chars for 9+ character tokens', () => {
      const config = new CloudflareConfig('account', '123456789abc');
      const masked = config.getMaskedToken();

      expect(masked).toBe('12345678...');
    });
  });
});
