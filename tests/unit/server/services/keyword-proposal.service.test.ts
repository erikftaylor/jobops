import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { createKeywordProposalService } from "../../../../src/server/services/keyword-proposal.service.js";
import { createChangeGraphService } from "../../../../src/server/services/change-graph.service.js";
import { v4 as uuidv4 } from "uuid";

describe("KeywordProposalService", () => {
  let db: Database.Database;
  let keywordProposalService: ReturnType<typeof createKeywordProposalService>;
  let changeGraphService: ReturnType<typeof createChangeGraphService>;
  let jobId: string;

  beforeEach(() => {
    db = new Database(":memory:");

    // Setup schema
    setupDatabase(db);

    changeGraphService = createChangeGraphService(db);
    keywordProposalService = createKeywordProposalService(db, changeGraphService);
    jobId = uuidv4();

    // Create test job
    const jobStmt = db.prepare(`
      INSERT INTO jobs (id, title, company, source, added_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    jobStmt.run(jobId, "Test Job", "Test Company", "manual", new Date().toISOString(), new Date().toISOString());
  });

  function setupDatabase(db: Database.Database) {
    // Create minimal schema for testing
    db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        source TEXT NOT NULL,
        added_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        analysis_id TEXT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        memory TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS change_graph (
        id TEXT PRIMARY KEY,
        target TEXT NOT NULL CHECK (target IN ('resume', 'cover_letter', 'both')),
        field TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('add', 'remove', 'modify', 'rewrite')),
        original_value TEXT,
        new_value TEXT,
        reason TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('analysis', 'user', 'ai_suggestion', 'system')),
        confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
        accepted_at DATETIME,
        conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
        analysis_id TEXT,
        tags TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS keyword_proposals (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        keyword TEXT NOT NULL,
        suggested_language TEXT NOT NULL,
        target TEXT NOT NULL CHECK (target IN ('resume', 'cover_letter', 'both')),
        status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'ignored')) DEFAULT 'pending',
        change_node_id TEXT REFERENCES change_graph(id) ON DELETE SET NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        accepted_at DATETIME,
        ignored_at DATETIME
      );

      CREATE INDEX IF NOT EXISTS idx_keyword_proposals_job_id ON keyword_proposals(job_id);
      CREATE INDEX IF NOT EXISTS idx_keyword_proposals_status ON keyword_proposals(status);
    `);
  }

  describe("proposeKeyword", () => {
    it("should create a keyword proposal with a change graph node", () => {
      const proposal = keywordProposalService.proposeKeyword(
        jobId,
        "TypeScript",
        "Strong expertise in TypeScript development",
        "resume"
      );

      expect(proposal).toBeDefined();
      expect(proposal.jobId).toBe(jobId);
      expect(proposal.keyword).toBe("TypeScript");
      expect(proposal.suggestedLanguage).toBe("Strong expertise in TypeScript development");
      expect(proposal.target).toBe("resume");
      expect(proposal.status).toBe("pending");
      expect(proposal.changeNodeId).toBeDefined();
      expect(proposal.createdAt).toBeDefined();
    });

    it("should create multiple proposals for different keywords", () => {
      const proposal1 = keywordProposalService.proposeKeyword(
        jobId,
        "React",
        "Experience with React frameworks",
        "resume"
      );

      const proposal2 = keywordProposalService.proposeKeyword(
        jobId,
        "Node.js",
        "Backend development with Node.js",
        "resume"
      );

      expect(proposal1.id).not.toBe(proposal2.id);
      expect(proposal1.keyword).toBe("React");
      expect(proposal2.keyword).toBe("Node.js");
    });
  });

  describe("acceptProposal", () => {
    it("should accept a pending proposal", () => {
      const proposal = keywordProposalService.proposeKeyword(
        jobId,
        "Python",
        "Python programming experience",
        "resume"
      );

      const accepted = keywordProposalService.acceptProposal(proposal.id);

      expect(accepted).toBeDefined();
      expect(accepted?.status).toBe("accepted");
      expect(accepted?.acceptedAt).toBeDefined();
    });

    it("should update the change graph node when accepting", () => {
      const proposal = keywordProposalService.proposeKeyword(
        jobId,
        "AWS",
        "AWS cloud infrastructure experience",
        "resume"
      );

      keywordProposalService.acceptProposal(proposal.id);

      const changeNode = changeGraphService.getChangeById(proposal.changeNodeId!);
      expect(changeNode).toBeDefined();
      expect(changeNode?.accepted_at).toBeDefined();
    });

    it("should return null for non-existent proposal", () => {
      const result = keywordProposalService.acceptProposal("non-existent-id");
      expect(result).toBeNull();
    });
  });

  describe("ignoreProposal", () => {
    it("should ignore a pending proposal", () => {
      const proposal = keywordProposalService.proposeKeyword(
        jobId,
        "Java",
        "Java development experience",
        "resume"
      );

      const ignored = keywordProposalService.ignoreProposal(proposal.id);

      expect(ignored).toBeDefined();
      expect(ignored?.status).toBe("ignored");
      expect(ignored?.ignoredAt).toBeDefined();
    });

    it("should persist ignored proposals", () => {
      const proposal = keywordProposalService.proposeKeyword(
        jobId,
        "Scala",
        "Scala programming experience",
        "resume"
      );

      keywordProposalService.ignoreProposal(proposal.id);

      const retrieved = keywordProposalService.getProposalById(proposal.id);
      expect(retrieved?.status).toBe("ignored");
    });

    it("should return null for non-existent proposal", () => {
      const result = keywordProposalService.ignoreProposal("non-existent-id");
      expect(result).toBeNull();
    });
  });

  describe("getProposalsByJob", () => {
    it("should return all proposals for a job", () => {
      keywordProposalService.proposeKeyword(jobId, "TypeScript", "TypeScript expertise", "resume");
      keywordProposalService.proposeKeyword(jobId, "React", "React experience", "resume");
      keywordProposalService.proposeKeyword(jobId, "Node.js", "Node.js backend", "resume");

      const proposals = keywordProposalService.getProposalsByJob(jobId);

      expect(proposals).toHaveLength(3);
      expect(proposals.map((p) => p.keyword)).toContain("TypeScript");
      expect(proposals.map((p) => p.keyword)).toContain("React");
      expect(proposals.map((p) => p.keyword)).toContain("Node.js");
    });

    it("should return empty array for job with no proposals", () => {
      const proposals = keywordProposalService.getProposalsByJob(jobId);
      expect(proposals).toHaveLength(0);
    });
  });

  describe("getPendingProposalsByJob", () => {
    it("should return only pending proposals", () => {
      const p1 = keywordProposalService.proposeKeyword(jobId, "TypeScript", "TypeScript", "resume");
      const p2 = keywordProposalService.proposeKeyword(jobId, "React", "React", "resume");
      const p3 = keywordProposalService.proposeKeyword(jobId, "Node.js", "Node.js", "resume");

      keywordProposalService.acceptProposal(p1.id);
      keywordProposalService.ignoreProposal(p2.id);

      const pending = keywordProposalService.getPendingProposalsByJob(jobId);

      expect(pending).toHaveLength(1);
      expect(pending[0].keyword).toBe("Node.js");
    });
  });

  describe("getAcceptedProposalsByJob", () => {
    it("should return only accepted proposals", () => {
      const p1 = keywordProposalService.proposeKeyword(jobId, "TypeScript", "TypeScript", "resume");
      const p2 = keywordProposalService.proposeKeyword(jobId, "React", "React", "resume");
      const p3 = keywordProposalService.proposeKeyword(jobId, "Node.js", "Node.js", "resume");

      keywordProposalService.acceptProposal(p1.id);
      keywordProposalService.acceptProposal(p2.id);
      keywordProposalService.ignoreProposal(p3.id);

      const accepted = keywordProposalService.getAcceptedProposalsByJob(jobId);

      expect(accepted).toHaveLength(2);
      expect(accepted.map((p) => p.keyword)).toContain("TypeScript");
      expect(accepted.map((p) => p.keyword)).toContain("React");
    });
  });

  describe("getIgnoredProposalsByJob", () => {
    it("should return only ignored proposals", () => {
      const p1 = keywordProposalService.proposeKeyword(jobId, "TypeScript", "TypeScript", "resume");
      const p2 = keywordProposalService.proposeKeyword(jobId, "React", "React", "resume");
      const p3 = keywordProposalService.proposeKeyword(jobId, "Node.js", "Node.js", "resume");

      keywordProposalService.acceptProposal(p1.id);
      keywordProposalService.ignoreProposal(p2.id);
      keywordProposalService.ignoreProposal(p3.id);

      const ignored = keywordProposalService.getIgnoredProposalsByJob(jobId);

      expect(ignored).toHaveLength(2);
      expect(ignored.map((p) => p.keyword)).toContain("React");
      expect(ignored.map((p) => p.keyword)).toContain("Node.js");
    });
  });
});
