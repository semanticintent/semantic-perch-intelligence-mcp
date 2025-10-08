import { Relationship } from '../entities/Relationship';
import type { TableInfo } from '../entities/TableInfo';

/**
 * 🎯 SEMANTIC INTENT: RelationshipAnalyzer extracts and analyzes table relationships
 *
 * WHY: Domain service for relationship analysis
 * - Converts foreign keys to semantic relationships
 * - Analyzes relationship patterns and dependencies
 * - Identifies potential circular dependencies
 *
 * DOMAIN SERVICE: Stateless relationship operations
 * SEMANTIC RULES: Based on observable foreign key constraints
 * NO INFRASTRUCTURE: Pure business logic
 */

export interface DependencyGraph {
  nodes: string[]; // Table names
  edges: Array<{ from: string; to: string; column: string }>;
}

export class RelationshipAnalyzer {
  /**
   * Extract all relationships from tables
   *
   * Semantic: Convert FK constraints to relationship objects
   */
  extractRelationships(tables: TableInfo[]): Relationship[] {
    const relationships: Relationship[] = [];

    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        relationships.push(
          new Relationship(fk.table, fk.column, fk.referencesTable, fk.referencesColumn, fk.onDelete, fk.onUpdate)
        );
      }
    }

    return relationships;
  }

  /**
   * Get relationships for a specific table
   *
   * @param tableName - Table to analyze
   * @param relationships - All relationships in schema
   * @returns Relationships where table is either source or target
   */
  getRelationshipsForTable(tableName: string, relationships: Relationship[]): {
    outgoing: Relationship[]; // This table references others
    incoming: Relationship[]; // Other tables reference this
  } {
    return {
      outgoing: relationships.filter((rel) => rel.fromTable === tableName),
      incoming: relationships.filter((rel) => rel.toTable === tableName),
    };
  }

  /**
   * Build dependency graph from relationships
   *
   * Semantic: Visualize table dependencies for impact analysis
   */
  buildDependencyGraph(relationships: Relationship[]): DependencyGraph {
    const nodes = new Set<string>();
    const edges: Array<{ from: string; to: string; column: string }> = [];

    for (const rel of relationships) {
      nodes.add(rel.fromTable);
      nodes.add(rel.toTable);
      edges.push({
        from: rel.fromTable,
        to: rel.toTable,
        column: rel.fromColumn,
      });
    }

    return {
      nodes: Array.from(nodes).sort(),
      edges,
    };
  }

  /**
   * Detect circular dependencies in relationships
   *
   * Semantic: Circular references can cause deletion issues
   */
  detectCircularDependencies(relationships: Relationship[]): string[][] {
    const graph = this.buildDependencyGraph(relationships);
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const outgoing = graph.edges.filter((e) => e.from === node);
      for (const edge of outgoing) {
        if (!visited.has(edge.to)) {
          dfs(edge.to, [...path]);
        } else if (recursionStack.has(edge.to)) {
          // Found a cycle
          const cycleStart = path.indexOf(edge.to);
          const cycle = [...path.slice(cycleStart), edge.to];
          cycles.push(cycle);
        }
      }

      recursionStack.delete(node);
    };

    for (const node of graph.nodes) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  /**
   * Get cascade chains (tables that will cascade delete)
   *
   * Semantic: Impact analysis - what gets deleted when parent is deleted
   */
  getCascadeChains(tableName: string, relationships: Relationship[]): string[][] {
    const chains: string[][] = [];

    const buildChain = (currentTable: string, path: string[]): void => {
      const cascadingRels = relationships.filter(
        (rel) => rel.toTable === currentTable && rel.cascadesOnDelete()
      );

      if (cascadingRels.length === 0) {
        if (path.length > 0) {
          chains.push([...path]);
        }
        return;
      }

      for (const rel of cascadingRels) {
        buildChain(rel.fromTable, [...path, rel.fromTable]);
      }
    };

    buildChain(tableName, [tableName]);
    return chains;
  }

  /**
   * Identify self-referential relationships
   *
   * Semantic: Tables that reference themselves (e.g., parent_id)
   */
  getSelfReferentialRelationships(relationships: Relationship[]): Relationship[] {
    return relationships.filter((rel) => rel.isSelfReferential());
  }

  /**
   * Get required relationships (CASCADE or RESTRICT)
   *
   * Semantic: Tight coupling - child cannot exist without parent
   */
  getRequiredRelationships(relationships: Relationship[]): Relationship[] {
    return relationships.filter((rel) => rel.isRequired());
  }

  /**
   * Get optional relationships (SET NULL or NO ACTION)
   *
   * Semantic: Loose coupling - child can exist without parent
   */
  getOptionalRelationships(relationships: Relationship[]): Relationship[] {
    return relationships.filter((rel) => rel.isOptional());
  }

  /**
   * Find tables with no dependencies (no outgoing FKs)
   *
   * Semantic: Independent tables that can be populated first
   */
  getIndependentTables(tables: TableInfo[]): TableInfo[] {
    return tables.filter((t) => !t.hasForeignKeys());
  }

  /**
   * Get topological sort order for data population
   *
   * Semantic: Order tables for seeding - parents before children
   */
  getPopulationOrder(relationships: Relationship[]): string[] {
    const graph = this.buildDependencyGraph(relationships);
    const inDegree = new Map<string, number>();
    const result: string[] = [];

    // Calculate in-degree for each node
    for (const node of graph.nodes) {
      inDegree.set(node, 0);
    }
    for (const edge of graph.edges) {
      inDegree.set(edge.from, (inDegree.get(edge.from) || 0) + 1);
    }

    // Find nodes with no incoming edges
    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      const outgoing = graph.edges.filter((e) => e.to === node);
      for (const edge of outgoing) {
        const newDegree = (inDegree.get(edge.from) || 0) - 1;
        inDegree.set(edge.from, newDegree);
        if (newDegree === 0) {
          queue.push(edge.from);
        }
      }
    }

    return result;
  }
}
