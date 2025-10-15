import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompareSchemasUseCase } from '../../../src/application/use-cases/CompareSchemasUseCase';
import type { ICloudflareD1Repository } from '../../../src/domain/repositories/ICloudflareD1Repository';
import { DatabaseSchema } from '../../../src/domain/entities/DatabaseSchema';
import { TableInfo } from '../../../src/domain/entities/TableInfo';
import { Column } from '../../../src/domain/entities/Column';

describe('CompareSchemasUseCase', () => {
  let useCase: CompareSchemasUseCase;
  let mockRepository: ICloudflareD1Repository;

  beforeEach(() => {
    mockRepository = {
      fetchDatabaseSchema: vi.fn(),
      executeQuery: vi.fn(),
      listDatabases: vi.fn(),
    } as unknown as ICloudflareD1Repository;
    useCase = new CompareSchemasUseCase(mockRepository);
  });

  const createTestTable = (name: string, columns: Column[]): TableInfo => {
    return new TableInfo(name, 'table', columns, [], []);
  };

  const createTestColumn = (name: string, type: string, isPrimaryKey = false): Column => {
    return new Column(name, type, isPrimaryKey);
  };

  describe('execute()', () => {
    it('should compare two different schemas successfully', async () => {
      const sourceTable = createTestTable('users', [
        createTestColumn('id', 'INTEGER', true),
        createTestColumn('email', 'TEXT'),
        createTestColumn('name', 'TEXT'),
      ]);

      const targetTable = createTestTable('users', [
        createTestColumn('id', 'INTEGER', true),
        createTestColumn('name', 'TEXT'),
      ]); // Missing email column

      const sourceSchema = new DatabaseSchema('test-source', 'development', [sourceTable], new Date());
      const targetSchema = new DatabaseSchema('test-target', 'production', [targetTable], new Date());

      vi.mocked(mockRepository.fetchDatabaseSchema)
        .mockResolvedValueOnce(sourceSchema)
        .mockResolvedValueOnce(targetSchema);

      const output = await useCase.execute({
        sourceDatabaseId: 'db1',
        sourceEnvironment: 'development',
        targetDatabaseId: 'db2',
        targetEnvironment: 'production',
      });

      expect(output.result).toBeDefined();
      expect(output.result.isIdentical()).toBe(false);
      expect(output.result.summary.missingColumns).toBe(1);
      expect(output.sourceTableCount).toBe(1);
      expect(output.targetTableCount).toBe(1);
      expect(output.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should detect identical schemas', async () => {
      const table = createTestTable('users', [createTestColumn('id', 'INTEGER', true)]);
      const schema = new DatabaseSchema('test-db', 'development', [table], new Date());

      vi.mocked(mockRepository.fetchDatabaseSchema).mockResolvedValue(schema);

      const output = await useCase.execute({
        sourceDatabaseId: 'db1',
        sourceEnvironment: 'development',
        targetDatabaseId: 'db2',
        targetEnvironment: 'production',
      });

      expect(output.result.isIdentical()).toBe(true);
      expect(output.result.summary.totalDifferences).toBe(0);
    });

    it('should throw error when comparing database with itself', async () => {
      await expect(
        useCase.execute({
          sourceDatabaseId: 'db1',
          sourceEnvironment: 'development',
          targetDatabaseId: 'db1',
          targetEnvironment: 'production',
        })
      ).rejects.toThrow('Cannot compare a database with itself');
    });

    it('should fetch schemas from correct databases', async () => {
      const schema = new DatabaseSchema('test-db', 'development', [createTestTable('test', [createTestColumn('id', 'INTEGER', true)])], new Date());
      vi.mocked(mockRepository.fetchDatabaseSchema).mockResolvedValue(schema);

      await useCase.execute({
        sourceDatabaseId: 'source-db',
        sourceEnvironment: 'development',
        targetDatabaseId: 'target-db',
        targetEnvironment: 'production',
      });

      expect(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('source-db');
      expect(mockRepository.fetchDatabaseSchema).toHaveBeenCalledWith('target-db');
      expect(mockRepository.fetchDatabaseSchema).toHaveBeenCalledTimes(2);
    });

    it('should detect missing tables', async () => {
      const sourceSchema = new DatabaseSchema(
        'test-source',
        'development',
        [
          createTestTable('users', [createTestColumn('id', 'INTEGER', true)]),
          createTestTable('orders', [createTestColumn('id', 'INTEGER', true)]),
        ],
        new Date()
      );

      const targetSchema = new DatabaseSchema('test-target', 'production', [createTestTable('users', [createTestColumn('id', 'INTEGER', true)])], new Date());

      vi.mocked(mockRepository.fetchDatabaseSchema)
        .mockResolvedValueOnce(sourceSchema)
        .mockResolvedValueOnce(targetSchema);

      const output = await useCase.execute({
        sourceDatabaseId: 'db1',
        sourceEnvironment: 'development',
        targetDatabaseId: 'db2',
        targetEnvironment: 'production',
      });

      expect(output.result.summary.missingTables).toBe(1);
      expect(output.sourceTableCount).toBe(2);
      expect(output.targetTableCount).toBe(1);
    });

    it('should measure execution time', async () => {
      const schema = new DatabaseSchema('test-db', 'development', [createTestTable('test', [createTestColumn('id', 'INTEGER', true)])], new Date());
      vi.mocked(mockRepository.fetchDatabaseSchema).mockResolvedValue(schema);

      const output = await useCase.execute({
        sourceDatabaseId: 'db1',
        sourceEnvironment: 'development',
        targetDatabaseId: 'db2',
        targetEnvironment: 'production',
      });

      expect(output.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof output.executionTimeMs).toBe('number');
    });

    it('should pass environment information to comparator', async () => {
      const table = createTestTable('users', [
        createTestColumn('id', 'INTEGER', true),
        createTestColumn('email', 'TEXT'),
      ]);

      const sourceSchema = new DatabaseSchema('test-source', 'development', [table], new Date());
      const targetSchema = new DatabaseSchema(
        'test-target',
        'production',
        [createTestTable('users', [createTestColumn('id', 'INTEGER', true)])],
        new Date()
      );

      vi.mocked(mockRepository.fetchDatabaseSchema)
        .mockResolvedValueOnce(sourceSchema)
        .mockResolvedValueOnce(targetSchema);

      const output = await useCase.execute({
        sourceDatabaseId: 'db1',
        sourceEnvironment: 'development',
        targetDatabaseId: 'db2',
        targetEnvironment: 'production',
      });

      // Verify ICE scoring reflects environment criticality
      const difference = output.result.differences[0];
      expect(difference.sourceEnvironment).toBe('development');
      expect(difference.targetEnvironment).toBe('production');
      expect(difference.iceScore.context).toBeGreaterThan(5); // Production target = high context
    });

    it('should handle complex multi-table comparison', async () => {
      const sourceSchema = new DatabaseSchema(
        'test-source',
        'staging',
        [
          createTestTable('users', [
            createTestColumn('id', 'INTEGER', true),
            createTestColumn('email', 'TEXT'),
            createTestColumn('name', 'TEXT'),
          ]),
          createTestTable('orders', [createTestColumn('id', 'INTEGER', true), createTestColumn('total', 'REAL')]),
          createTestTable('products', [createTestColumn('id', 'INTEGER', true)]),
        ],
        new Date()
      );

      const targetSchema = new DatabaseSchema(
        'test-target',
        'production',
        [
          createTestTable('users', [createTestColumn('id', 'INTEGER', true), createTestColumn('name', 'TEXT')]), // Missing email
          createTestTable('orders', [createTestColumn('id', 'INTEGER', true), createTestColumn('total', 'INTEGER')]), // Type mismatch
          // Missing products table
        ],
        new Date()
      );

      vi.mocked(mockRepository.fetchDatabaseSchema)
        .mockResolvedValueOnce(sourceSchema)
        .mockResolvedValueOnce(targetSchema);

      const output = await useCase.execute({
        sourceDatabaseId: 'db1',
        sourceEnvironment: 'staging',
        targetDatabaseId: 'db2',
        targetEnvironment: 'production',
      });

      expect(output.result.summary.missingTables).toBe(1); // products
      expect(output.result.summary.missingColumns).toBe(1); // email
      expect(output.result.summary.typeMismatches).toBe(1); // total: REAL vs INTEGER
      expect(output.result.summary.totalDifferences).toBe(3);
    });

    it('should propagate repository errors', async () => {
      vi.mocked(mockRepository.fetchDatabaseSchema).mockRejectedValue(new Error('Network error'));

      await expect(
        useCase.execute({
          sourceDatabaseId: 'db1',
          sourceEnvironment: 'development',
          targetDatabaseId: 'db2',
          targetEnvironment: 'production',
        })
      ).rejects.toThrow('Network error');
    });
  });
});
