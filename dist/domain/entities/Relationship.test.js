"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const Relationship_1 = require("./Relationship");
(0, vitest_1.describe)('Relationship', () => {
    (0, vitest_1.describe)('constructor', () => {
        (0, vitest_1.it)('should create relationship with all parameters', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id', 'CASCADE', 'CASCADE');
            (0, vitest_1.expect)(rel.fromTable).toBe('posts');
            (0, vitest_1.expect)(rel.fromColumn).toBe('user_id');
            (0, vitest_1.expect)(rel.toTable).toBe('users');
            (0, vitest_1.expect)(rel.toColumn).toBe('id');
            (0, vitest_1.expect)(rel.onDelete).toBe('CASCADE');
            (0, vitest_1.expect)(rel.onUpdate).toBe('CASCADE');
        });
        (0, vitest_1.it)('should create relationship with null actions', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id');
            (0, vitest_1.expect)(rel.onDelete).toBe(null);
            (0, vitest_1.expect)(rel.onUpdate).toBe(null);
        });
        (0, vitest_1.it)('should trim whitespace', () => {
            const rel = new Relationship_1.Relationship('  posts  ', '  user_id  ', '  users  ', '  id  ');
            (0, vitest_1.expect)(rel.fromTable).toBe('posts');
            (0, vitest_1.expect)(rel.fromColumn).toBe('user_id');
            (0, vitest_1.expect)(rel.toTable).toBe('users');
            (0, vitest_1.expect)(rel.toColumn).toBe('id');
        });
        (0, vitest_1.it)('should throw error for empty fromTable', () => {
            (0, vitest_1.expect)(() => new Relationship_1.Relationship('', 'user_id', 'users', 'id')).toThrow('Relationship fromTable cannot be empty');
        });
        (0, vitest_1.it)('should throw error for empty fromColumn', () => {
            (0, vitest_1.expect)(() => new Relationship_1.Relationship('posts', '', 'users', 'id')).toThrow('Relationship fromColumn cannot be empty');
        });
        (0, vitest_1.it)('should throw error for empty toTable', () => {
            (0, vitest_1.expect)(() => new Relationship_1.Relationship('posts', 'user_id', '', 'id')).toThrow('Relationship toTable cannot be empty');
        });
        (0, vitest_1.it)('should throw error for empty toColumn', () => {
            (0, vitest_1.expect)(() => new Relationship_1.Relationship('posts', 'user_id', 'users', '')).toThrow('Relationship toColumn cannot be empty');
        });
        (0, vitest_1.it)('should be immutable', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id');
            (0, vitest_1.expect)(Object.isFrozen(rel)).toBe(true);
        });
    });
    (0, vitest_1.describe)('isRequired()', () => {
        (0, vitest_1.it)('should return true for CASCADE', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id', 'CASCADE');
            (0, vitest_1.expect)(rel.isRequired()).toBe(true);
        });
        (0, vitest_1.it)('should return true for RESTRICT', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id', 'RESTRICT');
            (0, vitest_1.expect)(rel.isRequired()).toBe(true);
        });
        (0, vitest_1.it)('should return false for SET NULL', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id', 'SET NULL');
            (0, vitest_1.expect)(rel.isRequired()).toBe(false);
        });
        (0, vitest_1.it)('should return false for null', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id', null);
            (0, vitest_1.expect)(rel.isRequired()).toBe(false);
        });
    });
    (0, vitest_1.describe)('cascadesOnDelete()', () => {
        (0, vitest_1.it)('should return true for CASCADE', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id', 'CASCADE');
            (0, vitest_1.expect)(rel.cascadesOnDelete()).toBe(true);
        });
        (0, vitest_1.it)('should return false for RESTRICT', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id', 'RESTRICT');
            (0, vitest_1.expect)(rel.cascadesOnDelete()).toBe(false);
        });
        (0, vitest_1.it)('should return false for null', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id');
            (0, vitest_1.expect)(rel.cascadesOnDelete()).toBe(false);
        });
    });
    (0, vitest_1.describe)('isOptional()', () => {
        (0, vitest_1.it)('should return true for SET NULL', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id', 'SET NULL');
            (0, vitest_1.expect)(rel.isOptional()).toBe(true);
        });
        (0, vitest_1.it)('should return true for NO ACTION', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id', 'NO ACTION');
            (0, vitest_1.expect)(rel.isOptional()).toBe(true);
        });
        (0, vitest_1.it)('should return true for null', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id', null);
            (0, vitest_1.expect)(rel.isOptional()).toBe(true);
        });
        (0, vitest_1.it)('should return false for CASCADE', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id', 'CASCADE');
            (0, vitest_1.expect)(rel.isOptional()).toBe(false);
        });
        (0, vitest_1.it)('should return false for RESTRICT', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id', 'RESTRICT');
            (0, vitest_1.expect)(rel.isOptional()).toBe(false);
        });
    });
    (0, vitest_1.describe)('getDescription()', () => {
        (0, vitest_1.it)('should return relationship description', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id');
            (0, vitest_1.expect)(rel.getDescription()).toBe('posts.user_id → users.id');
        });
    });
    (0, vitest_1.describe)('isSelfReferential()', () => {
        (0, vitest_1.it)('should return true for self-referential relationship', () => {
            const rel = new Relationship_1.Relationship('categories', 'parent_id', 'categories', 'id');
            (0, vitest_1.expect)(rel.isSelfReferential()).toBe(true);
        });
        (0, vitest_1.it)('should return false for relationship between different tables', () => {
            const rel = new Relationship_1.Relationship('posts', 'user_id', 'users', 'id');
            (0, vitest_1.expect)(rel.isSelfReferential()).toBe(false);
        });
    });
});
//# sourceMappingURL=Relationship.test.js.map