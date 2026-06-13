import { getDatabase } from "../db/database.js";
import crypto from "crypto";

interface ConversationRecord {
  id: string;
  job_id: string;
  analysis_id: string;
  status: "active" | "closed";
  memory: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface ConversationMessageRecord {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  message_type: "chat" | "question" | "suggestion" | "confirmation";
  created_at: string;
}

interface ChangeSetRecord {
  id: string;
  conversation_id: string;
  analysis_id: string;
  section_type: string;
  location: string;
  original_text: string;
  proposed_text: string;
  reasoning: string;
  business_impact: string;
  confidence: number;
  status: "pending" | "accepted" | "rejected" | "modified";
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
}

interface StartConversationInput {
  jobId: string;
  analysisId: string;
}

interface UserMessageInput {
  content: string;
}

interface AssistantMessageInput {
  content: string;
  messageType?: "chat" | "question" | "suggestion" | "confirmation";
}

interface ModifyChangeInput {
  modifiedText: string;
}

export class ConversationService {
  startConversation(input: StartConversationInput): ConversationRecord {
    const db = getDatabase().getConnection();
    const id = crypto.randomBytes(8).toString("hex");
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO conversations (id, job_id, analysis_id, status, memory, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      id,
      input.jobId,
      input.analysisId,
      "active",
      "{}",
      now,
      now
    );

    return this.getConversation(id)!;
  }

  getConversation(conversationId: string): ConversationRecord | null {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(`SELECT * FROM conversations WHERE id = ?`);
    const row = stmt.get(conversationId) as any;

    if (!row) return null;

    // Parse memory JSON
    return {
      ...row,
      memory: typeof row.memory === "string" ? JSON.parse(row.memory) : row.memory,
    };
  }

  getConversationByJobId(jobId: string): ConversationRecord | null {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(`SELECT * FROM conversations WHERE job_id = ?`);
    const row = stmt.get(jobId) as any;

    if (!row) return null;

    // Parse memory JSON
    return {
      ...row,
      memory: typeof row.memory === "string" ? JSON.parse(row.memory) : row.memory,
    };
  }

  addUserMessage(
    conversationId: string,
    input: UserMessageInput
  ): ConversationMessageRecord {
    const db = getDatabase().getConnection();
    const id = crypto.randomBytes(8).toString("hex");
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO conversation_messages (id, conversation_id, role, content, message_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      id,
      conversationId,
      "user",
      input.content,
      "chat",
      now
    );

    // Update conversation updated_at timestamp
    const updateStmt = db.prepare(
      `UPDATE conversations SET updated_at = ? WHERE id = ?`
    );
    updateStmt.run(now, conversationId);

    return this.getConversationMessage(id)!;
  }

  addAssistantMessage(
    conversationId: string,
    input: AssistantMessageInput
  ): ConversationMessageRecord {
    const db = getDatabase().getConnection();
    const id = crypto.randomBytes(8).toString("hex");
    const now = new Date().toISOString();
    const messageType = input.messageType || "chat";

    const stmt = db.prepare(
      `INSERT INTO conversation_messages (id, conversation_id, role, content, message_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      id,
      conversationId,
      "assistant",
      input.content,
      messageType,
      now
    );

    // Update conversation updated_at timestamp
    const updateStmt = db.prepare(
      `UPDATE conversations SET updated_at = ? WHERE id = ?`
    );
    updateStmt.run(now, conversationId);

    return this.getConversationMessage(id)!;
  }

  private getConversationMessage(
    messageId: string
  ): ConversationMessageRecord | null {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(`SELECT * FROM conversation_messages WHERE id = ?`);
    const row = stmt.get(messageId) as any;
    return row || null;
  }

  getConversationMessages(conversationId: string): ConversationMessageRecord[] {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(
      `SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC`
    );
    return stmt.all(conversationId) as ConversationMessageRecord[];
  }

  updateMemory(
    conversationId: string,
    memory: Record<string, any>
  ): ConversationRecord {
    const db = getDatabase().getConnection();
    const now = new Date().toISOString();
    const memoryJson = JSON.stringify(memory);

    const stmt = db.prepare(
      `UPDATE conversations SET memory = ?, updated_at = ? WHERE id = ?`
    );
    stmt.run(memoryJson, now, conversationId);

    return this.getConversation(conversationId)!;
  }

  acceptChange(
    conversationId: string,
    changeSetId: string,
    jobId: string
  ): void {
    const db = getDatabase().getConnection();
    const id = crypto.randomBytes(8).toString("hex");
    const now = new Date().toISOString();

    // Update change set status
    const updateStmt = db.prepare(
      `UPDATE change_sets SET status = ?, decided_at = ? WHERE id = ?`
    );
    updateStmt.run("accepted", now, changeSetId);

    // Record in accepted_changes audit trail
    const insertStmt = db.prepare(
      `INSERT INTO accepted_changes (id, change_set_id, job_id, accepted_at)
       VALUES (?, ?, ?, ?)`
    );
    insertStmt.run(id, changeSetId, jobId, now);

    // Update conversation timestamp
    const conversationStmt = db.prepare(
      `UPDATE conversations SET updated_at = ? WHERE id = ?`
    );
    conversationStmt.run(now, conversationId);
  }

  rejectChange(
    conversationId: string,
    changeSetId: string,
    note?: string
  ): void {
    const db = getDatabase().getConnection();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `UPDATE change_sets SET status = ?, decided_at = ?, decision_note = ? WHERE id = ?`
    );
    stmt.run("rejected", now, note || null, changeSetId);

    // Update conversation timestamp
    const conversationStmt = db.prepare(
      `UPDATE conversations SET updated_at = ? WHERE id = ?`
    );
    conversationStmt.run(now, conversationId);
  }

  modifyChange(
    conversationId: string,
    changeSetId: string,
    input: ModifyChangeInput
  ): ChangeSetRecord {
    const db = getDatabase().getConnection();
    const now = new Date().toISOString();

    // Get current change set
    const getStmt = db.prepare(`SELECT * FROM change_sets WHERE id = ?`);
    const currentChangeSet = getStmt.get(changeSetId) as any;

    if (!currentChangeSet) {
      throw new Error(`Change set ${changeSetId} not found`);
    }

    // Update with modified text
    const updateStmt = db.prepare(
      `UPDATE change_sets SET status = ?, proposed_text = ?, decided_at = ? WHERE id = ?`
    );
    updateStmt.run("modified", input.modifiedText, now, changeSetId);

    // Update conversation timestamp
    const conversationStmt = db.prepare(
      `UPDATE conversations SET updated_at = ? WHERE id = ?`
    );
    conversationStmt.run(now, conversationId);

    return this.getChangeSet(changeSetId)!;
  }

  private getChangeSet(changeSetId: string): ChangeSetRecord | null {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(`SELECT * FROM change_sets WHERE id = ?`);
    const row = stmt.get(changeSetId) as any;
    return row || null;
  }

  getConversationChangeSets(conversationId: string): ChangeSetRecord[] {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(
      `SELECT * FROM change_sets WHERE conversation_id = ? ORDER BY created_at DESC`
    );
    return stmt.all(conversationId) as ChangeSetRecord[];
  }

  getPendingChangeSets(conversationId: string): ChangeSetRecord[] {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(
      `SELECT * FROM change_sets WHERE conversation_id = ? AND status = 'pending' ORDER BY confidence DESC, created_at ASC`
    );
    return stmt.all(conversationId) as ChangeSetRecord[];
  }

  closeConversation(conversationId: string): ConversationRecord {
    const db = getDatabase().getConnection();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `UPDATE conversations SET status = ?, updated_at = ? WHERE id = ?`
    );
    stmt.run("closed", now, conversationId);

    return this.getConversation(conversationId)!;
  }
}

export function createConversationService(): ConversationService {
  return new ConversationService();
}

export default {
  ConversationService,
  createConversationService,
};
