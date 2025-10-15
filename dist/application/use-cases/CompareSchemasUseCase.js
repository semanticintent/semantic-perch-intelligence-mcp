"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompareSchemasUseCase = void 0;
const SchemaComparator_1 = require("../../domain/services/SchemaComparator");
class CompareSchemasUseCase {
    d1Repository;
    constructor(d1Repository) {
        this.d1Repository = d1Repository;
    }
    async execute(input) {
        const startTime = Date.now();
        // Validate environments are different (or at least different databases)
        if (input.sourceDatabaseId === input.targetDatabaseId) {
            throw new Error('Cannot compare a database with itself. Source and target must be different.');
        }
        // Fetch source schema
        const sourceSchema = await this.d1Repository.fetchDatabaseSchema(input.sourceDatabaseId);
        // Fetch target schema
        const targetSchema = await this.d1Repository.fetchDatabaseSchema(input.targetDatabaseId);
        // Compare schemas using domain service
        const comparator = new SchemaComparator_1.SchemaComparator();
        const result = comparator.compare(sourceSchema, targetSchema, input.sourceEnvironment, input.targetEnvironment);
        const executionTimeMs = Date.now() - startTime;
        return {
            result,
            sourceTableCount: sourceSchema.tables.length,
            targetTableCount: targetSchema.tables.length,
            executionTimeMs,
        };
    }
}
exports.CompareSchemasUseCase = CompareSchemasUseCase;
//# sourceMappingURL=CompareSchemasUseCase.js.map