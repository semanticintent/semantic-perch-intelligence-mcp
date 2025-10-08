"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ForeignKey_1 = require("./ForeignKey");
(0, vitest_1.describe)('ForeignKey', () => {
    (0, vitest_1.it)('should create foreign key with all parameters', () => {
        const fk = new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        (0, vitest_1.expect)(fk.table).toBe('posts');
        (0, vitest_1.expect)(fk.column).toBe('user_id');
        (0, vitest_1.expect)(fk.referencesTable).toBe('users');
        (0, vitest_1.expect)(fk.referencesColumn).toBe('id');
        (0, vitest_1.expect)(fk.onDelete).toBe('CASCADE');
        (0, vitest_1.expect)(fk.onUpdate).toBe('CASCADE');
    });
    (0, vitest_1.it)('should create foreign key with null actions', () => {
        const fk = new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id');
        (0, vitest_1.expect)(fk.onDelete).toBe(null);
        (0, vitest_1.expect)(fk.onUpdate).toBe(null);
    });
    (0, vitest_1.it)('should throw error for empty table name', () => {
        (0, vitest_1.expect)(() => new ForeignKey_1.ForeignKey('', 'user_id', 'users', 'id')).toThrow('Foreign key table name cannot be empty');
    });
    (0, vitest_1.it)('should throw error for empty column name', () => {
        (0, vitest_1.expect)(() => new ForeignKey_1.ForeignKey('posts', '', 'users', 'id')).toThrow('Foreign key column name cannot be empty');
    });
    (0, vitest_1.it)('should be immutable', () => {
        const fk = new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id');
        (0, vitest_1.expect)(Object.isFrozen(fk)).toBe(true);
    });
    (0, vitest_1.it)('should detect required relationship with CASCADE', () => {
        const fk = new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id', 'CASCADE');
        (0, vitest_1.expect)(fk.isRequired()).toBe(true);
    });
    (0, vitest_1.it)('should detect required relationship with RESTRICT', () => {
        const fk = new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id', 'RESTRICT');
        (0, vitest_1.expect)(fk.isRequired()).toBe(true);
    });
    (0, vitest_1.it)('should detect cascade on delete', () => {
        const fk = new ForeignKey_1.ForeignKey('posts', 'user_id', 'users', 'id', 'CASCADE');
        (0, vitest_1.expect)(fk.cascadesOnDelete()).toBe(true);
    });
});
//# sourceMappingURL=ForeignKey.test.js.map