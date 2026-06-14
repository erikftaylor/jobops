import { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { KeywordProposal } from "../../shared/types.js";
import { ChangeGraphService } from "./change-graph.service.js";

export class KeywordProposalService {
  constructor(
    private db: Database,
    private changeGraphService: ChangeGraphService
  ) {}

  /**
   * Propose a keyword for a job - creates a ChangeGraph node
   */
  proposeKeyword(
    jobId: string,
    keyword: string,
    suggestedLanguage: string,
    target: "resume" | "cover_letter" | "both"
  ): KeywordProposal {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Create a change graph node for this keyword
    const changeNode = this.changeGraphService.createChange({
      target,
      field: "keywords",
      operation: "add",
      new_value: keyword,
      reason: `Keyword proposal: "${keyword}" - ${suggestedLanguage}`,
      source: "ai_suggestion",
      confidence: 0.85,
      tags: ["keyword_proposal", target],
    });

    // Create the proposal
    const stmt = this.db.prepare(`
      INSERT INTO keyword_proposals (
        id, job_id, keyword, suggested_language, target,
        status, change_node_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, jobId, keyword, suggestedLanguage, target, "pending", changeNode.id, now);

    return {
      id,
      jobId,
      keyword,
      suggestedLanguage,
      target,
      status: "pending",
      changeNodeId: changeNode.id,
      createdAt: now,
    };
  }

  /**
   * Accept a keyword proposal
   */
  acceptProposal(proposalId: string): KeywordProposal | null {
    const proposal = this.getProposalById(proposalId);
    if (!proposal) return null;

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE keyword_proposals
      SET status = ?, accepted_at = ?
      WHERE id = ?
    `);

    stmt.run("accepted", now, proposalId);

    // Accept the change in the graph
    if (proposal.changeNodeId) {
      this.changeGraphService.acceptChange(proposal.changeNodeId);
    }

    return this.getProposalById(proposalId);
  }

  /**
   * Ignore a keyword proposal
   */
  ignoreProposal(proposalId: string): KeywordProposal | null {
    const proposal = this.getProposalById(proposalId);
    if (!proposal) return null;

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE keyword_proposals
      SET status = ?, ignored_at = ?
      WHERE id = ?
    `);

    stmt.run("ignored", now, proposalId);

    return this.getProposalById(proposalId);
  }

  /**
   * Get a proposal by ID
   */
  getProposalById(id: string): KeywordProposal | null {
    const stmt = this.db.prepare("SELECT * FROM keyword_proposals WHERE id = ?");
    const row = stmt.get(id) as any;
    return row ? this.rowToProposal(row) : null;
  }

  /**
   * Get all proposals for a job
   */
  getProposalsByJob(jobId: string): KeywordProposal[] {
    const stmt = this.db.prepare(`
      SELECT * FROM keyword_proposals
      WHERE job_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(jobId) as any[];
    return rows.map((row) => this.rowToProposal(row));
  }

  /**
   * Get pending proposals for a job
   */
  getPendingProposalsByJob(jobId: string): KeywordProposal[] {
    const stmt = this.db.prepare(`
      SELECT * FROM keyword_proposals
      WHERE job_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(jobId) as any[];
    return rows.map((row) => this.rowToProposal(row));
  }

  /**
   * Get accepted proposals for a job
   */
  getAcceptedProposalsByJob(jobId: string): KeywordProposal[] {
    const stmt = this.db.prepare(`
      SELECT * FROM keyword_proposals
      WHERE job_id = ? AND status = 'accepted'
      ORDER BY accepted_at DESC
    `);
    const rows = stmt.all(jobId) as any[];
    return rows.map((row) => this.rowToProposal(row));
  }

  /**
   * Get ignored proposals for a job
   */
  getIgnoredProposalsByJob(jobId: string): KeywordProposal[] {
    const stmt = this.db.prepare(`
      SELECT * FROM keyword_proposals
      WHERE job_id = ? AND status = 'ignored'
      ORDER BY ignored_at DESC
    `);
    const rows = stmt.all(jobId) as any[];
    return rows.map((row) => this.rowToProposal(row));
  }

  /**
   * Private helper to convert database row to KeywordProposal
   */
  private rowToProposal(row: any): KeywordProposal {
    return {
      id: row.id,
      jobId: row.job_id,
      keyword: row.keyword,
      suggestedLanguage: row.suggested_language,
      target: row.target,
      status: row.status,
      changeNodeId: row.change_node_id,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at,
      ignoredAt: row.ignored_at,
    };
  }
}

/**
 * Factory function to create a KeywordProposalService instance
 */
export function createKeywordProposalService(
  db: Database,
  changeGraphService: ChangeGraphService
): KeywordProposalService {
  return new KeywordProposalService(db, changeGraphService);
}
