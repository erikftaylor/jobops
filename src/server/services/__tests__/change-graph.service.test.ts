import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { ChangeGraphService, createChangeGraphService } from "../change-graph.service.js";
import { migrate005 } from "../../db/migrations/005-conversation-tables.js";
import { migrate006 } from "../../db/migrations/006-artifact-tables.js";

describe("ChangeGraphService", () => {
  let db: Database.Database;
  let service: ChangeGraphService;
  let jobId: string;
  let conversationId: string;
  let analysisId: string;

  beforeEach(() => {
    // Create in-memory database
    db = new Database(":memory:");

    // Initialize schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        state TEXT NOT NULL,
        added_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        analyzed_at DATETIME NOT NULL,
        fit_score REAL NOT NULL
      );
    `);

    // Run migrations
    migrate005(db);
    migrate006(db);

    // Create service
    service = createChangeGraphService(db);

    // Create test job, analysis, and conversation
    jobId = uuidv4();
    analysisId = uuidv4();
    conversationId = uuidv4();
    const now = new Date().toISOString();

    const jobStmt = db.prepare(`
      INSERT INTO jobs (id, title, company, state, added_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    jobStmt.run(jobId, "Test Job", "Test Co", "draft", now, now);

    const analysisStmt = db.prepare(`
      INSERT INTO analyses (id, job_id, analyzed_at, fit_score)
      VALUES (?, ?, ?, ?)
    `);
    analysisStmt.run(analysisId, jobId, now, 0.8);

    const convStmt = db.prepare(`
      INSERT INTO conversations (id, job_id, analysis_id, status, memory, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    convStmt.run(conversationId, jobId, analysisId, "active", "{}", now, now);
  });

  afterEach(() => {
    db.close();
  });

  describe("createChange", () => {
    it("should create a change node with all fields", () => {
      const result = service.createChange({
        target: "resume",
        field: "summary",
        operation: "modify",
        original_value: "Original summary",
        new_value: "New summary",
        reason: "Better alignment with job requirements",
        source: "ai_suggestion",
        confidence: 0.95,
        conversation_id: conversationId,
        analysis_id: analysisId,
        tags: ["summary", "ats-friendly"],
      });

      expect(result.id).toBeDefined();
      expect(result.target).toBe("resume");
      expect(result.field).toBe("summary");
      expect(result.operation).toBe("modify");
      expect(result.original_value).toBe("Original summary");
      expect(result.new_value).toBe("New summary");
      expect(result.reason).toBe("Better alignment with job requirements");
      expect(result.source).toBe("ai_suggestion");
      expect(result.confidence).toBe(0.95);
      expect(result.conversation_id).toBe(conversationId);
      expect(result.analysis_id).toBe(analysisId);
      expect(result.tags).toEqual(["summary", "ats-friendly"]);
      expect(result.created_at).toBeDefined();
    });

    it("should create a change with optional fields omitted", () => {
      const result = service.createChange({
        target: "cover_letter",
        field: "body",
        operation: "add",
        new_value: "New paragraph",
        reason: "Add company context",
        source: "user",
        confidence: 0.7,
      });

      expect(result.id).toBeDefined();
      expect(result.original_value).toBeUndefined();
      expect(result.conversation_id).toBeUndefined();
      expect(result.analysis_id).toBeUndefined();
      expect(result.tags).toBeUndefined();
      expect(result.created_at).toBeDefined();
    });
  });

  describe("getChangeById", () => {
    it("should retrieve a change by ID", () => {
      const created = service.createChange({
        target: "resume",
        field: "experience",
        operation: "add",
        new_value: JSON.stringify({ company: "Acme", title: "Engineer" }),
        reason: "Add relevant experience",
        source: "analysis",
        confidence: 0.85,
        conversation_id: conversationId,
      });

      const retrieved = service.getChangeById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.field).toBe("experience");
      expect(retrieved?.source).toBe("analysis");
    });

    it("should return null for non-existent change", () => {
      const retrieved = service.getChangeById("non-existent-id");
      expect(retrieved).toBeNull();
    });
  });

  describe("getChangesForJob", () => {
    it("should get all changes for a specific job", () => {
      // Create multiple changes
      service.createChange({
        target: "resume",
        field: "summary",
        operation: "modify",
        new_value: "Summary 1",
        reason: "Reason 1",
        source: "ai_suggestion",
        confidence: 0.8,
        conversation_id: conversationId,
      });

      service.createChange({
        target: "cover_letter",
        field: "body",
        operation: "rewrite",
        new_value: "Body 1",
        reason: "Reason 2",
        source: "user",
        confidence: 0.7,
        conversation_id: conversationId,
      });

      const changes = service.getChangesForJob(jobId);

      expect(changes.length).toBe(2);
      const reasons = changes.map((c) => c.reason);
      expect(reasons).toContain("Reason 1");
      expect(reasons).toContain("Reason 2");
    });

    it("should return empty array for job with no changes", () => {
      const changes = service.getChangesForJob("non-existent-job");
      expect(changes.length).toBe(0);
    });
  });

  describe("getChangesByTarget", () => {
    it("should get changes by target (resume)", () => {
      service.createChange({
        target: "resume",
        field: "summary",
        operation: "modify",
        new_value: "Summary",
        reason: "Resume change",
        source: "ai_suggestion",
        confidence: 0.8,
        conversation_id: conversationId,
      });

      service.createChange({
        target: "cover_letter",
        field: "body",
        operation: "modify",
        new_value: "Body",
        reason: "Letter change",
        source: "user",
        confidence: 0.7,
        conversation_id: conversationId,
      });

      const resumeChanges = service.getChangesByTarget(jobId, "resume");
      expect(resumeChanges.length).toBe(1);
      expect(resumeChanges[0].target).toBe("resume");
    });

    it("should get changes by target (cover_letter)", () => {
      service.createChange({
        target: "resume",
        field: "summary",
        operation: "modify",
        new_value: "Summary",
        reason: "Resume change",
        source: "ai_suggestion",
        confidence: 0.8,
        conversation_id: conversationId,
      });

      service.createChange({
        target: "cover_letter",
        field: "body",
        operation: "modify",
        new_value: "Body",
        reason: "Letter change",
        source: "user",
        confidence: 0.7,
        conversation_id: conversationId,
      });

      const letterChanges = service.getChangesByTarget(jobId, "cover_letter");
      expect(letterChanges.length).toBe(1);
      expect(letterChanges[0].target).toBe("cover_letter");
    });
  });

  describe("getChangesBySource", () => {
    it("should get changes filtered by source (ai_suggestion)", () => {
      service.createChange({
        target: "resume",
        field: "summary",
        operation: "modify",
        new_value: "Summary",
        reason: "AI suggestion",
        source: "ai_suggestion",
        confidence: 0.9,
        conversation_id: conversationId,
      });

      service.createChange({
        target: "resume",
        field: "experience",
        operation: "add",
        new_value: "Experience",
        reason: "User input",
        source: "user",
        confidence: 0.8,
        conversation_id: conversationId,
      });

      const aiChanges = service.getChangesBySource(jobId, "ai_suggestion");
      expect(aiChanges.length).toBe(1);
      expect(aiChanges[0].source).toBe("ai_suggestion");
    });

    it("should get changes filtered by source (user)", () => {
      service.createChange({
        target: "resume",
        field: "summary",
        operation: "modify",
        new_value: "Summary",
        reason: "AI suggestion",
        source: "ai_suggestion",
        confidence: 0.9,
        conversation_id: conversationId,
      });

      service.createChange({
        target: "resume",
        field: "experience",
        operation: "add",
        new_value: "Experience",
        reason: "User input",
        source: "user",
        confidence: 0.8,
        conversation_id: conversationId,
      });

      const userChanges = service.getChangesBySource(jobId, "user");
      expect(userChanges.length).toBe(1);
      expect(userChanges[0].source).toBe("user");
    });
  });

  describe("getHighConfidenceChanges", () => {
    it("should filter changes by minimum confidence threshold", () => {
      service.createChange({
        target: "resume",
        field: "summary",
        operation: "modify",
        new_value: "Summary",
        reason: "High confidence",
        source: "ai_suggestion",
        confidence: 0.95,
        conversation_id: conversationId,
      });

      service.createChange({
        target: "resume",
        field: "experience",
        operation: "add",
        new_value: "Experience",
        reason: "Medium confidence",
        source: "ai_suggestion",
        confidence: 0.65,
        conversation_id: conversationId,
      });

      service.createChange({
        target: "resume",
        field: "skills",
        operation: "modify",
        new_value: "Skills",
        reason: "Low confidence",
        source: "user",
        confidence: 0.4,
        conversation_id: conversationId,
      });

      const highConfidence = service.getHighConfidenceChanges(jobId, 0.8);
      expect(highConfidence.length).toBe(1);
      expect(highConfidence[0].confidence).toBe(0.95);
    });

    it("should return changes sorted by confidence descending", () => {
      service.createChange({
        target: "resume",
        field: "summary",
        operation: "modify",
        new_value: "Summary",
        reason: "Reason 1",
        source: "ai_suggestion",
        confidence: 0.7,
        conversation_id: conversationId,
      });

      service.createChange({
        target: "resume",
        field: "experience",
        operation: "add",
        new_value: "Experience",
        reason: "Reason 2",
        source: "ai_suggestion",
        confidence: 0.9,
        conversation_id: conversationId,
      });

      const changes = service.getHighConfidenceChanges(jobId, 0.6);
      expect(changes.length).toBe(2);
      expect(changes[0].confidence).toBe(0.9);
      expect(changes[1].confidence).toBe(0.7);
    });
  });

  describe("getChangesByTag", () => {
    it("should filter changes by tag", () => {
      service.createChange({
        target: "resume",
        field: "summary",
        operation: "modify",
        new_value: "Summary",
        reason: "Tagged change",
        source: "ai_suggestion",
        confidence: 0.8,
        conversation_id: conversationId,
        tags: ["important", "ats-friendly"],
      });

      service.createChange({
        target: "resume",
        field: "experience",
        operation: "add",
        new_value: "Experience",
        reason: "Untagged change",
        source: "user",
        confidence: 0.7,
        conversation_id: conversationId,
      });

      const taggedChanges = service.getChangesByTag(jobId, "ats-friendly");
      expect(taggedChanges.length).toBe(1);
      expect(taggedChanges[0].tags).toContain("ats-friendly");
    });

    it("should handle multiple tags", () => {
      service.createChange({
        target: "resume",
        field: "summary",
        operation: "modify",
        new_value: "Summary",
        reason: "Multi-tagged",
        source: "ai_suggestion",
        confidence: 0.8,
        conversation_id: conversationId,
        tags: ["important", "ats-friendly", "critical"],
      });

      const importantChanges = service.getChangesByTag(jobId, "important");
      expect(importantChanges.length).toBe(1);

      const criticalChanges = service.getChangesByTag(jobId, "critical");
      expect(criticalChanges.length).toBe(1);
    });
  });

  describe("countByOperation", () => {
    it("should count changes by operation type", () => {
      service.createChange({
        target: "resume",
        field: "summary",
        operation: "add",
        new_value: "Summary",
        reason: "Add",
        source: "ai_suggestion",
        confidence: 0.8,
        conversation_id: conversationId,
      });

      service.createChange({
        target: "resume",
        field: "summary",
        operation: "add",
        new_value: "Summary 2",
        reason: "Add another",
        source: "user",
        confidence: 0.7,
        conversation_id: conversationId,
      });

      service.createChange({
        target: "resume",
        field: "experience",
        operation: "modify",
        new_value: "Modified",
        reason: "Modify",
        source: "ai_suggestion",
        confidence: 0.8,
        conversation_id: conversationId,
      });

      service.createChange({
        target: "resume",
        field: "skills",
        operation: "remove",
        original_value: "Old skill",
        reason: "Remove",
        source: "user",
        confidence: 0.6,
        conversation_id: conversationId,
      });

      const counts = service.countByOperation(jobId);

      expect(counts.add).toBe(2);
      expect(counts.modify).toBe(1);
      expect(counts.remove).toBe(1);
      expect(counts.rewrite).toBe(0);
    });
  });

  describe("acceptChange", () => {
    it("should accept a change and set accepted_at timestamp", () => {
      const created = service.createChange({
        target: "resume",
        field: "summary",
        operation: "modify",
        new_value: "Summary",
        reason: "Reason",
        source: "ai_suggestion",
        confidence: 0.8,
        conversation_id: conversationId,
      });

      const accepted = service.acceptChange(created.id);

      expect(accepted).toBeDefined();
      expect(accepted?.accepted_at).toBeDefined();
      expect(accepted?.id).toBe(created.id);
    });

    it("should return null for non-existent change when accepting", () => {
      const result = service.acceptChange("non-existent-id");
      expect(result).toBeNull();
    });
  });
});
