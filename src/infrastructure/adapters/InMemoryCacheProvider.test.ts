import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InMemoryCacheProvider } from './InMemoryCacheProvider';

describe('InMemoryCacheProvider', () => {
	let cache: InMemoryCacheProvider;

	beforeEach(() => {
		cache = new InMemoryCacheProvider();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('constructor', () => {
		it('should create empty cache', () => {
			expect(cache.getSize()).toBe(0);
		});

		it('should freeze instance', () => {
			expect(Object.isFrozen(cache)).toBe(true);
		});
	});

	describe('set() and get()', () => {
		it('should store and retrieve value', async () => {
			await cache.set('key1', 'value1', 60);
			const value = await cache.get<string>('key1');

			expect(value).toBe('value1');
		});

		it('should store complex objects', async () => {
			const obj = { name: 'test', count: 42 };
			await cache.set('obj1', obj, 60);
			const value = await cache.get<typeof obj>('obj1');

			expect(value).toEqual(obj);
		});

		it('should return undefined for non-existent key', async () => {
			const value = await cache.get('nonexistent');

			expect(value).toBeUndefined();
		});

		it('should overwrite existing key', async () => {
			await cache.set('key1', 'value1', 60);
			await cache.set('key1', 'value2', 60);
			const value = await cache.get<string>('key1');

			expect(value).toBe('value2');
		});
	});

	describe('TTL expiration', () => {
		it('should expire after TTL', async () => {
			await cache.set('key1', 'value1', 10); // 10 seconds

			// Before expiration
			let value = await cache.get<string>('key1');
			expect(value).toBe('value1');

			// Advance time by 9 seconds (not expired yet)
			vi.advanceTimersByTime(9000);
			value = await cache.get<string>('key1');
			expect(value).toBe('value1');

			// Advance time by 2 more seconds (expired)
			vi.advanceTimersByTime(2000);
			value = await cache.get<string>('key1');
			expect(value).toBeUndefined();
		});

		it('should never expire with TTL of 0', async () => {
			await cache.set('key1', 'value1', 0);

			// Advance time by 1 year
			vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000);

			const value = await cache.get<string>('key1');
			expect(value).toBe('value1');
		});

		it('should remove expired entry from cache', async () => {
			await cache.set('key1', 'value1', 10);

			expect(cache.getSize()).toBe(1);

			// Expire the entry
			vi.advanceTimersByTime(11000);
			await cache.get('key1');

			// Entry should be removed
			expect(cache.getSize()).toBe(0);
		});

		it('should throw error for negative TTL', async () => {
			await expect(cache.set('key1', 'value1', -1)).rejects.toThrow('TTL cannot be negative');
		});
	});

	describe('delete()', () => {
		it('should delete existing key', async () => {
			await cache.set('key1', 'value1', 60);
			await cache.delete('key1');

			const value = await cache.get('key1');
			expect(value).toBeUndefined();
		});

		it('should be idempotent for non-existent key', async () => {
			await cache.delete('nonexistent');
			// Should not throw error
		});

		it('should decrease cache size', async () => {
			await cache.set('key1', 'value1', 60);
			expect(cache.getSize()).toBe(1);

			await cache.delete('key1');
			expect(cache.getSize()).toBe(0);
		});
	});

	describe('clear()', () => {
		it('should remove all entries', async () => {
			await cache.set('key1', 'value1', 60);
			await cache.set('key2', 'value2', 60);
			await cache.set('key3', 'value3', 60);

			expect(cache.getSize()).toBe(3);

			await cache.clear();
			expect(cache.getSize()).toBe(0);
		});

		it('should work on empty cache', async () => {
			await cache.clear();
			expect(cache.getSize()).toBe(0);
		});
	});

	describe('has()', () => {
		it('should return true for existing key', async () => {
			await cache.set('key1', 'value1', 60);

			const exists = await cache.has('key1');
			expect(exists).toBe(true);
		});

		it('should return false for non-existent key', async () => {
			const exists = await cache.has('nonexistent');
			expect(exists).toBe(false);
		});

		it('should return false for expired key', async () => {
			await cache.set('key1', 'value1', 10);

			// Expire the entry
			vi.advanceTimersByTime(11000);

			const exists = await cache.has('key1');
			expect(exists).toBe(false);
		});
	});

	describe('cleanup()', () => {
		it('should remove all expired entries', async () => {
			await cache.set('key1', 'value1', 10); // Expires in 10s
			await cache.set('key2', 'value2', 20); // Expires in 20s
			await cache.set('key3', 'value3', 0); // Never expires

			expect(cache.getSize()).toBe(3);

			// Advance time by 15 seconds (key1 expired, key2 not yet)
			vi.advanceTimersByTime(15000);

			cache.cleanup();

			expect(cache.getSize()).toBe(2);

			// Verify correct keys remain
			expect(await cache.get('key1')).toBeUndefined();
			expect(await cache.get('key2')).toBe('value2');
			expect(await cache.get('key3')).toBe('value3');
		});

		it('should work on empty cache', () => {
			cache.cleanup();
			expect(cache.getSize()).toBe(0);
		});

		it('should not remove non-expired entries', async () => {
			await cache.set('key1', 'value1', 60);
			await cache.set('key2', 'value2', 60);

			cache.cleanup();

			expect(cache.getSize()).toBe(2);
		});
	});

	describe('getSize()', () => {
		it('should return 0 for empty cache', () => {
			expect(cache.getSize()).toBe(0);
		});

		it('should return correct count', async () => {
			await cache.set('key1', 'value1', 60);
			expect(cache.getSize()).toBe(1);

			await cache.set('key2', 'value2', 60);
			expect(cache.getSize()).toBe(2);
		});

		it('should include expired entries until accessed or cleaned', async () => {
			await cache.set('key1', 'value1', 10);

			// Expire the entry
			vi.advanceTimersByTime(11000);

			// Size still includes expired entry
			expect(cache.getSize()).toBe(1);

			// Access triggers removal
			await cache.get('key1');
			expect(cache.getSize()).toBe(0);
		});
	});

	describe('multiple concurrent operations', () => {
		it('should handle multiple keys independently', async () => {
			await cache.set('key1', 'value1', 10);
			await cache.set('key2', 'value2', 20);
			await cache.set('key3', 'value3', 30);

			// Advance to expire key1 only
			vi.advanceTimersByTime(11000);

			expect(await cache.get('key1')).toBeUndefined();
			expect(await cache.get('key2')).toBe('value2');
			expect(await cache.get('key3')).toBe('value3');
		});

		it('should handle mixed operations', async () => {
			await cache.set('key1', 'value1', 60);
			await cache.set('key2', 'value2', 60);

			expect(await cache.has('key1')).toBe(true);

			await cache.delete('key1');

			expect(await cache.has('key1')).toBe(false);
			expect(await cache.has('key2')).toBe(true);

			await cache.clear();

			expect(await cache.has('key2')).toBe(false);
			expect(cache.getSize()).toBe(0);
		});
	});

	describe('domain entity caching', () => {
		it('should cache frozen domain entities', async () => {
			const entity = Object.freeze({
				id: '123',
				name: 'Test Entity',
				createdAt: new Date(),
			});

			await cache.set('entity:123', entity, 60);

			const cached = await cache.get<typeof entity>('entity:123');

			expect(cached).toEqual(entity);
			expect(Object.isFrozen(cached)).toBe(true);
		});

		it('should cache arrays of entities', async () => {
			const entities = Object.freeze([
				Object.freeze({ id: '1', name: 'Entity 1' }),
				Object.freeze({ id: '2', name: 'Entity 2' }),
			]);

			await cache.set('entities:all', entities, 60);

			const cached = await cache.get<typeof entities>('entities:all');

			expect(cached).toEqual(entities);
			expect(cached?.length).toBe(2);
		});
	});
});
