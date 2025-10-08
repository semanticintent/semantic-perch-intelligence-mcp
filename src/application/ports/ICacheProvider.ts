/**
 * 🎯 SEMANTIC INTENT: Port for caching domain entities
 *
 * WHY: Cache provider abstracts caching implementation from application layer
 * - Enables time-based caching to avoid repeated API calls
 * - Generic to support any domain entity type
 * - TTL (time-to-live) semantic preserves cache freshness intent
 *
 * OBSERVABLE PROPERTIES:
 * - key: Observable cache identifier
 * - value: Cached domain entity (typed)
 * - ttl: Observable expiration time in seconds
 *
 * SEMANTIC ANCHORING: Cache expiration based on observable time
 * IMMUTABILITY: Cached entities should be frozen before storage
 */

export interface ICacheProvider {
	/**
	 * Get cached value by key
	 *
	 * @param key Cache key (observable identifier)
	 * @returns Cached value if exists and not expired, undefined otherwise
	 *
	 * Semantic: Returns undefined if key doesn't exist or expired
	 */
	get<T>(key: string): Promise<T | undefined>;

	/**
	 * Set cache value with TTL
	 *
	 * @param key Cache key (observable identifier)
	 * @param value Value to cache (should be frozen domain entity)
	 * @param ttl Time-to-live in seconds (observable expiration)
	 *
	 * Semantic: TTL of 0 means cache indefinitely (use with caution)
	 */
	set<T>(key: string, value: T, ttl: number): Promise<void>;

	/**
	 * Delete cached value by key
	 *
	 * @param key Cache key (observable identifier)
	 *
	 * Semantic: Idempotent - no error if key doesn't exist
	 */
	delete(key: string): Promise<void>;

	/**
	 * Clear all cached values
	 *
	 * Semantic: Removes all cache entries
	 */
	clear(): Promise<void>;

	/**
	 * Check if key exists in cache (and not expired)
	 *
	 * @param key Cache key (observable identifier)
	 * @returns true if key exists and not expired
	 *
	 * Observable: Existence is directly observable
	 */
	has(key: string): Promise<boolean>;
}
