import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { ArtifactService } from "../artifact.service.js";
import { migrate005 } from "../../db/migrations/005-conversation-tables.js";
import { migrate006 } from "../../db/migrations/006-artifact-tables.js";
import { migrate008 } from "../../db/migrations/008-workspace-persistence.js";
import { migrate009 } from "../../db/migrations/009-job-artifacts.js";

describe("ArtifactService", () => {
  let db: Database.Database;
  let service: ArtifactService;
  let jobId: string;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(":memory:");

    // Run migrations - order matters
    const initialSql = `
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        description TEXT,
        state TEXT NOT NULL DEFAULT 'draft',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        job_id TEXT UNIQUE REFERENCES jobs(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE
      );
    `;
    db.exec(initialSql);

    migrate005(db);
    migrate006(db);
    migrate008(db);
    migrate009(db);

    service = new ArtifactService(db);

    // Create a test job
    const jobStmt = db.prepare(`
      INSERT INTO jobs (id, title, company, description, state, created_at, added_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    jobId = "test-job-123";
    const now = new Date().toISOString();
    jobStmt.run(jobId, "Software Engineer", "Test Co", "Test job description", "draft", now, now, now);
  });

  afterEach(() => {
    db.close();
  });

  describe("create", () => {
    it("should create a new artifact with version 1", () => {
      const artifact = service.create({
        jobId,
        artifactType: "resume",
        careerDocVersionId: "cv-v1",
        promptVersion: 1,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Senior Engineer",
            highPriorityKeywords: ["TypeScript", "React"],
            strengthsToHighlight: ["10+ years experience", "Technical leadership"],
          },
          resume: {
            professionalSummary: "Experienced software engineer",
            coreSkills: ["TypeScript", "React", "Node.js"],
            experience: [
              {
                title: "Senior Engineer",
                company: "Tech Co",
                dates: "2020-2024",
                description: "Led team",
              },
            ],
            education: [
              {
                school: "University",
                degree: "BS Computer Science",
                year: "2014",
              },
            ],
          },
        },
        renderedText: "John Doe\nSoftware Engineer\n\nSkills: TypeScript, React",
        positioning: "Senior Engineer",
      });

      expect(artifact.id).toBeDefined();
      expect(artifact.jobId).toBe(jobId);
      expect(artifact.artifactType).toBe("resume");
      expect(artifact.version).toBe(1);
      expect(artifact.status).toBe("ready");
      expect(artifact.isPreferred).toBe(false);
    });

    it("should auto-increment version for same job+type", () => {
      const artifact1 = service.create({
        jobId,
        artifactType: "resume",
        careerDocVersionId: "cv-v1",
        promptVersion: 1,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Engineer",
            highPriorityKeywords: [],
            strengthsToHighlight: [],
          },
          resume: {
            professionalSummary: "Summary",
            coreSkills: [],
            experience: [],
            education: [],
          },
        },
        renderedText: "Text",
      });

      const artifact2 = service.create({
        jobId,
        artifactType: "resume",
        careerDocVersionId: "cv-v2",
        promptVersion: 2,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Engineer",
            highPriorityKeywords: [],
            strengthsToHighlight: [],
          },
          resume: {
            professionalSummary: "Summary",
            coreSkills: [],
            experience: [],
            education: [],
          },
        },
        renderedText: "Text",
      });

      expect(artifact1.version).toBe(1);
      expect(artifact2.version).toBe(2);
    });

    it("should allow different artifact types to have independent versions", () => {
      const resume = service.create({
        jobId,
        artifactType: "resume",
        careerDocVersionId: "cv-v1",
        promptVersion: 1,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Engineer",
            highPriorityKeywords: [],
            strengthsToHighlight: [],
          },
          resume: {
            professionalSummary: "Summary",
            coreSkills: [],
            experience: [],
            education: [],
          },
        },
        renderedText: "Text",
      });

      const coverLetter = service.create({
        jobId,
        artifactType: "cover_letter",
        careerDocVersionId: "cv-v1",
        promptVersion: 1,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Engineer",
            highPriorityKeywords: [],
            strengthsToHighlight: [],
          },
          resume: {
            professionalSummary: "Summary",
            coreSkills: [],
            experience: [],
            education: [],
          },
        },
        renderedText: "Text",
      });

      expect(resume.version).toBe(1);
      expect(coverLetter.version).toBe(1);
      expect(resume.artifactType).toBe("resume");
      expect(coverLetter.artifactType).toBe("cover_letter");
    });
  });

  describe("getById", () => {
    it("should retrieve artifact by ID", () => {
      const created = service.create({
        jobId,
        artifactType: "resume",
        careerDocVersionId: "cv-v1",
        promptVersion: 1,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Engineer",
            highPriorityKeywords: [],
            strengthsToHighlight: [],
          },
          resume: {
            professionalSummary: "Summary",
            coreSkills: [],
            experience: [],
            education: [],
          },
        },
        renderedText: "Text",
      });

      const retrieved = service.getById(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.jobId).toBe(jobId);
    });

    it("should return null for non-existent artifact", () => {
      const result = service.getById("nonexistent-id");
      expect(result).toBeNull();
    });
  });

  describe("listByJob", () => {
    it("should list all artifacts for a job", () => {
      const artifact1 = service.create({
        jobId,
        artifactType: "resume",
        careerDocVersionId: "cv-v1",
        promptVersion: 1,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Engineer",
            highPriorityKeywords: [],
            strengthsToHighlight: [],
          },
          resume: {
            professionalSummary: "Summary",
            coreSkills: [],
            experience: [],
            education: [],
          },
        },
        renderedText: "Text 1",
      });

      const artifact2 = service.create({
        jobId,
        artifactType: "resume",
        careerDocVersionId: "cv-v2",
        promptVersion: 2,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Engineer",
            highPriorityKeywords: [],
            strengthsToHighlight: [],
          },
          resume: {
            professionalSummary: "Summary",
            coreSkills: [],
            experience: [],
            education: [],
          },
        },
        renderedText: "Text 2",
      });

      expect(artifact1.version).toBe(1);
      expect(artifact2.version).toBe(2);

      const artifacts = service.listByJob(jobId);
      expect(artifacts).toHaveLength(2);
      // Versions should be 1 and 2 (order may vary due to creation time)
      const versions = artifacts.map(a => a.version).sort();
      expect(versions).toEqual([1, 2]);
    });

    it("should filter by artifact type", () => {
      service.create({
        jobId,
        artifactType: "resume",
        careerDocVersionId: "cv-v1",
        promptVersion: 1,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Engineer",
            highPriorityKeywords: [],
            strengthsToHighlight: [],
          },
          resume: {
            professionalSummary: "Summary",
            coreSkills: [],
            experience: [],
            education: [],
          },
        },
        renderedText: "Text",
      });

      service.create({
        jobId,
        artifactType: "cover_letter",
        careerDocVersionId: "cv-v1",
        promptVersion: 1,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Engineer",
            highPriorityKeywords: [],
            strengthsToHighlight: [],
          },
          resume: {
            professionalSummary: "Summary",
            coreSkills: [],
            experience: [],
            education: [],
          },
        },
        renderedText: "Text",
      });

      const resumes = service.listByJob(jobId, "resume");
      expect(resumes).toHaveLength(1);
      expect(resumes[0].artifactType).toBe("resume");
    });
  });

  describe("getLatestByType", () => {
    it("should get the latest artifact version by type", () => {
      service.create({
        jobId,
        artifactType: "resume",
        careerDocVersionId: "cv-v1",
        promptVersion: 1,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Engineer",
            highPriorityKeywords: [],
            strengthsToHighlight: [],
          },
          resume: {
            professionalSummary: "Summary",
            coreSkills: [],
            experience: [],
            education: [],
          },
        },
        renderedText: "Text",
      });

      const v2 = service.create({
        jobId,
        artifactType: "resume",
        careerDocVersionId: "cv-v2",
        promptVersion: 2,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Engineer",
            highPriorityKeywords: [],
            strengthsToHighlight: [],
          },
          resume: {
            professionalSummary: "Summary",
            coreSkills: [],
            experience: [],
            education: [],
          },
        },
        renderedText: "Text",
      });

      const latest = service.getLatestByType(jobId, "resume");
      expect(latest?.version).toBe(2);
      expect(latest?.id).toBe(v2.id);
    });
  });

  describe("markPreferred", () => {
    it("should mark artifact as preferred", () => {
      const artifact = service.create({
        jobId,
        artifactType: "resume",
        careerDocVersionId: "cv-v1",
        promptVersion: 1,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Engineer",
            highPriorityKeywords: [],
            strengthsToHighlight: [],
          },
          resume: {
            professionalSummary: "Summary",
            coreSkills: [],
            experience: [],
            education: [],
          },
        },
        renderedText: "Text",
      });

      expect(artifact.isPreferred).toBe(false);

      const marked = service.markPreferred(artifact.id);
      expect(marked.isPreferred).toBe(true);
    });
  });

  describe("archive", () => {
    it("should archive artifact", () => {
      const artifact = service.create({
        jobId,
        artifactType: "resume",
        careerDocVersionId: "cv-v1",
        promptVersion: 1,
        model: "claude-sonnet-4-20250514",
        jsonContent: {
          analysis: {
            positioning: "Engineer",
            highPriorityKeywords: [],
            strengthsToHighlight: [],
          },
          resume: {
            professionalSummary: "Summary",
            coreSkills: [],
            experience: [],
            education: [],
          },
        },
        renderedText: "Text",
      });

      expect(artifact.status).toBe("ready");

      const archived = service.archive(artifact.id);
      expect(archived.status).toBe("archived");
    });
  });

  describe("JSON serialization", () => {
    it("should properly serialize and deserialize JSON content", () => {
      const originalContent = {
        analysis: {
          positioning: "Lead Designer",
          highPriorityKeywords: ["UX", "Design Systems", "Accessibility"],
          strengthsToHighlight: ["15+ years experience", "Team leadership"],
        },
        resume: {
          professionalSummary: "Experienced UX designer",
          coreSkills: ["Figma", "Sketch", "Prototyping"],
          experience: [
            {
              title: "Lead Designer",
              company: "Design Co",
              dates: "2020-2024",
              description: "Led design",
              bullets: ["Mentored 5 designers"],
            },
          ],
          education: [
            {
              school: "Design School",
              degree: "BFA Graphic Design",
              year: "2008",
            },
          ],
        },
      };

      const artifact = service.create({
        jobId,
        artifactType: "resume",
        careerDocVersionId: "cv-v1",
        promptVersion: 1,
        model: "claude-sonnet-4-20250514",
        jsonContent: originalContent,
        renderedText: "Text",
      });

      const retrieved = service.getById(artifact.id);
      expect(retrieved?.jsonContent).toEqual(originalContent);
    });
  });
});
