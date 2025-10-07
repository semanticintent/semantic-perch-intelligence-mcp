import { describe, it, expect } from 'vitest';
import { ForeignKey } from './ForeignKey';

describe('ForeignKey', () => {
  it('should create foreign key with all parameters', () => {
    const fk = new ForeignKey('posts', 'user_id', 'users', 'id', 'CASCADE', 'CASCADE');

    expect(fk.table).toBe('posts');
    expect(fk.column).toBe('user_id');
    expect(fk.referencesTable).toBe('users');
    expect(fk.referencesColumn).toBe('id');
    expect(fk.onDelete).toBe('CASCADE');
    expect(fk.onUpdate).toBe('CASCADE');
  });

  it('should create foreign key with null actions', () => {
    const fk = new ForeignKey('posts', 'user_id', 'users', 'id');

    expect(fk.onDelete).toBe(null);
    expect(fk.onUpdate).toBe(null);
  });

  it('should throw error for empty table name', () => {
    expect(() => new ForeignKey('', 'user_id', 'users', 'id')).toThrow(
      'Foreign key table name cannot be empty'
    );
  });

  it('should throw error for empty column name', () => {
    expect(() => new ForeignKey('posts', '', 'users', 'id')).toThrow(
      'Foreign key column name cannot be empty'
    );
  });

  it('should be immutable', () => {
    const fk = new ForeignKey('posts', 'user_id', 'users', 'id');

    expect(Object.isFrozen(fk)).toBe(true);
  });

  it('should detect required relationship with CASCADE', () => {
    const fk = new ForeignKey('posts', 'user_id', 'users', 'id', 'CASCADE');

    expect(fk.isRequired()).toBe(true);
  });

  it('should detect required relationship with RESTRICT', () => {
    const fk = new ForeignKey('posts', 'user_id', 'users', 'id', 'RESTRICT');

    expect(fk.isRequired()).toBe(true);
  });

  it('should detect cascade on delete', () => {
    const fk = new ForeignKey('posts', 'user_id', 'users', 'id', 'CASCADE');

    expect(fk.cascadesOnDelete()).toBe(true);
  });
});
