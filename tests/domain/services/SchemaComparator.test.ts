import { describe, it, expect } from 'vitest';
import { SchemaComparator } from '../../../src/domain/services/SchemaComparator';
import { DatabaseSchema } from '../../../src/domain/entities/DatabaseSchema';
import { TableInfo } from '../../../src/domain/entities/TableInfo';
import { Column } from '../../../src/domain/entities/Column';
import { Index } from '../../../src/domain/entities/Index';
import { ForeignKey } from '../../../src/domain/entities/ForeignKey';

describe('SchemaComparator', () => {
  const comparator = new SchemaComparator();

  const createColumn = (name: string, type: string, notNull = false, primaryKey = false): Column => {
    return new Column(name, type, notNull, primaryKey);
  };

  const createTable = (
    name: string,
    columns: Column[],
    indexes: Index[] = [],
    foreignKeys: ForeignKey[] = []
  ): TableInfo => {
    return new TableInfo(name, columns, indexes, foreignKeys);
  };

  describe('compare() - identical schemas', () => {
    it('should return no differences for identical schemas', () => {
      const table = createTable('users', [createColumn('id', 'INTEGER', false, true), createColumn('name', 'TEXT')]);

      const sourceSchema = new DatabaseSchema([table], []);
      const targetSchema = new DatabaseSchema([table], []);

      const result = comparator.compare(sourceSchema, targetSchema, 'development', 'production');

      expect(result.isIdentical()).toBe(true);
      expect(result.differences).toHaveLength(0);
      expect(result.summary.totalDifferences).toBe(0);
    });
  });

  describe('compare() - missing tables', () => {
    it('should detect table missing in target', () => {
      const usersTable = createTable('users', [createColumn('id', 'INTEGER', false, true)]);
      const ordersTable = createTable('orders', [createColumn('id', 'INTEGER', false, true)]);

      const sourceSchema = new DatabaseSchema([usersTable, ordersTable], []);
      const targetSchema = new DatabaseSchema([usersTable], []);

      const result = comparator.compare(sourceSchema, targetSchema, 'development', 'production');

      expect(result.isIdentical()).toBe(false);
      expect(result.summary.missingTables).toBe(1);

      const missingTable = result.differences.find((d) => d.type === 'missing_table');
      expect(missingTable).toBeDefined();
      expect(missingTable!.location.tableName).toBe('orders');
      expect(missingTable!.isCritical()).toBe(true); // Production + missing table
    });

    it('should detect extra table in target', () => {
      const usersTable = createTable('users', [createColumn('id', 'INTEGER', false, true)]);
      const ordersTable = createTable('orders', [createColumn('id', 'INTEGER', false, true)]);

      const sourceSchema = new DatabaseSchema([usersTable], []);
      const targetSchema = new DatabaseSchema([usersTable, ordersTable], []);

      const result = comparator.compare(sourceSchema, targetSchema, 'development', 'production');

      expect(result.isIdentical()).toBe(false);
      const extraTable = result.differences.find((d) => d.type === 'extra_table');
      expect(extraTable).toBeDefined();
      expect(extraTable!.location.tableName).toBe('orders');
    });
  });

  describe('compare() - missing columns', () => {
    it('should detect column missing in target', () => {
      const sourceTable = createTable('users', [
        createColumn('id', 'INTEGER', false, true),
        createColumn('email', 'TEXT'),
        createColumn('name', 'TEXT'),
      ]);

      const targetTable = createTable('users', [createColumn('id', 'INTEGER', false, true), createColumn('name', 'TEXT')]);

      const sourceSchema = new DatabaseSchema([sourceTable], []);
      const targetSchema = new DatabaseSchema([targetTable], []);

      const result = comparator.compare(sourceSchema, targetSchema, 'staging', 'production');

      expect(result.summary.missingColumns).toBe(1);

      const missingColumn = result.differences.find((d) => d.type === 'missing_column');
      expect(missingColumn).toBeDefined();
      expect(missingColumn!.location.columnName).toBe('email');
      expect(missingColumn!.getMigrationSQL()).toContain('ALTER TABLE users ADD COLUMN email TEXT');
    });

    it('should detect extra column in target', () => {
      const sourceTable = createTable('users', [createColumn('id', 'INTEGER', false, true), createColumn('name', 'TEXT')]);

      const targetTable = createTable('users', [
        createColumn('id', 'INTEGER', false, true),
        createColumn('name', 'TEXT'),
        createColumn('email', 'TEXT'),
      ]);

      const sourceSchema = new DatabaseSchema([sourceTable], []);
      const targetSchema = new DatabaseSchema([targetTable], []);

      const result = comparator.compare(sourceSchema, targetSchema, 'development', 'production');

      const extraColumn = result.differences.find((d) => d.type === 'extra_column');
      expect(extraColumn).toBeDefined();
      expect(extraColumn!.location.columnName).toBe('email');
    });
  });

  describe('compare() - type mismatches', () => {
    it('should detect column type mismatch', () => {
      const sourceTable = createTable('users', [
        createColumn('id', 'INTEGER', false, true),
        createColumn('age', 'INTEGER'),
      ]);

      const targetTable = createTable('users', [
        createColumn('id', 'INTEGER', false, true),
        createColumn('age', 'TEXT'),
      ]);

      const sourceSchema = new DatabaseSchema([sourceTable], []);
      const targetSchema = new DatabaseSchema([targetTable], []);

      const result = comparator.compare(sourceSchema, targetSchema, 'development', 'production');

      expect(result.summary.typeMismatches).toBe(1);

      const typeMismatch = result.differences.find((d) => d.type === 'type_mismatch');
      expect(typeMismatch).toBeDefined();
      expect(typeMismatch!.location.sourceValue).toBe('INTEGER');
      expect(typeMismatch!.location.targetValue).toBe('TEXT');
    });

    it('should normalize similar types as same', () => {
      // SQLite treats VARCHAR as TEXT
      const sourceTable = createTable('users', [createColumn('name', 'VARCHAR(255)')]);
      const targetTable = createTable('users', [createColumn('name', 'TEXT')]);

      const sourceSchema = new DatabaseSchema([sourceTable], []);
      const targetSchema = new DatabaseSchema([targetTable], []);

      const result = comparator.compare(sourceSchema, targetSchema, 'development', 'production');

      // Should not detect type mismatch since both normalize to TEXT
      expect(result.summary.typeMismatches).toBe(0);
    });
  });

  describe('compare() - missing indexes', () => {
    it('should detect index missing in target', () => {
      const sourceTable = createTable(
        'users',
        [createColumn('id', 'INTEGER', false, true), createColumn('email', 'TEXT')],
        [new Index('idx_users_email', 'users', ['email'], false)]
      );

      const targetTable = createTable('users', [
        createColumn('id', 'INTEGER', false, true),
        createColumn('email', 'TEXT'),
      ]);

      const sourceSchema = new DatabaseSchema([sourceTable], []);
      const targetSchema = new DatabaseSchema([targetTable], []);

      const result = comparator.compare(sourceSchema, targetSchema, 'staging', 'production');

      expect(result.summary.missingIndexes).toBe(1);

      const missingIndex = result.differences.find((d) => d.type === 'missing_index');
      expect(missingIndex).toBeDefined();
      expect(missingIndex!.getMigrationSQL()).toContain('CREATE INDEX');
    });
  });

  describe('compare() - missing foreign keys', () => {
    it('should detect foreign key missing in target', () => {
      const sourceTable = createTable(
        'orders',
        [
          createColumn('id', 'INTEGER', false, true),
          createColumn('user_id', 'INTEGER'),
        ],
        [],
        [new ForeignKey('fk_user', 'orders', 'user_id', 'users', 'id')]
      );

      const targetTable = createTable('orders', [
        createColumn('id', 'INTEGER', false, true),
        createColumn('user_id', 'INTEGER'),
      ]);

      const sourceSchema = new DatabaseSchema([sourceTable], []);
      const targetSchema = new DatabaseSchema([targetTable], []);

      const result = comparator.compare(sourceSchema, targetSchema, 'staging', 'production');

      expect(result.summary.missingForeignKeys).toBe(1);

      const missingFK = result.differences.find((d) => d.type === 'missing_foreign_key');
      expect(missingFK).toBeDefined();
    });
  });

  describe('compare() - complex scenarios', () => {
    it('should handle multiple differences across multiple tables', () => {
      const sourceUsers = createTable(
        'users',
        [
          createColumn('id', 'INTEGER', false, true),
          createColumn('email', 'TEXT'),
          createColumn('name', 'TEXT'),
        ],
        [new Index('idx_users_email', 'users', ['email'], false)]
      );

      const sourceOrders = createTable(
        'orders',
        [
          createColumn('id', 'INTEGER', false, true),
          createColumn('user_id', 'INTEGER'),
          createColumn('total', 'REAL'),
        ],
        [],
        [new ForeignKey('fk_user', 'orders', 'user_id', 'users', 'id')]
      );

      const targetUsers = createTable('users', [
        createColumn('id', 'INTEGER', false, true),
        createColumn('name', 'TEXT'),
      ]); // Missing email column and index

      const targetOrders = createTable('orders', [
        createColumn('id', 'INTEGER', false, true),
        createColumn('user_id', 'INTEGER'),
        createColumn('total', 'INTEGER'), // Type mismatch: REAL -> INTEGER
      ]); // Missing FK

      const sourceSchema = new DatabaseSchema([sourceUsers, sourceOrders], []);
      const targetSchema = new DatabaseSchema([targetUsers, targetOrders], []);

      const result = comparator.compare(sourceSchema, targetSchema, 'development', 'production');

      expect(result.isIdentical()).toBe(false);
      expect(result.summary.missingColumns).toBe(1); // email
      expect(result.summary.missingIndexes).toBe(1); // idx_users_email
      expect(result.summary.missingForeignKeys).toBe(1); // fk_user
      expect(result.summary.typeMismatches).toBe(1); // total: REAL vs INTEGER
      expect(result.summary.totalDifferences).toBe(4);
    });

    it('should sort differences by ICE score', () => {
      const sourceTable = createTable(
        'users',
        [
          createColumn('id', 'INTEGER', false, true),
          createColumn('email', 'TEXT'),
        ],
        [new Index('idx_users_email', 'users', ['email'], false)]
      );

      const targetTable = createTable('users', [createColumn('id', 'INTEGER', false, true)]);

      const sourceSchema = new DatabaseSchema([sourceTable], []);
      const targetSchema = new DatabaseSchema([targetTable], []);

      const result = comparator.compare(sourceSchema, targetSchema, 'development', 'production');

      // Missing column should be higher priority than missing index
      expect(result.differences[0].type).toBe('missing_column');
      expect(result.differences[1].type).toBe('missing_index');
    });
  });

  describe('compare() - ICE scoring', () => {
    it('should assign higher ICE scores for production target', () => {
      const sourceTable = createTable('users', [createColumn('id', 'INTEGER', false, true)]);
      const targetTable = createTable('users', []);

      const sourceSchema = new DatabaseSchema([sourceTable], []);
      const targetSchema = new DatabaseSchema([targetTable], []);

      const prodResult = comparator.compare(sourceSchema, targetSchema, 'development', 'production');
      const devResult = comparator.compare(sourceSchema, targetSchema, 'staging', 'development');

      const prodDiff = prodResult.differences[0];
      const devDiff = devResult.differences[0];

      expect(prodDiff.iceScore.context).toBeGreaterThan(devDiff.iceScore.context);
      expect(prodDiff.iceScore.combined).toBeGreaterThan(devDiff.iceScore.combined);
    });
  });

  describe('getFormattedSummary()', () => {
    it('should format summary for identical schemas', () => {
      const table = createTable('users', [createColumn('id', 'INTEGER', false, true)]);
      const schema = new DatabaseSchema([table], []);

      const result = comparator.compare(schema, schema, 'development', 'production');
      const summary = result.getFormattedSummary();

      expect(summary).toContain('development → production');
      expect(summary).toContain('✅ Schemas are identical');
    });

    it('should format summary with differences', () => {
      const sourceTable = createTable('users', [
        createColumn('id', 'INTEGER', false, true),
        createColumn('email', 'TEXT'),
      ]);
      const targetTable = createTable('users', [createColumn('id', 'INTEGER', false, true)]);

      const sourceSchema = new DatabaseSchema([sourceTable], []);
      const targetSchema = new DatabaseSchema([targetTable], []);

      const result = comparator.compare(sourceSchema, targetSchema, 'development', 'production');
      const summary = result.getFormattedSummary();

      expect(summary).toContain('Total differences:');
      expect(summary).toContain('Missing columns: 1');
    });
  });

  describe('getMigrationPlan()', () => {
    it('should generate migration plan with SQL', () => {
      const sourceTable = createTable('users', [
        createColumn('id', 'INTEGER', false, true),
        createColumn('email', 'TEXT'),
      ]);
      const targetTable = createTable('users', [createColumn('id', 'INTEGER', false, true)]);

      const sourceSchema = new DatabaseSchema([sourceTable], []);
      const targetSchema = new DatabaseSchema([targetTable], []);

      const result = comparator.compare(sourceSchema, targetSchema, 'development', 'production');
      const plan = result.getMigrationPlan();

      expect(plan).toContain('-- Schema Migration Plan');
      expect(plan).toContain('ALTER TABLE users ADD COLUMN email TEXT');
    });
  });
});
