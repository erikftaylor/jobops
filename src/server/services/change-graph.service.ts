import { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { ChangeNode } from "../../shared/types.js";

interface CreateChangeInput {
  target: "resume" | "cover_letter" | "both";
  field: string;
  operation: "add" | "remove" | "modify" | "rewrite";
  original_value?: string;
  new_value?: string;
  reason: string;
  source: "analysis" | "user" | "ai_suggestion" | "system";
  confidence: number;
  conversation_id?: string;
  analysis_id?: string;
  tags?: string[];
}

export class ChangeGraphService {
  constructor(private db: Database) {}

  /**
   * Create a new change node in the graph
   */
  createChange(input: CreateChangeInput): ChangeNode {
    const id = uuidv4();
    const now = new Date().toISOString();
    const tagsJson = input.tags ? JSON.stringify(input.tags) : null;

    const stmt = this.db.prepare(`
      INSERT INTO change_graph (
        id, target, field, operation, original_value, new_value,
        reason, source, confidence, conversation_id, analysis_id,
        tags, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.target,
      input.field,
      input.operation,
      input.original_value || null,
      input.new_value || null,
      input.reason,
      input.source,
      input.confidence,
      input.conversation_id || null,
      input.analysis_id || null,
      tagsJson,
      now
    );

    return {
      id,
      target: input.target,
      field: input.field,
      operation: input.operation,
      original_value: input.original_value,
      new_value: input.new_value,
      reason: input.reason,
      source: input.source,
      confidence: input.confidence,
      conversation_id: input.conversation_id,
      analysis_id: input.analysis_id,
      tags: input.tags,
      created_at: now,
    };
  }

  /**
   * Get a change node by ID
   */
  getChangeById(id: string): ChangeNode | null {
    const stmt = this.db.prepare("SELECT * FROM change_graph WHERE id = ?");
    const row = stmt.get(id) as any;
    return row ? this.rowToChange(row) : null;
  }

  /**
   * Get all changes for a specific job
   */
  getChangesForJob(jobId: string): ChangeNode[] {
    const stmt = this.db.prepare(`
      SELECT cg.* FROM change_graph cg
      JOIN conversations c ON cg.conversation_id = c.id
      WHERE c.job_id = ?
      ORDER BY cg.created_at DESC
    `);
    const rows = stmt.all(jobId) as any[];
    return rows.map((row) => this.rowToChange(row));
  }

  /**
   * Get changes for a specific target (resume, cover_letter, or both)
   */
  getChangesByTarget(jobId: string, target: string): ChangeNode[] {
    const stmt = this.db.prepare(`
      SELECT cg.* FROM change_graph cg
      JOIN conversations c ON cg.conversation_id = c.id
      WHERE c.job_id = ? AND cg.target = ?
      ORDER BY cg.created_at DESC
    `);
    const rows = stmt.all(jobId, target) as any[];
    return rows.map((row) => this.rowToChange(row));
  }

  /**
   * Get changes by source (analysis, user, ai_suggestion, system)
   */
  getChangesBySource(jobId: string, source: string): ChangeNode[] {
    const stmt = this.db.prepare(`
      SELECT cg.* FROM change_graph cg
      JOIN conversations c ON cg.conversation_id = c.id
      WHERE c.job_id = ? AND cg.source = ?
      ORDER BY cg.created_at DESC
    `);
    const rows = stmt.all(jobId, source) as any[];
    return rows.map((row) => this.rowToChange(row));
  }

  /**
   * Get changes with confidence score above threshold
   */
  getHighConfidenceChanges(jobId: string, minConfidence: number): ChangeNode[] {
    const stmt = this.db.prepare(`
      SELECT cg.* FROM change_graph cg
      JOIN conversations c ON cg.conversation_id = c.id
      WHERE c.job_id = ? AND cg.confidence >= ?
      ORDER BY cg.confidence DESC, cg.created_at DESC
    `);
    const rows = stmt.all(jobId, minConfidence) as any[];
    return rows.map((row) => this.rowToChange(row));
  }

  /**
   * Get changes by tag
   */
  getChangesByTag(jobId: string, tag: string): ChangeNode[] {
    const stmt = this.db.prepare(`
      SELECT cg.* FROM change_graph cg
      JOIN conversations c ON cg.conversation_id = c.id
      WHERE c.job_id = ? AND cg.tags LIKE ?
      ORDER BY cg.created_at DESC
    `);
    // Use LIKE pattern to search for tag in JSON array
    const rows = stmt.all(jobId, `%"${tag}"%`) as any[];
    return rows.map((row) => this.rowToChange(row));
  }

  /**
   * Count changes by operation type
   */
  countByOperation(jobId: string): Record<string, number> {
    const stmt = this.db.prepare(`
      SELECT cg.operation, COUNT(*) as count FROM change_graph cg
      JOIN conversations c ON cg.conversation_id = c.id
      WHERE c.job_id = ?
      GROUP BY cg.operation
    `);
    const rows = stmt.all(jobId) as any[];

    const result: Record<string, number> = {
      add: 0,
      remove: 0,
      modify: 0,
      rewrite: 0,
    };

    for (const row of rows) {
      result[row.operation] = row.count;
    }

    return result;
  }

  /**
   * Accept a change
   */
  acceptChange(changeId: string): ChangeNode | null {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE change_graph
      SET accepted_at = ?
      WHERE id = ?
    `);
    stmt.run(now, changeId);
    return this.getChangeById(changeId);
  }

  /**
   * Private helper to convert database row to ChangeNode
   */
  private rowToChange(row: any): ChangeNode {
    return {
      id: row.id,
      target: row.target,
      field: row.field,
      operation: row.operation,
      original_value: row.original_value,
      new_value: row.new_value,
      reason: row.reason,
      source: row.source,
      confidence: row.confidence,
      accepted_at: row.accepted_at,
      conversation_id: row.conversation_id,
      analysis_id: row.analysis_id,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      created_at: row.created_at,
    };
  }
}

/**
 * Factory function to create a ChangeGraphService instance
 */
export function createChangeGraphService(db: Database): ChangeGraphService {
  return new ChangeGraphService(db);
}
