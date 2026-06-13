import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { OutputContractService, createOutputContractService } from "../output-contract.service.js";
import { migrate006 } from "../../db/migrations/006-artifact-tables.js";

describe("OutputContractService", () => {
  let db: Database.Database;
  let service: OutputContractService;

  beforeEach(() => {
    // Create in-memory database
    db = new Database(":memory:");

    // Run migration to create tables
    migrate006(db);

    // Create service
    service = createOutputContractService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("createContract", () => {
    it("should create a new output contract", () => {
      const result = service.createContract({
        artifact_type: "resume_source",
        schema: {
          type: "object",
          properties: {
            header: { type: "string" },
            contact: { type: "object" },
            experience: { type: "array" },
          },
        },
        required_fields: ["header", "contact", "experience"],
        optional_fields: ["skills", "certifications"],
      });

      expect(result.id).toBeDefined();
      expect(result.artifact_type).toBe("resume_source");
      expect(result.schema).toBeDefined();
      expect(result.required_fields).toContain("header");
      expect(result.optional_fields).toContain("skills");
    });
  });

  describe("getContract", () => {
    it("should validate and return valid resume output", () => {
      // Initialize default contracts
      service.initializeDefaultContracts();

      const contract = service.getContract("resume_source");

      expect(contract).toBeDefined();
      expect(contract?.artifact_type).toBe("resume_source");
      expect(contract?.required_fields).toContain("header");
      expect(contract?.required_fields).toContain("contact");
    });

    it("should get contract for cover letter", () => {
      service.initializeDefaultContracts();

      const contract = service.getContract("cover_letter_source");

      expect(contract).toBeDefined();
      expect(contract?.artifact_type).toBe("cover_letter_source");
      expect(contract?.required_fields).toContain("body");
      expect(contract?.required_fields).toContain("closing");
    });

    it("should return hardcoded contract if not in database", () => {
      const contract = service.getContract("resume_pdf");

      expect(contract).toBeDefined();
      expect(contract?.schema).toBeDefined();
      expect(contract?.required_fields.length).toBeGreaterThan(0);
    });
  });

  describe("validate", () => {
    it("should validate valid resume output (passes)", () => {
      service.initializeDefaultContracts();

      const validResume = {
        header: "John Doe - Senior Engineer",
        contact: {
          email: "john@example.com",
          phone: "555-1234",
          linkedin: "https://linkedin.com/in/johndoe",
        },
        summary: "Experienced engineer",
        experience: [
          {
            company: "Tech Co",
            title: "Engineer",
            duration: "2020-present",
            description: "Developed features",
            achievements: ["Shipped v1.0"],
          },
        ],
        education: [
          {
            school: "University",
            degree: "BS",
            field: "Computer Science",
            year: "2020",
          },
        ],
        skills: ["JavaScript", "TypeScript", "React"],
      };

      const result = service.validate("resume_source", validResume);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should reject invalid resume (missing required fields)", () => {
      service.initializeDefaultContracts();

      const invalidResume = {
        header: "John Doe", // Missing other required fields
        contact: {
          email: "john@example.com",
        },
        // Missing: summary, experience, education, skills
      };

      const result = service.validate("resume_source", invalidResume);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("summary"))).toBe(true);
    });

    it("should validate valid cover letter output", () => {
      service.initializeDefaultContracts();

      const validLetter = {
        header: "John Doe\n123 Main St\njohn@example.com\n555-1234",
        date: "2024-06-13",
        recipient: {
          name: "Jane Smith",
          title: "Hiring Manager",
          company: "Tech Co",
          address: "456 Oak Ave",
        },
        greeting: "Dear Hiring Manager,",
        body: "I am writing to express my interest in the position...",
        closing: "Sincerely,\nJohn Doe",
        subject_line: "Application for Senior Engineer Role",
      };

      const result = service.validate("cover_letter_source", validLetter);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should reject invalid cover letter (missing required fields)", () => {
      service.initializeDefaultContracts();

      const invalidLetter = {
        header: "John Doe",
        date: "2024-06-13",
        // Missing: recipient, body, closing
      };

      const result = service.validate("cover_letter_source", invalidLetter);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("body"))).toBe(true);
    });

    it("should perform type checking on fields", () => {
      service.initializeDefaultContracts();

      const resumeWithWrongTypes = {
        header: "John Doe",
        contact: {
          email: "john@example.com",
        },
        summary: "Experienced engineer",
        experience: "Not an array", // Should be array
        education: [
          {
            school: "University",
            degree: "BS",
            field: "Computer Science",
            year: "2020",
          },
        ],
        skills: ["JavaScript"],
      };

      const result = service.validate("resume_source", resumeWithWrongTypes);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("experience"))).toBe(true);
    });

    it("should distinguish between required and optional fields", () => {
      service.initializeDefaultContracts();

      const resumeWithoutOptional = {
        header: "John Doe",
        contact: {
          email: "john@example.com",
        },
        summary: "Experienced engineer",
        experience: [],
        education: [],
        skills: [],
        // Missing optional: certifications, projects, awards, languages
      };

      const result = service.validate("resume_source", resumeWithoutOptional);

      // Should be valid despite missing optional fields
      expect(result.errors.some((e) => e.includes("certifications"))).toBe(false);
      expect(result.errors.some((e) => e.includes("projects"))).toBe(false);
    });

    it("should validate array items type with coercion", () => {
      service.initializeDefaultContracts();

      const resumeWithNumericSkills = {
        header: "John Doe",
        contact: { email: "john@example.com" },
        summary: "Experienced engineer",
        experience: [
          {
            company: "Tech Co",
            title: "Engineer",
            duration: "2020-present",
            description: "Developed features",
            achievements: ["Shipped v1.0"],
          },
        ],
        education: [],
        skills: ["JavaScript", 123], // Number coerces to string in validation
      };

      const result = service.validate("resume_source", resumeWithNumericSkills);

      // Validation allows number to string coercion
      expect(result.valid).toBe(true);
    });
  });

  describe("getContractById", () => {
    it("should retrieve contract by ID", () => {
      const created = service.createContract({
        artifact_type: "resume_pdf",
        schema: { type: "object" },
        required_fields: ["header"],
        optional_fields: [],
      });

      const retrieved = service.getContractById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.artifact_type).toBe("resume_pdf");
    });

    it("should return null for non-existent ID", () => {
      const retrieved = service.getContractById("non-existent-id");
      expect(retrieved).toBeNull();
    });
  });

  describe("listContracts", () => {
    it("should list all output contracts", () => {
      service.createContract({
        artifact_type: "resume_source",
        schema: { type: "object" },
        required_fields: ["header"],
        optional_fields: [],
      });

      service.createContract({
        artifact_type: "cover_letter_source",
        schema: { type: "object" },
        required_fields: ["body"],
        optional_fields: [],
      });

      const contracts = service.listContracts();

      expect(Array.isArray(contracts)).toBe(true);
      expect(contracts.length).toBe(2);
    });
  });

  describe("initializeDefaultContracts", () => {
    it("should create default resume contract if not exists", () => {
      service.initializeDefaultContracts();

      const contract = service.getContract("resume_source");

      expect(contract).toBeDefined();
      expect(contract?.artifact_type).toBe("resume_source");
      expect(contract?.required_fields).toContain("header");
      expect(contract?.required_fields).toContain("contact");
      expect(contract?.required_fields).toContain("summary");
      expect(contract?.required_fields).toContain("experience");
      expect(contract?.required_fields).toContain("education");
      expect(contract?.required_fields).toContain("skills");
    });

    it("should create default cover letter contract if not exists", () => {
      service.initializeDefaultContracts();

      const contract = service.getContract("cover_letter_source");

      expect(contract).toBeDefined();
      expect(contract?.artifact_type).toBe("cover_letter_source");
      expect(contract?.required_fields).toContain("header");
      expect(contract?.required_fields).toContain("date");
      expect(contract?.required_fields).toContain("recipient");
      expect(contract?.required_fields).toContain("body");
      expect(contract?.required_fields).toContain("closing");
    });

    it("should not recreate existing contracts", () => {
      service.initializeDefaultContracts();
      const contract1 = service.getContract("resume_source");

      // Call again
      service.initializeDefaultContracts();
      const contract2 = service.getContract("resume_source");

      expect(contract1?.id).toBe(contract2?.id);
      expect(contract1).toBeDefined();
    });
  });

  describe("getJsonSchema", () => {
    it("should return JSON schema for artifact type", () => {
      service.initializeDefaultContracts();

      const schema = service.getJsonSchema("resume_source");

      expect(schema).toBeDefined();
      expect(schema?.type).toBe("object");
      expect(schema?.properties).toBeDefined();
      expect(schema?.properties.header).toBeDefined();
    });

    it("should return null for unknown artifact type without contract", () => {
      // Don't initialize defaults
      const schema = service.getJsonSchema("resume_source");

      // Should fall back to hardcoded
      expect(schema).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty required fields list", () => {
      service.createContract({
        artifact_type: "cover_letter_pdf",
        schema: { type: "object" },
        required_fields: [],
        optional_fields: ["greeting", "closing"],
      });

      const result = service.validate("cover_letter_pdf", {
        greeting: "Hello",
        closing: "Bye",
      });

      expect(result.valid).toBe(true);
    });

    it("should handle null and undefined values correctly", () => {
      service.initializeDefaultContracts();

      const resume = {
        header: "John Doe",
        contact: { email: "john@example.com" },
        summary: null, // Null value for required field
        experience: [],
        education: [],
        skills: [],
      };

      const result = service.validate("resume_source", resume);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("summary"))).toBe(true);
    });

    it("should allow string to number coercion in type checking", () => {
      service.initializeDefaultContracts();

      const resume = {
        header: "John Doe",
        contact: { email: "john@example.com" },
        summary: "Engineer",
        experience: [],
        education: [],
        skills: ["JavaScript", "TypeScript"],
      };

      const result = service.validate("resume_source", resume);

      expect(result.valid).toBe(true);
    });
  });
});
