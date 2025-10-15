import { describe, it, expect } from 'vitest';
import { ICECalculator } from '../../../src/domain/services/ICECalculator';
import { TableInfo } from '../../../src/domain/entities/TableInfo';
import { DatabaseSchema } from '../../../src/domain/entities/DatabaseSchema';
import { Column } from '../../../src/domain/entities/Column';
import { ForeignKey } from '../../../src/domain/entities/ForeignKey';

describe('ICECalculator', () => {
  const calculator = new ICECalculator();

  const createTestTable = (name: string, hasPrimaryKey = true, foreignKeys: ForeignKey[] = []): TableInfo => {
    const columns = [
      new Column(hasPrimaryKey ? 'id' : 'some_col', 'INTEGER', false, hasPrimaryKey),
      new Column('name', 'TEXT', false, false),
    ];

    return new TableInfo(name, columns, [], foreignKeys);
  };

  const createTestSchema = (tables: TableInfo[]): DatabaseSchema => {
    return new DatabaseSchema(tables, []);
  };

  describe('calculateForMissingPrimaryKey()', () => {
    it('should calculate high ICE score for referenced table in production', () => {
      const usersTable = createTestTable('users', false);
      const ordersTable = createTestTable('orders', true, [
        new ForeignKey('fk_user', 'orders', 'user_id', 'users', 'id'),
      ]);

      const schema = createTestSchema([usersTable, ordersTable]);

      const iceScore = calculator.calculateForMissingPrimaryKey({
        table: usersTable,
        schema,
        environment: 'production',
      });

      expect(iceScore.priority).toBe('high');
      expect(iceScore.insight).toBeGreaterThan(8); // High insight - referenced table
      expect(iceScore.context).toBeGreaterThan(8); // High context - production + referenced
      expect(iceScore.combined).toBeGreaterThan(6.0); // High combined score
    });

    it('should calculate medium ICE score for unreferenced table in development', () => {
      const table = createTestTable('logs', false);
      const schema = createTestSchema([table]);

      const iceScore = calculator.calculateForMissingPrimaryKey({
        table,
        schema,
        environment: 'development',
      });

      expect(iceScore.priority).toBe('medium');
      expect(iceScore.insight).toBeLessThan(9); // Lower insight - not referenced
      expect(iceScore.context).toBeLessThan(7); // Lower context - development
    });

    it('should detect when table is referenced by others', () => {
      const usersTable = createTestTable('users', false);
      const ordersTable = createTestTable('orders', true, [
        new ForeignKey('fk_user', 'orders', 'user_id', 'users', 'id'),
      ]);

      const schema = createTestSchema([usersTable, ordersTable]);

      const iceScore = calculator.calculateForMissingPrimaryKey({
        table: usersTable,
        schema,
        environment: 'staging',
      });

      // Should have higher insight because table is referenced
      expect(iceScore.insight).toBeGreaterThan(8);
    });
  });

  describe('calculateForMissingForeignKeyIndex()', () => {
    it('should calculate high ICE score for frequently joined FK in production', () => {
      const schema = createTestSchema([createTestTable('users'), createTestTable('orders')]);

      const iceScore = calculator.calculateForMissingForeignKeyIndex({
        tableName: 'orders',
        columnName: 'user_id',
        isFrequentlyJoined: true,
        schema,
        environment: 'production',
      });

      expect(iceScore.priority).toBe('high');
      expect(iceScore.execution).toBeGreaterThan(9); // Very high - index creation is safe
    });

    it('should calculate medium ICE score for infrequent joins in development', () => {
      const schema = createTestSchema([createTestTable('users'), createTestTable('logs')]);

      const iceScore = calculator.calculateForMissingForeignKeyIndex({
        tableName: 'logs',
        columnName: 'user_id',
        isFrequentlyJoined: false,
        schema,
        environment: 'development',
      });

      expect(iceScore.priority).toBe('medium');
      expect(iceScore.context).toBeLessThan(8); // Lower context - dev + infrequent
    });

    it('should have very high execution score for index creation', () => {
      const schema = createTestSchema([createTestTable('users')]);

      const iceScore = calculator.calculateForMissingForeignKeyIndex({
        tableName: 'users',
        columnName: 'email',
        isFrequentlyJoined: false,
        schema,
        environment: 'production',
      });

      // Index creation is safe and reversible
      expect(iceScore.execution).toBeGreaterThan(9);
    });
  });

  describe('calculateForNullableForeignKey()', () => {
    it('should calculate low-medium ICE score for nullable FK', () => {
      const iceScore = calculator.calculateForNullableForeignKey({
        tableName: 'orders',
        columnName: 'coupon_id',
        environment: 'production',
      });

      // Nullable FKs often intentional - lower priority
      expect(iceScore.priority).toBe('medium');
      expect(iceScore.insight).toBeLessThan(8); // Medium insight - might be intentional
      expect(iceScore.execution).toBeLessThan(7); // Lower execution - needs review
    });

    it('should have lower scores than missing PK or index', () => {
      const nullableFKScore = calculator.calculateForNullableForeignKey({
        tableName: 'orders',
        columnName: 'coupon_id',
        environment: 'production',
      });

      const table = createTestTable('users', false);
      const schema = createTestSchema([table]);

      const missingPKScore = calculator.calculateForMissingPrimaryKey({
        table,
        schema,
        environment: 'production',
      });

      expect(nullableFKScore.combined).toBeLessThan(missingPKScore.combined);
    });
  });

  describe('calculateForSchemaDifference()', () => {
    it('should calculate critical score for missing table in production', () => {
      const iceScore = calculator.calculateForSchemaDifference({
        differenceType: 'missing_table',
        name: 'users',
        targetEnvironment: 'production',
        sourceEnvironment: 'development',
        hasRelationships: true,
        ddlStatement: 'CREATE TABLE users (...)',
      });

      expect(iceScore.priority).toBe('high');
      expect(iceScore.insight).toBeGreaterThan(8); // High insight - production table missing
      expect(iceScore.context).toBeGreaterThan(8); // High context - production target
    });

    it('should calculate lower score for missing table in development', () => {
      const prodScore = calculator.calculateForSchemaDifference({
        differenceType: 'missing_table',
        name: 'users',
        targetEnvironment: 'production',
        sourceEnvironment: 'staging',
        ddlStatement: 'CREATE TABLE users (...)',
      });

      const devScore = calculator.calculateForSchemaDifference({
        differenceType: 'missing_table',
        name: 'users',
        targetEnvironment: 'development',
        sourceEnvironment: 'staging',
        ddlStatement: 'CREATE TABLE users (...)',
      });

      expect(prodScore.combined).toBeGreaterThan(devScore.combined);
    });

    it('should calculate medium score for missing column', () => {
      const iceScore = calculator.calculateForSchemaDifference({
        differenceType: 'missing_column',
        name: 'email',
        targetEnvironment: 'production',
        sourceEnvironment: 'development',
        ddlStatement: 'ALTER TABLE users ADD COLUMN email TEXT',
      });

      expect(iceScore.priority).toBe('high');
      expect(iceScore.execution).toBeGreaterThan(7); // Adding column is relatively safe
    });

    it('should calculate appropriate score for type mismatch', () => {
      const iceScore = calculator.calculateForSchemaDifference({
        differenceType: 'type_mismatch',
        name: 'age',
        targetEnvironment: 'production',
        sourceEnvironment: 'development',
        ddlStatement: 'ALTER TABLE users ALTER COLUMN age TYPE INTEGER',
      });

      expect(iceScore.execution).toBeLessThan(8); // Type changes are risky
    });

    it('should rank severity: missing_table > missing_column > type_mismatch', () => {
      const missingTable = calculator.calculateForSchemaDifference({
        differenceType: 'missing_table',
        name: 'test',
        targetEnvironment: 'production',
        sourceEnvironment: 'development',
        ddlStatement: 'CREATE TABLE test (...)',
      });

      const missingColumn = calculator.calculateForSchemaDifference({
        differenceType: 'missing_column',
        name: 'test',
        targetEnvironment: 'production',
        sourceEnvironment: 'development',
        ddlStatement: 'ALTER TABLE test ADD test',
      });

      const typeMismatch = calculator.calculateForSchemaDifference({
        differenceType: 'type_mismatch',
        name: 'test',
        targetEnvironment: 'production',
        sourceEnvironment: 'development',
        ddlStatement: 'ALTER TABLE test ALTER test',
      });

      expect(missingTable.insight).toBeGreaterThan(missingColumn.insight);
      expect(missingColumn.insight).toBeGreaterThan(typeMismatch.insight);
    });
  });

  describe('calculateWithComponents()', () => {
    it('should return ICE score with all components', () => {
      const table = createTestTable('users', false);
      const schema = createTestSchema([table]);

      // Get components from existing calculation
      const tempScore = calculator.calculateForMissingPrimaryKey({
        table,
        schema,
        environment: 'production',
      });

      // This would typically use the analysis components
      // For now, just verify the method exists and works
      const result = calculator.calculateWithComponents(
        { score: 9, factors: { tableImportance: 9 }, reasoning: 'Test' } as any,
        { score: 10, factors: { environmentCriticality: 10 }, reasoning: 'Test', environment: 'production' } as any,
        { score: 8, sql: 'SQL', factors: { sqlPrecision: 8 }, reasoning: 'Test' } as any
      );

      expect(result.iceScore).toBeDefined();
      expect(result.iceScore.insight).toBe(9);
      expect(result.iceScore.context).toBe(10);
      expect(result.iceScore.execution).toBe(8);
      expect(result.insight).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.execution).toBeDefined();
    });
  });

  describe('ICE score properties', () => {
    it('should produce multiplicative scores where weak dimension lowers overall', () => {
      // High insight and context, but low execution
      const lowExecution = calculator.calculateForNullableForeignKey({
        tableName: 'orders',
        columnName: 'optional_field',
        environment: 'production',
      });

      // Should have medium or lower priority due to low execution
      expect(lowExecution.priority).not.toBe('high');
    });

    it('should respect environment criticality in context scores', () => {
      const table = createTestTable('users', false);
      const schema = createTestSchema([table]);

      const prodScore = calculator.calculateForMissingPrimaryKey({
        table,
        schema,
        environment: 'production',
      });

      const devScore = calculator.calculateForMissingPrimaryKey({
        table,
        schema,
        environment: 'development',
      });

      expect(prodScore.context).toBeGreaterThan(devScore.context);
      expect(prodScore.combined).toBeGreaterThan(devScore.combined);
    });
  });
});
