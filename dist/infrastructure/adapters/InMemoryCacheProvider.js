"use strict";
/**
 * InMemoryCacheProvider.ts
 *
 * @semantic-intent Infrastructure adapter implementing ICacheProvider port
 * In-memory caching with TTL support for domain entities
 *
 * @observable-anchoring
 * - Uses Map for O(1) key-value lookup
 * - Stores expiration timestamps as observable markers
 * - Checks Date.now() for expiration (observable time)
 *
 * @intent-preservation
 * - TTL semantics preserved through expiration timestamps
 * - Cache entries maintain immutability of stored entities
 * - Expired entries treated as non-existent (semantic consistency)
 *
 * @semantic-over-structural
 * - Focuses on cache freshness semantics, not memory optimization
 * - Expiration based on semantic time intent, not access patterns
 *
 * @immutability-protection
 * - Stores values as-is (expects frozen entities)
 * - No mutation of cache state during reads
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryCacheProvider = void 0;
/**
 * In-memory cache provider with TTL support
 *
 * Semantic Intent: Fast, process-local caching for domain entities
 * Observable Anchoring: Expiration based on Date.now() comparison
 */
class InMemoryCacheProvider {
    cache;
    constructor() {
        this.cache = new Map();
        Object.freeze(this);
    }
    /**
     * Get cached value by key
     *
     * Semantic: Returns undefined if expired (treats as non-existent)
     */
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        // Observable: Check if expired based on current time
        const now = Date.now();
        if (entry.expiresAt > 0 && now >= entry.expiresAt) {
            // Semantic: Expired entries are removed
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }
    /**
     * Set cache value with TTL
     *
     * Semantic: TTL of 0 means cache indefinitely (expiresAt = 0)
     */
    async set(key, value, ttl) {
        if (ttl < 0) {
            throw new Error('TTL cannot be negative');
        }
        // Observable: Calculate expiration timestamp
        const expiresAt = ttl === 0 ? 0 : Date.now() + ttl * 1000;
        const entry = {
            value,
            expiresAt,
        };
        this.cache.set(key, entry);
    }
    /**
     * Delete cached value by key
     *
     * Semantic: Idempotent - no error if key doesn't exist
     */
    async delete(key) {
        this.cache.delete(key);
    }
    /**
     * Clear all cached values
     *
     * Semantic: Removes all cache entries
     */
    async clear() {
        this.cache.clear();
    }
    /**
     * Check if key exists in cache (and not expired)
     *
     * Observable: Existence checked via get() which handles expiration
     */
    async has(key) {
        const value = await this.get(key);
        return value !== undefined;
    }
    /**
     * Get cache size (number of entries, including expired)
     *
     * Observable: Map size is directly observable
     * Note: May include expired entries that haven't been accessed yet
     */
    getSize() {
        return this.cache.size;
    }
    /**
     * Clean up expired entries
     *
     * Semantic: Removes all expired entries to free memory
     * Observable: Iterates through cache and checks expiration timestamps
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt > 0 && now >= entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}
exports.InMemoryCacheProvider = InMemoryCacheProvider;
//# sourceMappingURL=InMemoryCacheProvider.js.map