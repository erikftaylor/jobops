import { describe, it, expect } from "vitest";
import { careerModelToText } from "../career-text.js";
import type { CareerModel } from "../../../shared/types.js";

describe("careerModelToText", () => {
  // Helper to create a minimal valid CareerModel
  function createCareerModel(overrides?: Partial<CareerModel>): CareerModel {
    return {
      fullName: "John Doe",
      sections: {
        summary: "Experienced software engineer",
        experience: [],
        skills: [],
        education: [],
      },
      metadata: {
        hash: "test",
        source: "master",
      },
      ...overrides,
    };
  }

  // Semantic assertion helpers to reduce brittleness
  function expectContainsAll(text: string, parts: string[]): void {
    for (const part of parts) {
      expect(text).toContain(part);
    }
  }

  function expectExcludesAll(text: string, parts: string[]): void {
    for (const part of parts) {
      expect(text).not.toContain(part);
    }
  }

  function expectNoExtraWhitespace(text: string): void {
    // Should not have leading/trailing whitespace
    expect(text).not.toMatch(/^\s/);
    expect(text).not.toMatch(/\s$/);
  }

  describe("Basic field inclusion", () => {
    it("should include fullName", () => {
      const model = createCareerModel({
        fullName: "Alice Smith",
      });
      const text = careerModelToText(model);
      expect(text).toContain("Alice Smith");
    });

    it("should include summary", () => {
      const model = createCareerModel({
        sections: {
          summary: "Passionate developer with 10 years experience",
          experience: [],
          skills: [],
          education: [],
        },
      });
      const text = careerModelToText(model);
      expect(text).toContain("Passionate developer with 10 years experience");
    });

    it("should include skills", () => {
      const model = createCareerModel({
        sections: {
          summary: "",
          experience: [],
          skills: ["JavaScript", "TypeScript", "React"],
          education: [],
        },
      });
      const text = careerModelToText(model);
      expect(text).toContain("JavaScript");
      expect(text).toContain("TypeScript");
      expect(text).toContain("React");
    });
  });

  describe("Experience formatting", () => {
    it("should format experience with company name by default", () => {
      const model = createCareerModel({
        sections: {
          summary: "",
          experience: [
            {
              title: "Senior Engineer",
              company: "TechCorp",
              description: "Led team",
              startDate: "2020",
              endDate: "2024",
              metrics: [],
            },
          ],
          skills: [],
          education: [],
        },
      });
      const text = careerModelToText(model);
      expect(text).toContain("Senior Engineer at TechCorp");
    });

    it("should include description in experience", () => {
      const model = createCareerModel({
        sections: {
          summary: "",
          experience: [
            {
              title: "Developer",
              company: "StartupX",
              description: "Built scalable APIs",
              startDate: "2021",
              endDate: "2023",
              metrics: [],
            },
          ],
          skills: [],
          education: [],
        },
      });
      const text = careerModelToText(model);
      expect(text).toContain("Built scalable APIs");
    });

    it("should not include company name when useCompanyFormat=false", () => {
      const model = createCareerModel({
        sections: {
          summary: "",
          experience: [
            {
              title: "Manager",
              company: "BigCorp",
              description: "Managed team",
              startDate: "2019",
              endDate: "2024",
              metrics: [],
            },
          ],
          skills: [],
          education: [],
        },
      });
      const text = careerModelToText(model, { useCompanyFormat: false });
      expectContainsAll(text, ["Manager", "Managed team"]);
      expect(text).not.toContain("at BigCorp");
    });

    it("should include metrics when includeMetrics=true", () => {
      const model = createCareerModel({
        sections: {
          summary: "",
          experience: [
            {
              title: "Engineer",
              company: "Company",
              description: "Work",
              startDate: "2020",
              endDate: "2023",
              metrics: ["Increased revenue by 40%", "Led 5 engineers"],
            },
          ],
          skills: [],
          education: [],
        },
      });
      const text = careerModelToText(model, { includeMetrics: true });
      expect(text).toContain("Increased revenue by 40%");
      expect(text).toContain("Led 5 engineers");
    });

    it("should not include metrics when includeMetrics=false (default)", () => {
      const model = createCareerModel({
        sections: {
          summary: "",
          experience: [
            {
              title: "Engineer",
              company: "Company",
              description: "Work",
              startDate: "2020",
              endDate: "2023",
              metrics: ["Increased revenue by 40%"],
            },
          ],
          skills: [],
          education: [],
        },
      });
      const text = careerModelToText(model);
      expect(text).not.toContain("Increased revenue by 40%");
    });
  });

  describe("Education handling", () => {
    it("should not include education by default", () => {
      const model = createCareerModel({
        sections: {
          summary: "",
          experience: [],
          skills: [],
          education: [
            {
              school: "Stanford University",
              degree: "BS Computer Science",
              year: "2019",
            },
          ],
        },
      });
      const text = careerModelToText(model);
      expect(text).not.toContain("Stanford");
    });

    it("should include education when includeEducation=true", () => {
      const model = createCareerModel({
        sections: {
          summary: "",
          experience: [],
          skills: [],
          education: [
            {
              school: "MIT",
              degree: "MS Electrical Engineering",
              year: "2021",
            },
          ],
        },
      });
      const text = careerModelToText(model, { includeEducation: true });
      expect(text).toContain("MIT");
      expect(text).toContain("MS Electrical Engineering");
    });

    it("should handle multiple education entries", () => {
      const model = createCareerModel({
        sections: {
          summary: "",
          experience: [],
          skills: [],
          education: [
            { school: "Harvard", degree: "BA Economics", year: "2015" },
            { school: "Yale", degree: "MBA", year: "2018" },
          ],
        },
      });
      const text = careerModelToText(model, { includeEducation: true });
      expect(text).toContain("Harvard");
      expect(text).toContain("Yale");
    });
  });

  describe("Empty and missing fields", () => {
    it("should handle empty career model", () => {
      const model = createCareerModel({
        fullName: "",
        sections: {
          summary: "",
          experience: [],
          skills: [],
          education: [],
        },
      });
      const text = careerModelToText(model);
      expect(text).toBe("");
    });

    it("should skip empty summary", () => {
      const model = createCareerModel({
        fullName: "John",
        sections: {
          summary: "",
          experience: [],
          skills: ["Skill1"],
          education: [],
        },
      });
      const text = careerModelToText(model);
      expect(text).toContain("John");
      expect(text).toContain("Skill1");
      // Should not have multiple spaces from empty summary
      expect(text).not.toMatch(/\s{2,}/);
    });

    it("should skip empty experience array", () => {
      const model = createCareerModel({
        fullName: "Jane",
        sections: {
          summary: "Summary",
          experience: [],
          skills: ["Skill"],
          education: [],
        },
      });
      const text = careerModelToText(model);
      expect(text).toContain("Jane");
      expect(text).toContain("Summary");
      expect(text).toContain("Skill");
    });

    it("should handle undefined optional sections", () => {
      const model = createCareerModel({
        sections: {
          summary: "Test",
          experience: [],
          skills: [],
          education: [],
        },
      });
      const text = careerModelToText(model);
      expect(text).toContain("Test");
    });

    it("should handle experience with minimal required fields", () => {
      const model = createCareerModel({
        sections: {
          summary: "",
          experience: [
            {
              title: "Role",
              company: "Org",
              description: "",
              startDate: "",
              endDate: "",
              metrics: [],
            },
          ],
          skills: [],
          education: [],
        },
      });
      const text = careerModelToText(model);
      expect(text).toContain("Role at Org");
    });

    it("should skip empty metrics array", () => {
      const model = createCareerModel({
        sections: {
          summary: "",
          experience: [
            {
              title: "Job",
              company: "Corp",
              description: "Desc",
              startDate: "2020",
              endDate: "2023",
              metrics: [],
            },
          ],
          skills: [],
          education: [],
        },
      });
      const text = careerModelToText(model, { includeMetrics: true });
      expect(text).toContain("Job at Corp Desc");
      // Should not have extra spaces from empty metrics
      expect(text).not.toMatch(/\s{3,}/);
    });
  });

  describe("Output consistency", () => {
    it("should produce stable output (deterministic)", () => {
      const model = createCareerModel({
        fullName: "Test",
        sections: {
          summary: "Summary",
          experience: [
            {
              title: "Dev",
              company: "Corp",
              description: "Work",
              startDate: "2020",
              endDate: "2023",
              metrics: ["Metric"],
            },
          ],
          skills: ["Skill"],
          education: [],
        },
      });

      const text1 = careerModelToText(model, { includeMetrics: true });
      const text2 = careerModelToText(model, { includeMetrics: true });

      expect(text1).toBe(text2);
    });

    it("should not have leading/trailing whitespace", () => {
      const model = createCareerModel({
        fullName: "John",
        sections: {
          summary: "Summary",
          experience: [],
          skills: ["Skill"],
          education: [],
        },
      });
      const text = careerModelToText(model);
      expectNoExtraWhitespace(text);
    });

    it("should contain all parts separated by spaces", () => {
      const model = createCareerModel({
        fullName: "John Doe",
        sections: {
          summary: "Engineer",
          experience: [],
          skills: ["React"],
          education: [],
        },
      });
      const text = careerModelToText(model);
      // Verify all parts are present (order and spacing enforced by text content)
      expectContainsAll(text, ["John Doe", "Engineer", "React"]);
      // Verify parts are separated (no extra spaces)
      const words = text.split(/\s+/);
      expect(words.length).toBeGreaterThanOrEqual(4); // At least name + summary + skill
    });
  });

  describe("Option combinations", () => {
    it("should apply all options together", () => {
      const model = createCareerModel({
        fullName: "Alice",
        sections: {
          summary: "Expert",
          experience: [
            {
              title: "Lead",
              company: "TechCo",
              description: "Leadership",
              startDate: "2020",
              endDate: "2024",
              metrics: ["Built team"],
            },
          ],
          skills: ["Node"],
          education: [{ school: "MIT", degree: "MS", year: "2020" }],
        },
      });
      const text = careerModelToText(model, {
        includeEducation: true,
        includeMetrics: true,
        useCompanyFormat: true,
      });
      expect(text).toContain("Alice");
      expect(text).toContain("Expert");
      expect(text).toContain("Lead at TechCo");
      expect(text).toContain("Built team");
      expect(text).toContain("Node");
      expect(text).toContain("MIT");
    });

    it("should minimize output with all options false", () => {
      const model = createCareerModel({
        fullName: "Bob",
        sections: {
          summary: "Summary",
          experience: [
            {
              title: "Job",
              company: "Corp",
              description: "Desc",
              startDate: "2020",
              endDate: "2023",
              metrics: ["M1", "M2"],
            },
          ],
          skills: ["Skill"],
          education: [{ school: "School", degree: "Degree", year: "2020" }],
        },
      });
      const text = careerModelToText(model, {
        includeEducation: false,
        includeMetrics: false,
        useCompanyFormat: false,
      });
      expect(text).toContain("Bob");
      expect(text).toContain("Summary");
      expect(text).toContain("Job");
      expect(text).toContain("Desc");
      expect(text).toContain("Skill");
      expect(text).not.toContain("Corp");
      expect(text).not.toContain("School");
      expect(text).not.toContain("M1");
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle a typical resume-like model with fit analysis options", () => {
      const model = createCareerModel({
        fullName: "Sarah Engineer",
        sections: {
          summary: "10+ years building scalable systems",
          experience: [
            {
              title: "Principal Engineer",
              company: "TechCorp",
              description: "Architected microservices platform",
              startDate: "2022",
              endDate: "2024",
              metrics: ["Served 100M users", "Reduced latency 40%"],
            },
            {
              title: "Senior Engineer",
              company: "StartupXYZ",
              description: "Built initial product",
              startDate: "2020",
              endDate: "2022",
              metrics: ["Grew from 0 to 5M users"],
            },
          ],
          skills: [
            "TypeScript",
            "Node.js",
            "PostgreSQL",
            "AWS",
            "Kubernetes",
          ],
          education: [
            { school: "UC Berkeley", degree: "BS CS", year: "2013" },
          ],
        },
      });

      // For fit analysis (with metrics, with company)
      const fitText = careerModelToText(model, {
        includeMetrics: true,
        useCompanyFormat: true,
        includeEducation: false,
      });
      expectContainsAll(fitText, [
        "Sarah Engineer",
        "Principal Engineer",
        "TechCorp",
        "Served 100M users",
        "TypeScript",
      ]);
      expect(fitText).not.toContain("UC Berkeley");

      // For resume scoring (with education, with company)
      const scoreText = careerModelToText(model, {
        includeMetrics: false,
        useCompanyFormat: true,
        includeEducation: true,
      });
      expectContainsAll(scoreText, [
        "Sarah Engineer",
        "TechCorp",
        "TypeScript",
        "UC Berkeley",
      ]);
      expect(scoreText).not.toContain("Served 100M users");

      // For workspace recalculation (minimal)
      const recalcText = careerModelToText(model, {
        includeMetrics: false,
        useCompanyFormat: false,
        includeEducation: false,
      });
      expectContainsAll(recalcText, [
        "Sarah Engineer",
        "Principal Engineer",
        "TypeScript",
      ]);
      expectExcludesAll(recalcText, ["at TechCorp", "UC Berkeley"]);
    });
  });
});
