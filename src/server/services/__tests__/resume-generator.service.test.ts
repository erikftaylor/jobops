import { describe, it, expect, beforeEach } from "vitest";
import { ResumeGeneratorService } from "../resume-generator.service.js";
import { ResumePromptBuilderService } from "../resume-prompt-builder.service.js";
import { ArtifactService } from "../artifact.service.js";
import { ClaudeService } from "../claude.service.js";
import Database from "better-sqlite3";
import type { CareerModel } from "@shared/types";
import { migrate009 } from "../../db/migrations/009-job-artifacts.js";
import { migrate005 } from "../../db/migrations/005-conversation-tables.js";
import { migrate006 } from "../../db/migrations/006-artifact-tables.js";
import { migrate008 } from "../../db/migrations/008-workspace-persistence.js";

describe("ResumeGeneratorService - Source-Consistency Validation", () => {
  let db: Database.Database;
  let service: ResumeGeneratorService;
  let artifactService: ArtifactService;
  let mockClaudeService: Partial<ClaudeService>;
  let jobId: string;

  const careerProfile: CareerModel = {
    fullName: "John Doe",
    sections: {
      summary: "Senior Software Engineer with 8+ years of experience",
      experience: [
        {
          company: "TechCorp",
          title: "Senior Engineer",
          startDate: "2020-01-01",
          endDate: "2024-06-14",
          description: "Led development of microservices architecture",
          metrics: ["40% performance improvement", "Mentored 5 engineers"],
        },
        {
          company: "StartupXYZ",
          title: "Full Stack Engineer",
          startDate: "2018-06-01",
          endDate: "2019-12-31",
          description: "Built MVP from scratch",
          metrics: ["Shipped v1.0 in 6 months"],
        },
      ],
      skills: [
        "TypeScript",
        "Node.js",
        "React",
        "AWS",
        "Docker",
        "PostgreSQL",
        "System Design",
      ],
      education: [
        {
          school: "State University",
          degree: "BS Computer Science",
          year: "2016",
        },
      ],
    },
    metadata: {
      hash: "hash-v1",
      source: "manual",
    },
  };

  beforeEach(() => {
    db = new Database(":memory:");

    // Create schema
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

    // Create test job
    const jobStmt = db.prepare(`
      INSERT INTO jobs (id, title, company, description, state, created_at, added_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    jobId = "test-job-123";
    const now = new Date().toISOString();
    jobStmt.run(jobId, "Senior Engineer", "TechCorp", "Looking for senior engineers", "draft", now, now, now);

    // Initialize services
    artifactService = new ArtifactService(db);
    const promptBuilder = new ResumePromptBuilderService();

    // Mock Claude service (not testing actual Claude, just validation logic)
    mockClaudeService = {
      analyzeJobWithJSON: () => {
        throw new Error("Should not be called in these tests");
      },
    };

    service = new ResumeGeneratorService(
      mockClaudeService as any,
      promptBuilder,
      artifactService
    );
  });

  describe("Source-Consistency Validation", () => {
    it("should accept resume with all data from career profile", () => {
      const validResume = {
        analysis: {
          positioning: "Senior Software Engineer",
          highPriorityKeywords: ["TypeScript", "Node.js", "System Design"],
          strengthsToHighlight: ["Led microservices", "Mentored engineers"],
        },
        resume: {
          professionalSummary: "Senior Software Engineer with 8+ years of experience",
          coreSkills: ["TypeScript", "Node.js", "React", "AWS"],
          experience: [
            {
              title: "Senior Engineer",
              company: "TechCorp",
              dates: "2020-2024",
              description: "Led development of microservices architecture",
              bullets: ["40% performance improvement", "Mentored 5 engineers"],
            },
          ],
          education: [
            {
              school: "State University",
              degree: "BS Computer Science",
              year: "2016",
            },
          ],
        },
      };

      // This should NOT throw (validation passes)
      expect(() => {
        // Call private method via service for testing
        const validation = (service as any).validateSourceConsistency(validResume, careerProfile);
        expect(validation).toBeUndefined(); // No error thrown
      }).not.toThrow();
    });

    it("should reject resume with hallucinated company", () => {
      const hallucineatedResume = {
        analysis: {
          positioning: "Senior Engineer",
          highPriorityKeywords: ["TypeScript"],
          strengthsToHighlight: [],
        },
        resume: {
          professionalSummary: "Summary",
          coreSkills: ["TypeScript"],
          experience: [
            {
              title: "Engineer",
              company: "FakeCorp", // ← NOT in career profile
              dates: "2020-2024",
              description: "Worked here",
              bullets: [],
            },
          ],
          education: [],
        },
      };

      expect(() => {
        (service as any).validateSourceConsistency(hallucineatedResume, careerProfile);
      }).toThrow(/Hallucinated company|FakeCorp/);
    });

    it("should reject resume with unsupported skill", () => {
      const unsupportedSkillResume = {
        analysis: {
          positioning: "Senior Engineer",
          highPriorityKeywords: ["Python"], // ← NOT in career profile skills
          strengthsToHighlight: [],
        },
        resume: {
          professionalSummary: "Summary",
          coreSkills: ["Python"], // ← NOT in career profile
          experience: [
            {
              title: "Senior Engineer",
              company: "TechCorp",
              dates: "2020-2024",
              description: "Work",
              bullets: [],
            },
          ],
          education: [],
        },
      };

      expect(() => {
        (service as any).validateSourceConsistency(unsupportedSkillResume, careerProfile);
      }).toThrow(/Hallucinated skill|Python/);
    });

    it("should reject resume with invalid education school", () => {
      const invalidEducationResume = {
        analysis: {
          positioning: "Engineer",
          highPriorityKeywords: [],
          strengthsToHighlight: [],
        },
        resume: {
          professionalSummary: "Summary",
          coreSkills: ["TypeScript"],
          experience: [],
          education: [
            {
              school: "Fake University", // ← NOT in career profile
              degree: "BS Computer Science",
              year: "2016",
            },
          ],
        },
      };

      expect(() => {
        (service as any).validateSourceConsistency(invalidEducationResume, careerProfile);
      }).toThrow(/Hallucinated school|Fake University/);
    });

    it("should accept skill that partially matches (case-insensitive)", () => {
      const resume = {
        analysis: {
          positioning: "Engineer",
          highPriorityKeywords: ["typescript"], // lowercase
          strengthsToHighlight: [],
        },
        resume: {
          professionalSummary: "Summary",
          coreSkills: ["typescript"], // lowercase
          experience: [
            {
              title: "Engineer",
              company: "TechCorp",
              dates: "2020-2024",
              description: "Work",
              bullets: [],
            },
          ],
          education: [],
        },
      };

      // Should NOT throw (case-insensitive match)
      expect(() => {
        (service as any).validateSourceConsistency(resume, careerProfile);
      }).not.toThrow();
    });

    it("should accept skill with partial string match (e.g., ReactJS vs React)", () => {
      const resume = {
        analysis: {
          positioning: "Engineer",
          highPriorityKeywords: ["ReactJS"], // Includes "React" from profile
          strengthsToHighlight: [],
        },
        resume: {
          professionalSummary: "Summary",
          coreSkills: ["ReactJS"],
          experience: [
            {
              title: "Engineer",
              company: "TechCorp",
              dates: "2020-2024",
              description: "Work",
              bullets: [],
            },
          ],
          education: [],
        },
      };

      // Should NOT throw (partial match allowed)
      expect(() => {
        (service as any).validateSourceConsistency(resume, careerProfile);
      }).not.toThrow();
    });

    it("should handle resume with missing sections gracefully", () => {
      const minimalResume = {
        analysis: {
          positioning: "Engineer",
          highPriorityKeywords: ["TypeScript"],
          strengthsToHighlight: [],
        },
        resume: {
          professionalSummary: "Summary",
          coreSkills: ["TypeScript"],
          experience: [],
          education: [],
        },
      };

      // Should NOT throw even with empty sections
      expect(() => {
        (service as any).validateSourceConsistency(minimalResume, careerProfile);
      }).not.toThrow();
    });

    it("should reject when company name is close but not exact match", () => {
      const almostValidResume = {
        analysis: {
          positioning: "Engineer",
          highPriorityKeywords: [],
          strengthsToHighlight: [],
        },
        resume: {
          professionalSummary: "Summary",
          coreSkills: ["TypeScript"],
          experience: [
            {
              title: "Engineer",
              company: "TechCorp LLC", // Different from just "TechCorp"
              dates: "2020-2024",
              description: "Work",
              bullets: [],
            },
          ],
          education: [],
        },
      };

      // This should throw because "TechCorp LLC" is not in the career profile
      // (Exact string match is required for companies)
      expect(() => {
        (service as any).validateSourceConsistency(almostValidResume, careerProfile);
      }).toThrow();
    });
  });

  describe("Career Profile Validation", () => {
    it("should reject generation if career profile has no experience", async () => {
      const emptyProfile: CareerModel = {
        fullName: "No Experience",
        sections: {
          summary: "Has no work experience",
          experience: [],
          skills: ["TypeScript"],
          education: [],
        },
        metadata: { hash: "hash-empty", source: "manual" },
      };

      const result = await service.generateResume(jobId, emptyProfile, "Some job", {
        positioning: "Junior Dev",
        strengths: [],
        gaps: [],
        score: 50,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_PROFILE");
    });

    it("should reject generation if career profile is undefined", async () => {
      const result = await service.generateResume(
        jobId,
        null as any,
        "Some job",
        { positioning: "Test", strengths: [], gaps: [], score: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_PROFILE");
    });
  });
});
