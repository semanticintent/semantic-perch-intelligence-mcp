"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=ICacheProvider.js.map