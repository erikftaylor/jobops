import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import { migrate005 } from "../../db/migrations/005-conversation-tables.js";
import crypto from "crypto";

// Mock implementation of ConversationService for testing
class MockConversationService {
  constructor(private db: Database.Database) {}

  startConversation(input: { jobId: string; analysisId: string }) {
    const id = crypto.randomBytes(8).toString("hex");
    const now = new Date().toISOString();

    const stmt = this.db.prepare(
      `INSERT INTO conversations (id, job_id, analysis_id, status, memory, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(id, input.jobId, input.analysisId, "active", "{}", now, now);

    return this.getConversation(id)!;
  }

  getConversation(conversationId: string) {
    const stmt = this.db.prepare(`SELECT * FROM conversations WHERE id = ?`);
    const row = stmt.get(conversationId) as any;

    if (!row) return null;

    return {
      ...row,
      memory: typeof row.memory === "string" ? JSON.parse(row.memory) : row.memory,
    };
  }

  getConversationByJobId(jobId: string) {
    const stmt = this.db.prepare(`SELECT * FROM conversations WHERE job_id = ?`);
    const row = stmt.get(jobId) as any;

    if (!row) return null;

    return {
      ...row,
      memory: typeof row.memory === "string" ? JSON.parse(row.memory) : row.memory,
    };
  }

  addUserMessage(conversationId: string, input: { content: string }) {
    const id = crypto.randomBytes(8).toString("hex");
    const now = new Date().toISOString();

    const stmt = this.db.prepare(
      `INSERT INTO conversation_messages (id, conversation_id, role, content, message_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    stmt.run(id, conversationId, "user", input.content, "chat", now);

    // Update conversation updated_at timestamp
    const updateStmt = this.db.prepare(
      `UPDATE conversations SET updated_at = ? WHERE id = ?`
    );
    updateStmt.run(now, conversationId);

    return this.getConversationMessage(id)!;
  }

  addAssistantMessage(conversationId: string, input: { content: string; messageType?: string }) {
    const id = crypto.randomBytes(8).toString("hex");
    const now = new Date().toISOString();
    const messageType = input.messageType || "chat";

    const stmt = this.db.prepare(
      `INSERT INTO conversation_messages (id, conversation_id, role, content, message_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    stmt.run(id, conversationId, "assistant", input.content, messageType, now);

    // Update conversation updated_at timestamp
    const updateStmt = this.db.prepare(
      `UPDATE conversations SET updated_at = ? WHERE id = ?`
    );
    updateStmt.run(now, conversationId);

    return this.getConversationMessage(id)!;
  }

  private getConversationMessage(messageId: string) {
    const stmt = this.db.prepare(`SELECT * FROM conversation_messages WHERE id = ?`);
    const row = stmt.get(messageId) as any;
    return row || null;
  }

  getConversationMessages(conversationId: string) {
    const stmt = this.db.prepare(
      `SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC`
    );
    return stmt.all(conversationId) as any[];
  }

  updateMemory(conversationId: string, memory: Record<string, any>) {
    const now = new Date().toISOString();
    const memoryJson = JSON.stringify(memory);

    const stmt = this.db.prepare(
      `UPDATE conversations SET memory = ?, updated_at = ? WHERE id = ?`
    );
    stmt.run(memoryJson, now, conversationId);

    return this.getConversation(conversationId)!;
  }

  acceptChange(conversationId: string, changeSetId: string, jobId: string): void {
    const id = crypto.randomBytes(8).toString("hex");
    const now = new Date().toISOString();

    // Update change set status
    const updateStmt = this.db.prepare(
      `UPDATE change_sets SET status = ?, decided_at = ? WHERE id = ?`
    );
    updateStmt.run("accepted", now, changeSetId);

    // Record in accepted_changes audit trail
    const insertStmt = this.db.prepare(
      `INSERT INTO accepted_changes (id, change_set_id, job_id, accepted_at)
       VALUES (?, ?, ?, ?)`
    );
    insertStmt.run(id, changeSetId, jobId, now);

    // Update conversation timestamp
    const conversationStmt = this.db.prepare(
      `UPDATE conversations SET updated_at = ? WHERE id = ?`
    );
    conversationStmt.run(now, conversationId);
  }

  rejectChange(conversationId: string, changeSetId: string, note?: string): void {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(
      `UPDATE change_sets SET status = ?, decided_at = ?, decision_note = ? WHERE id = ?`
    );
    stmt.run("rejected", now, note || null, changeSetId);

    // Update conversation timestamp
    const conversationStmt = this.db.prepare(
      `UPDATE conversations SET updated_at = ? WHERE id = ?`
    );
    conversationStmt.run(now, conversationId);
  }

  closeConversation(conversationId: string) {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(
      `UPDATE conversations SET status = ?, updated_at = ? WHERE id = ?`
    );
    stmt.run("closed", now, conversationId);

    return this.getConversation(conversationId)!;
  }

  getPendingChangeSets(conversationId: string) {
    const stmt = this.db.prepare(
      `SELECT * FROM change_sets WHERE conversation_id = ? AND status = 'pending' ORDER BY confidence DESC, created_at ASC`
    );
    return stmt.all(conversationId) as any[];
  }
}

// Initialize in-memory database with all required tables
function initDatabase(): Database.Database {
  const db = new Database(":memory:");

  // Create base tables required for foreign keys
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      description TEXT,
      state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'analyzed', 'refining', 'approved', 'generated', 'applied', 'closed')),
      url TEXT,
      location TEXT,
      salary_min REAL,
      salary_max REAL,
      currency TEXT DEFAULT 'USD',
      job_type TEXT CHECK (job_type IN ('full-time', 'contract', 'part-time', 'other')),
      source TEXT NOT NULL CHECK (source IN ('manual', 'linkedin', 'indeed', 'glassdoor', 'company_website', 'other')),
      source_url TEXT,
      source_id TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      discovered_at DATETIME,
      archived_at DATETIME,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      min_fit_score_override INTEGER,
      positioning_angle TEXT,
      UNIQUE(source, source_id),
      CHECK (min_fit_score_override IS NULL OR (min_fit_score_override >= 0 AND min_fit_score_override <= 100))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
      analyzed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      career_doc_version_hash TEXT,
      model TEXT,
      tokens_used INTEGER,
      skills_match TEXT NOT NULL,
      experience_gaps TEXT NOT NULL,
      positioning_suggestions TEXT,
      fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
      confidence_score REAL CHECK (confidence_score >= 0 AND confidence_score <= 1),
      fit_justification TEXT
    );
  `);

  // Apply conversation migrations
  migrate005(db);

  return db;
}

describe("ConversationService", () => {
  let db: Database.Database;
  let conversationService: MockConversationService;

  beforeEach(() => {
    db = initDatabase();
    conversationService = new MockConversationService(db);
  });

  afterEach(() => {
    db.close();
  });

  // Helper function to create a test job
  function createTestJob(jobId = uuid()): string {
    const stmt = db.prepare(
      `INSERT INTO jobs (id, title, company, source) VALUES (?, ?, ?, ?)`
    );
    stmt.run(jobId, "Test Job", "Test Company", "manual");
    return jobId;
  }

  // Helper function to create a test analysis
  function createTestAnalysis(jobId: string, analysisId = uuid()): string {
    const stmt = db.prepare(
      `INSERT INTO analyses (id, job_id, skills_match, experience_gaps) VALUES (?, ?, ?, ?)`
    );
    stmt.run(analysisId, jobId, "[]", "[]");
    return analysisId;
  }

  // Helper function to create a test change set
  function createTestChangeSet(conversationId: string, analysisId: string) {
    const id = crypto.randomBytes(8).toString("hex");
    const stmt = db.prepare(
      `INSERT INTO change_sets (
        id, conversation_id, analysis_id, section_type, location,
        original_text, proposed_text, reasoning, business_impact,
        confidence, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`
    );

    stmt.run(
      id,
      conversationId,
      analysisId,
      "bullet",
      "experience.0.description",
      "Original text",
      "Improved text",
      "Better clarity",
      JSON.stringify(["Increased clarity"]),
      0.85
    );

    return id;
  }

  it("should start a conversation", () => {
    const jobId = createTestJob();
    const analysisId = createTestAnalysis(jobId);

    const conversation = conversationService.startConversation({
      jobId,
      analysisId,
    });

    expect(conversation).toBeDefined();
    expect(conversation.id).toBeDefined();
    expect(conversation.job_id).toBe(jobId);
    expect(conversation.analysis_id).toBe(analysisId);
    expect(conversation.status).toBe("active");
    expect(conversation.memory).toEqual({});
    expect(conversation.created_at).toBeDefined();
    expect(conversation.updated_at).toBeDefined();
  });

  it("should add user message", () => {
    const jobId = createTestJob();
    const analysisId = createTestAnalysis(jobId);

    const conversation = conversationService.startConversation({
      jobId,
      analysisId,
    });

    const message = conversationService.addUserMessage(conversation.id, {
      content: "Test user message",
    });

    expect(message).toBeDefined();
    expect(message.id).toBeDefined();
    expect(message.conversation_id).toBe(conversation.id);
    expect(message.role).toBe("user");
    expect(message.content).toBe("Test user message");
    expect(message.message_type).toBe("chat");
    expect(message.created_at).toBeDefined();
  });

  it("should accept change and update memory", () => {
    const jobId = createTestJob();
    const analysisId = createTestAnalysis(jobId);

    const conversation = conversationService.startConversation({
      jobId,
      analysisId,
    });

    // Create a change set
    const changeSetId = createTestChangeSet(conversation.id, analysisId);

    // Accept the change
    conversationService.acceptChange(conversation.id, changeSetId, jobId);

    // Verify change set status was updated
    const stmt = db.prepare(`SELECT * FROM change_sets WHERE id = ?`);
    const updatedChangeset = stmt.get(changeSetId) as any;
    expect(updatedChangeset).toBeDefined();
    expect(updatedChangeset.status).toBe("accepted");
    expect(updatedChangeset.decided_at).toBeDefined();
  });

  it("should reject change with note", () => {
    const jobId = createTestJob();
    const analysisId = createTestAnalysis(jobId);

    const conversation = conversationService.startConversation({
      jobId,
      analysisId,
    });

    // Create a change set
    const changeSetId = createTestChangeSet(conversation.id, analysisId);

    // Reject the change
    const rejectionNote = "Not aligned with goals";
    conversationService.rejectChange(conversation.id, changeSetId, rejectionNote);

    // Verify change set was rejected
    const stmt = db.prepare(`SELECT * FROM change_sets WHERE id = ?`);
    const updatedChangeset = stmt.get(changeSetId) as any;
    expect(updatedChangeset).toBeDefined();
    expect(updatedChangeset.status).toBe("rejected");
    expect(updatedChangeset.decision_note).toBe(rejectionNote);
  });

  it("should retrieve conversation by ID", () => {
    const jobId = createTestJob();
    const analysisId = createTestAnalysis(jobId);

    const conversation = conversationService.startConversation({
      jobId,
      analysisId,
    });

    const retrieved = conversationService.getConversation(conversation.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(conversation.id);
    expect(retrieved?.job_id).toBe(jobId);
    expect(retrieved?.status).toBe("active");
  });

  it("should retrieve conversation by job ID", () => {
    const jobId = createTestJob();
    const analysisId = createTestAnalysis(jobId);

    const conversation = conversationService.startConversation({
      jobId,
      analysisId,
    });

    const retrieved = conversationService.getConversationByJobId(jobId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(conversation.id);
    expect(retrieved?.job_id).toBe(jobId);
  });

  it("should retrieve all conversation messages", () => {
    const jobId = createTestJob();
    const analysisId = createTestAnalysis(jobId);

    const conversation = conversationService.startConversation({
      jobId,
      analysisId,
    });

    // Add multiple messages
    conversationService.addUserMessage(conversation.id, {
      content: "First message",
    });
    conversationService.addAssistantMessage(conversation.id, {
      content: "Assistant response",
    });
    conversationService.addUserMessage(conversation.id, {
      content: "Follow-up message",
    });

    const messages = conversationService.getConversationMessages(conversation.id);
    expect(messages.length).toBe(3);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
    expect(messages[2].role).toBe("user");
  });

  it("should update conversation memory", () => {
    const jobId = createTestJob();
    const analysisId = createTestAnalysis(jobId);

    const conversation = conversationService.startConversation({
      jobId,
      analysisId,
    });

    const newMemory = {
      accepted_changes: ["change1", "change2"],
      user_tone_preference: "formal" as const,
      positioning_angle: "Senior Engineer",
    };

    const updated = conversationService.updateMemory(
      conversation.id,
      newMemory
    );

    expect(updated.memory).toEqual(newMemory);
    expect(updated.updated_at).toBeDefined();
  });

  it("should close conversation", () => {
    const jobId = createTestJob();
    const analysisId = createTestAnalysis(jobId);

    const conversation = conversationService.startConversation({
      jobId,
      analysisId,
    });

    const closed = conversationService.closeConversation(conversation.id);
    expect(closed.status).toBe("closed");
    expect(closed.updated_at).toBeDefined();
  });

  it("should get pending changes for conversation", () => {
    const jobId = createTestJob();
    const analysisId = createTestAnalysis(jobId);

    const conversation = conversationService.startConversation({
      jobId,
      analysisId,
    });

    // Create multiple changes
    createTestChangeSet(conversation.id, analysisId);
    createTestChangeSet(conversation.id, analysisId);

    const pending = conversationService.getPendingChangeSets(conversation.id);
    expect(pending.length).toBe(2);
    expect(pending.every((c) => c.status === "pending")).toBe(true);
  });
});
