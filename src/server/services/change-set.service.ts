import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { ChangeSet } from "../../shared/types.js";

export class ChangeSetService {
  constructor(private db: Database.Database) {}

  /**
   * Create a new proposed change (ChangeSet).
   * Does not apply it yet—just records the proposal.
   */
  createChangeSet(input: {
    conversationId: string;
    analysisId: string;
    sectionType: "bullet" | "paragraph" | "sentence" | "section";
    location: string;
    originalText: string;
    proposedText: string;
    reasoning: string;
    businessImpact: string[];
    confidence: number;
  }): ChangeSet {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO change_sets (
        id, conversation_id, analysis_id, section_type, location,
        original_text, proposed_text, reasoning, business_impact,
        confidence, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `);

    stmt.run(
      id,
      input.conversationId,
      input.analysisId,
      input.sectionType,
      input.location,
      input.originalText,
      input.proposedText,
      input.reasoning,
      JSON.stringify(input.businessImpact),
      input.confidence
    );

    return this.getChangeSetById(id)!;
  }

  /**
   * Get a single change set by ID.
   */
  getChangeSetById(id: string): ChangeSet | null {
    const stmt = this.db.prepare(`
      SELECT * FROM change_sets WHERE id = ?
    `);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.rowToChangeSet(row);
  }

  /**
   * Get all pending changes for a conversation.
   */
  getPendingChanges(conversationId: string): ChangeSet[] {
    const stmt = this.db.prepare(`
      SELECT * FROM change_sets
      WHERE conversation_id = ? AND status = 'pending'
      ORDER BY created_at ASC
    `);
    const rows = stmt.all(conversationId) as any[];
    return rows.map((row) => this.rowToChangeSet(row));
  }

  /**
   * Accept a change set (mark as accepted, record in audit trail).
   */
  acceptChangeSet(changeSetId: string, jobId: string): void {
    const changeSet = this.getChangeSetById(changeSetId);
    if (!changeSet) {
      throw new Error(`ChangeSet ${changeSetId} not found`);
    }

    this.db.prepare(`
      UPDATE change_sets SET status = 'accepted', decided_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(changeSetId);

    // Record in accepted_changes audit trail
    const auditId = uuidv4();
    this.db.prepare(`
      INSERT INTO accepted_changes (id, change_set_id, job_id, accepted_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(auditId, changeSetId, jobId);
  }

  /**
   * Reject a change set with optional note.
   */
  rejectChangeSet(changeSetId: string, note?: string): void {
    this.db.prepare(`
      UPDATE change_sets
      SET status = 'rejected', decided_at = CURRENT_TIMESTAMP, decision_note = ?
      WHERE id = ?
    `).run(note || null, changeSetId);
  }

  /**
   * Modify a change set (e.g., user tweaks proposed text).
   * Creates a new change set with the modified text.
   */
  modifyChangeSet(
    changeSetId: string,
    modifiedText: string,
    modificationNote: string
  ): ChangeSet {
    const original = this.getChangeSetById(changeSetId);
    if (!original) {
      throw new Error(`ChangeSet ${changeSetId} not found`);
    }

    // Mark original as modified
    this.db.prepare(`
      UPDATE change_sets
      SET status = 'modified', decided_at = CURRENT_TIMESTAMP, decision_note = ?
      WHERE id = ?
    `).run(modificationNote, changeSetId);

    // Create new change set with modified text
    return this.createChangeSet({
      conversationId: original.conversation_id,
      analysisId: original.analysis_id,
      sectionType: original.section_type,
      location: original.location,
      originalText: original.original_text,
      proposedText: modifiedText,
      reasoning: `${original.reasoning} (user modified)`,
      businessImpact: JSON.parse(original.business_impact as any),
      confidence: original.confidence,
    });
  }

  /**
   * Get accepted changes for a job (used when generating resume).
   */
  getAcceptedChangesForJob(jobId: string): ChangeSet[] {
    const stmt = this.db.prepare(`
      SELECT cs.* FROM change_sets cs
      INNER JOIN accepted_changes ac ON cs.id = ac.change_set_id
      WHERE ac.job_id = ?
      ORDER BY cs.created_at ASC
    `);
    const rows = stmt.all(jobId) as any[];
    return rows.map((row) => this.rowToChangeSet(row));
  }

  /**
   * Private helper: convert DB row to ChangeSet object.
   */
  private rowToChangeSet(row: any): ChangeSet {
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      analysis_id: row.analysis_id,
      section_type: row.section_type,
      location: row.location,
      original_text: row.original_text,
      proposed_text: row.proposed_text,
      reasoning: row.reasoning,
      business_impact: JSON.parse(row.business_impact),
      confidence: row.confidence,
      status: row.status,
      created_at: row.created_at,
      decided_at: row.decided_at || undefined,
      decision_note: row.decision_note || undefined,
    };
  }
}

export function createChangeSetService(db: Database.Database): ChangeSetService {
  return new ChangeSetService(db);
}
