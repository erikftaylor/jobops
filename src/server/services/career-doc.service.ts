import fs from "fs";
import crypto from "crypto";
import { getDatabase } from "../db/database.js";

export interface Contact {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
}

export interface Role {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  achievements?: string[];
  technologies?: string[];
}

export interface SkillsInventory {
  designUX?: string[];
  toolsPlatforms?: string[];
  languagesFrameworks?: string[];
  other?: string[];
}

export interface Education {
  school: string;
  degree?: string;
  field?: string;
  graduatedYear?: string;
  gpa?: string;
  coursework?: string[];
}

export interface Certification {
  name: string;
  issuer?: string;
  year?: string;
}

export interface Project {
  name: string;
  description?: string;
  technologies?: string[];
  outcome?: string;
}

export interface ParsedCareerDocument {
  contact: Contact;
  professionalSummary?: string;
  roles: Role[];
  skillsInventory: SkillsInventory;
  education: Education[];
  certifications: Certification[];
  projects: Project[];
  awards?: string[];
  rawSourceText: string;
  isPlaceholder: boolean;
}

class CareerDocService {
  private careerDocPath: string;

  constructor(careerDocPath: string = "./data/Master_Career_Document.md") {
    this.careerDocPath = careerDocPath;
  }

  computeHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  readCareerDocument(): string {
    try {
      return fs.readFileSync(this.careerDocPath, "utf-8");
    } catch (err) {
      console.warn(
        `Career document not found at ${this.careerDocPath}. Using placeholder.`
      );
      return "";
    }
  }

  isPlaceholder(content: string): boolean {
    // Check if the document is mostly the template (contains [Your Name], etc.)
    const placeholderMarkers = [
      "[Your Name]",
      "[Your Email]",
      "[Your Phone]",
      "[Skill 1]",
      "[Company Name]",
      "[University Name]",
    ];
    return placeholderMarkers.some((marker) =>
      content.includes(marker)
    );
  }

  private extractSection(content: string, sectionName: string): string {
    const regex = new RegExp(
      `## ${sectionName}[^]*?(?=## |$)`,
      "i"
    );
    const match = content.match(regex);
    return match ? match[0] : "";
  }

  private parseContact(content: string): Contact {
    const contact: Contact = {};

    const patterns = {
      name: /\*\*Name:\*\*\s*(.+)/,
      email: /\*\*Email:\*\*\s*(.+)/,
      phone: /\*\*Phone:\*\*\s*(.+)/,
      website: /\*\*Website\/Portfolio:\*\*\s*(.+)/,
      linkedin: /\*\*LinkedIn:\*\*\s*(.+)/,
    };

    for (const [key, regex] of Object.entries(patterns)) {
      const match = content.match(regex);
      if (match) {
        const value = match[1].trim();
        if (value && !value.startsWith("[")) {
          contact[key as keyof Contact] = value;
        }
      }
    }

    return contact;
  }

  private parseRoles(content: string): Role[] {
    const roles: Role[] = [];
    const experienceSection = this.extractSection(
      content,
      "Professional Experience"
    );

    const roleBlocks = experienceSection.split(/^### /m).slice(1);

    for (const block of roleBlocks) {
      const lines = block.split("\n");
      if (lines.length < 1) continue;

      const headerLine = lines[0];
      const companyMatch = headerLine.match(/^(.+?)\s*-\s*(.+?)$/);
      const titleMatch = lines
        .find((l) => l.startsWith("**"))
        ?.match(/\*\*(.+?)\*\*\s*\|\s*(.+?)(?:\s*–\s*(.+?))?$/);

      if (companyMatch && titleMatch) {
        const role: Role = {
          company: companyMatch[1].trim(),
          location: companyMatch[2].trim(),
          title: titleMatch[1].trim(),
          startDate: titleMatch[2]?.trim(),
          endDate: titleMatch[3]?.trim(),
          achievements: [],
          technologies: [],
        };

        // Extract description and achievements
        let inAchievements = false;
        for (const line of lines.slice(1)) {
          if (line.includes("Key Achievements:")) {
            inAchievements = true;
          } else if (inAchievements && line.startsWith("- ")) {
            const achievement = line.substring(2).trim();
            if (
              achievement &&
              !achievement.startsWith("[") &&
              achievement.length > 5
            ) {
              role.achievements!.push(achievement);
            }
          } else if (!inAchievements && line.trim() && !line.startsWith("**")) {
            if (!role.description) {
              role.description = line.trim();
            }
          }
        }

        if (role.company && !role.company.startsWith("[")) {
          roles.push(role);
        }
      }
    }

    return roles;
  }

  private parseSkills(content: string): SkillsInventory {
    const inventory: SkillsInventory = {
      designUX: [],
      toolsPlatforms: [],
      languagesFrameworks: [],
      other: [],
    };

    const skillsSection = this.extractSection(content, "Core Skills");
    const lines = skillsSection.split("\n");

    let currentCategory = "";

    for (const line of lines) {
      if (line.includes("### Design & UX")) {
        currentCategory = "designUX";
      } else if (line.includes("### Tools & Platforms")) {
        currentCategory = "toolsPlatforms";
      } else if (line.includes("### Languages & Frameworks")) {
        currentCategory = "languagesFrameworks";
      } else if (line.includes("### Other Skills")) {
        currentCategory = "other";
      } else if (line.startsWith("- ")) {
        const skill = line.substring(2).trim();
        if (
          skill &&
          !skill.startsWith("[") &&
          currentCategory &&
          inventory[currentCategory as keyof SkillsInventory]
        ) {
          inventory[currentCategory as keyof SkillsInventory]!.push(skill);
        }
      }
    }

    return inventory;
  }

  private parseEducation(content: string): Education[] {
    const education: Education[] = [];
    const eduSection = this.extractSection(content, "Education");

    const eduBlocks = eduSection.split(/^### /m).slice(1);

    for (const block of eduBlocks) {
      const lines = block.split("\n");
      if (lines.length < 1) continue;

      const schoolName = lines[0].trim();
      const degreeMatch = lines
        .find((l) => l.startsWith("**"))
        ?.match(/\*\*(.+?)\*\*\s+in\s+(.+?)\s*\|\s*Graduated\s+(.+?)$/);

      if (degreeMatch && schoolName && !schoolName.startsWith("[")) {
        education.push({
          school: schoolName,
          degree: degreeMatch[1].trim(),
          field: degreeMatch[2].trim(),
          graduatedYear: degreeMatch[3].trim(),
        });
      }
    }

    return education;
  }

  private parseCertifications(content: string): Certification[] {
    const certifications: Certification[] = [];
    const certSection = this.extractSection(content, "Certifications");

    const lines = certSection.split("\n");
    for (const line of lines) {
      if (line.startsWith("- ")) {
        const certText = line.substring(2).trim();
        const parts = certText.split("|").map((p) => p.trim());
        if (parts.length >= 1 && !parts[0].startsWith("[")) {
          certifications.push({
            name: parts[0],
            issuer: parts[1],
            year: parts[2],
          });
        }
      }
    }

    return certifications;
  }

  private parseProjects(content: string): Project[] {
    const projects: Project[] = [];
    const projectsSection = this.extractSection(content, "Notable Projects");

    const projectBlocks = projectsSection.split(/^### /m).slice(1);

    for (const block of projectBlocks) {
      const lines = block.split("\n");
      if (lines.length < 1) continue;

      const projectName = lines[0].trim();
      if (projectName && !projectName.startsWith("[")) {
        const project: Project = {
          name: projectName,
          description: lines.find((l) => !l.startsWith("-") && l.trim())?.trim(),
          technologies: [],
        };

        for (const line of lines) {
          if (line.includes("Key Technologies:")) {
            const techs = line
              .split(":")[1]
              ?.split(",")
              .map((t) => t.trim())
              .filter((t) => t && !t.startsWith("["));
            if (techs) {
              project.technologies = techs;
            }
          }
          if (line.includes("Outcome/Impact:")) {
            project.outcome = line.split(":")[1]?.trim();
          }
        }

        projects.push(project);
      }
    }

    return projects;
  }

  parseCareerDocument(
    rawContent?: string
  ): ParsedCareerDocument {
    const content = rawContent || this.readCareerDocument();
    const isPlaceholder = this.isPlaceholder(content);

    return {
      contact: this.parseContact(content),
      professionalSummary: this.extractSection(content, "Professional Summary")
        .split("\n")
        .find((l) => l.trim() && !l.startsWith("#"))
        ?.trim(),
      roles: this.parseRoles(content),
      skillsInventory: this.parseSkills(content),
      education: this.parseEducation(content),
      certifications: this.parseCertifications(content),
      projects: this.parseProjects(content),
      rawSourceText: content,
      isPlaceholder,
    };
  }

  saveCareerDocumentVersion(parsed: ParsedCareerDocument): string {
    const hash = this.computeHash(parsed.rawSourceText);
    const db = getDatabase().getConnection();

    // Check if this hash already exists
    const existing = db.prepare(
      "SELECT content_hash FROM career_doc_versions WHERE content_hash = ?"
    ).get(hash);

    if (existing) {
      // Hash already exists, don't create duplicate
      return hash;
    }

    // Create new version record
    const now = new Date().toISOString();
    const summary = JSON.stringify({
      roles: parsed.roles.length,
      skills: Object.values(parsed.skillsInventory).flat().length,
      education: parsed.education.length,
      certifications: parsed.certifications.length,
      projects: parsed.projects.length,
    });

    db.prepare(
      `INSERT INTO career_doc_versions (content_hash, content, created_at, summary, is_active)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      hash,
      JSON.stringify(parsed),
      now,
      summary,
      1 // Mark as active
    );

    // Deactivate all other versions
    db.prepare(
      `UPDATE career_doc_versions SET is_active = 0 WHERE content_hash != ?`
    ).run(hash);

    return hash;
  }

  getActiveCareerDocument(): ParsedCareerDocument | null {
    const db = getDatabase().getConnection();
    const row = db
      .prepare(
        "SELECT content FROM career_doc_versions WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1"
      )
      .get() as any;

    if (!row) return null;

    return JSON.parse(row.content) as ParsedCareerDocument;
  }

  appendPendingAddition(
    type: "skill" | "experience" | "project" | "achievement",
    content: string
  ): void {
    const pendingPath = "./data/pending_additions.md";

    try {
      let fileContent = fs.readFileSync(pendingPath, "utf-8");
      const now = new Date().toISOString().split("T")[0];
      const sectionMap: Record<string, string> = {
        skill: "## Pending Skills",
        experience: "## Pending Experiences",
        project: "## Pending Projects",
        achievement: "## Pending Achievements",
      };

      const section = sectionMap[type];
      const entry = `\n- ${content} | Confirmed ${now}`;

      // Find the section and append
      const lines = fileContent.split("\n");
      let sectionIndex = lines.findIndex((l) => l === section);

      if (sectionIndex === -1) {
        // Section not found, append at end
        fileContent += `\n\n${section}\n${entry}`;
      } else {
        // Find the next section or end of file
        let nextSectionIndex = lines.length;
        for (
          let i = sectionIndex + 1;
          i < lines.length;
          i++
        ) {
          if (lines[i].startsWith("## ")) {
            nextSectionIndex = i;
            break;
          }
        }

        // Insert before next section
        lines.splice(nextSectionIndex, 0, entry);
        fileContent = lines.join("\n");
      }

      fs.writeFileSync(pendingPath, fileContent, "utf-8");
    } catch (err) {
      console.error("Failed to append to pending additions:", err);
      throw err;
    }
  }
}

export function createCareerDocService(): CareerDocService {
  return new CareerDocService();
}
