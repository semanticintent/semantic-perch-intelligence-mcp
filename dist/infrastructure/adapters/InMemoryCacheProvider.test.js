"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const InMemoryCacheProvider_1 = require("./InMemoryCacheProvider");
(0, vitest_1.describe)('InMemoryCacheProvider', () => {
    let cache;
    (0, vitest_1.beforeEach)(() => {
        cache = new InMemoryCacheProvider_1.InMemoryCacheProvider();
        vitest_1.vi.useFakeTimers();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
    });
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create empty cache', () => {
            (0, vitest_1.expect)(cache.getSize()).toBe(0);
        });
        (0, vitest_1.it)('should freeze instance', () => {
            (0, vitest_1.expect)(Object.isFrozen(cache)).toBe(true);
        });
    });
    (0, vitest_1.describe)('set() and get()', () => {
        (0, vitest_1.it)('should store and retrieve value', async () => {
            await cache.set('key1', 'value1', 60);
            const value = await cache.get('key1');
            (0, vitest_1.expect)(value).toBe('value1');
        });
        (0, vitest_1.it)('should store complex objects', async () => {
            const obj = { name: 'test', count: 42 };
            await cache.set('obj1', obj, 60);
            const value = await cache.get('obj1');
            (0, vitest_1.expect)(value).toEqual(obj);
        });
        (0, vitest_1.it)('should return undefined for non-existent key', async () => {
            const value = await cache.get('nonexistent');
            (0, vitest_1.expect)(value).toBeUndefined();
        });
        (0, vitest_1.it)('should overwrite existing key', async () => {
            await cache.set('key1', 'value1', 60);
            await cache.set('key1', 'value2', 60);
            const value = await cache.get('key1');
            (0, vitest_1.expect)(value).toBe('value2');
        });
    });
    (0, vitest_1.describe)('TTL expiration', () => {
        (0, vitest_1.it)('should expire after TTL', async () => {
            await cache.set('key1', 'value1', 10); // 10 seconds
            // Before expiration
            let value = await cache.get('key1');
            (0, vitest_1.expect)(value).toBe('value1');
            // Advance time by 9 seconds (not expired yet)
            vitest_1.vi.advanceTimersByTime(9000);
            value = await cache.get('key1');
            (0, vitest_1.expect)(value).toBe('value1');
            // Advance time by 2 more seconds (expired)
            vitest_1.vi.advanceTimersByTime(2000);
            value = await cache.get('key1');
            (0, vitest_1.expect)(value).toBeUndefined();
        });
        (0, vitest_1.it)('should never expire with TTL of 0', async () => {
            await cache.set('key1', 'value1', 0);
            // Advance time by 1 year
            vitest_1.vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000);
            const value = await cache.get('key1');
            (0, vitest_1.expect)(value).toBe('value1');
        });
        (0, vitest_1.it)('should remove expired entry from cache', async () => {
            await cache.set('key1', 'value1', 10);
            (0, vitest_1.expect)(cache.getSize()).toBe(1);
            // Expire the entry
            vitest_1.vi.advanceTimersByTime(11000);
            await cache.get('key1');
            // Entry should be removed
            (0, vitest_1.expect)(cache.getSize()).toBe(0);
        });
        (0, vitest_1.it)('should throw error for negative TTL', async () => {
            await (0, vitest_1.expect)(cache.set('key1', 'value1', -1)).rejects.toThrow('TTL cannot be negative');
        });
    });
    (0, vitest_1.describe)('delete()', () => {
        (0, vitest_1.it)('should delete existing key', async () => {
            await cache.set('key1', 'value1', 60);
            await cache.delete('key1');
            const value = await cache.get('key1');
            (0, vitest_1.expect)(value).toBeUndefined();
        });
        (0, vitest_1.it)('should be idempotent for non-existent key', async () => {
            await cache.delete('nonexistent');
            // Should not throw error
        });
        (0, vitest_1.it)('should decrease cache size', async () => {
            await cache.set('key1', 'value1', 60);
            (0, vitest_1.expect)(cache.getSize()).toBe(1);
            await cache.delete('key1');
            (0, vitest_1.expect)(cache.getSize()).toBe(0);
        });
    });
    (0, vitest_1.describe)('clear()', () => {
        (0, vitest_1.it)('should remove all entries', async () => {
            await cache.set('key1', 'value1', 60);
            await cache.set('key2', 'value2', 60);
            await cache.set('key3', 'value3', 60);
            (0, vitest_1.expect)(cache.getSize()).toBe(3);
            await cache.clear();
            (0, vitest_1.expect)(cache.getSize()).toBe(0);
        });
        (0, vitest_1.it)('should work on empty cache', async () => {
            await cache.clear();
            (0, vitest_1.expect)(cache.getSize()).toBe(0);
        });
    });
    (0, vitest_1.describe)('has()', () => {
        (0, vitest_1.it)('should return true for existing key', async () => {
            await cache.set('key1', 'value1', 60);
            const exists = await cache.has('key1');
            (0, vitest_1.expect)(exists).toBe(true);
        });
        (0, vitest_1.it)('should return false for non-existent key', async () => {
            const exists = await cache.has('nonexistent');
            (0, vitest_1.expect)(exists).toBe(false);
        });
        (0, vitest_1.it)('should return false for expired key', async () => {
            await cache.set('key1', 'value1', 10);
            // Expire the entry
            vitest_1.vi.advanceTimersByTime(11000);
            const exists = await cache.has('key1');
            (0, vitest_1.expect)(exists).toBe(false);
        });
    });
    (0, vitest_1.describe)('cleanup()', () => {
        (0, vitest_1.it)('should remove all expired entries', async () => {
            await cache.set('key1', 'value1', 10); // Expires in 10s
            await cache.set('key2', 'value2', 20); // Expires in 20s
            await cache.set('key3', 'value3', 0); // Never expires
            (0, vitest_1.expect)(cache.getSize()).toBe(3);
            // Advance time by 15 seconds (key1 expired, key2 not yet)
            vitest_1.vi.advanceTimersByTime(15000);
            cache.cleanup();
            (0, vitest_1.expect)(cache.getSize()).toBe(2);
            // Verify correct keys remain
            (0, vitest_1.expect)(await cache.get('key1')).toBeUndefined();
            (0, vitest_1.expect)(await cache.get('key2')).toBe('value2');
            (0, vitest_1.expect)(await cache.get('key3')).toBe('value3');
        });
        (0, vitest_1.it)('should work on empty cache', () => {
            cache.cleanup();
            (0, vitest_1.expect)(cache.getSize()).toBe(0);
        });
        (0, vitest_1.it)('should not remove non-expired entries', async () => {
            await cache.set('key1', 'value1', 60);
            await cache.set('key2', 'value2', 60);
            cache.cleanup();
            (0, vitest_1.expect)(cache.getSize()).toBe(2);
        });
    });
    (0, vitest_1.describe)('getSize()', () => {
        (0, vitest_1.it)('should return 0 for empty cache', () => {
            (0, vitest_1.expect)(cache.getSize()).toBe(0);
        });
        (0, vitest_1.it)('should return correct count', async () => {
            await cache.set('key1', 'value1', 60);
            (0, vitest_1.expect)(cache.getSize()).toBe(1);
            await cache.set('key2', 'value2', 60);
            (0, vitest_1.expect)(cache.getSize()).toBe(2);
        });
        (0, vitest_1.it)('should include expired entries until accessed or cleaned', async () => {
            await cache.set('key1', 'value1', 10);
            // Expire the entry
            vitest_1.vi.advanceTimersByTime(11000);
            // Size still includes expired entry
            (0, vitest_1.expect)(cache.getSize()).toBe(1);
            // Access triggers removal
            await cache.get('key1');
            (0, vitest_1.expect)(cache.getSize()).toBe(0);
        });
    });
    (0, vitest_1.describe)('multiple concurrent operations', () => {
        (0, vitest_1.it)('should handle multiple keys independently', async () => {
            await cache.set('key1', 'value1', 10);
            await cache.set('key2', 'value2', 20);
            await cache.set('key3', 'value3', 30);
            // Advance to expire key1 only
            vitest_1.vi.advanceTimersByTime(11000);
            (0, vitest_1.expect)(await cache.get('key1')).toBeUndefined();
            (0, vitest_1.expect)(await cache.get('key2')).toBe('value2');
            (0, vitest_1.expect)(await cache.get('key3')).toBe('value3');
        });
        (0, vitest_1.it)('should handle mixed operations', async () => {
            await cache.set('key1', 'value1', 60);
            await cache.set('key2', 'value2', 60);
            (0, vitest_1.expect)(await cache.has('key1')).toBe(true);
            await cache.delete('key1');
            (0, vitest_1.expect)(await cache.has('key1')).toBe(false);
            (0, vitest_1.expect)(await cache.has('key2')).toBe(true);
            await cache.clear();
            (0, vitest_1.expect)(await cache.has('key2')).toBe(false);
            (0, vitest_1.expect)(cache.getSize()).toBe(0);
        });
    });
    (0, vitest_1.describe)('domain entity caching', () => {
        (0, vitest_1.it)('should cache frozen domain entities', async () => {
            const entity = Object.freeze({
                id: '123',
                name: 'Test Entity',
                createdAt: new Date(),
            });
            await cache.set('entity:123', entity, 60);
            const cached = await cache.get('entity:123');
            (0, vitest_1.expect)(cached).toEqual(entity);
            (0, vitest_1.expect)(Object.isFrozen(cached)).toBe(true);
        });
        (0, vitest_1.it)('should cache arrays of entities', async () => {
            const entities = Object.freeze([
                Object.freeze({ id: '1', name: 'Entity 1' }),
                Object.freeze({ id: '2', name: 'Entity 2' }),
            ]);
            await cache.set('entities:all', entities, 60);
            const cached = await cache.get('entities:all');
            (0, vitest_1.expect)(cached).toEqual(entities);
            (0, vitest_1.expect)(cached?.length).toBe(2);
        });
    });
});
//# sourceMappingURL=InMemoryCacheProvider.test.js.map