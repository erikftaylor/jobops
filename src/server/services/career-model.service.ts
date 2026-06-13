import { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { CareerModel } from "../../shared/types.js";
import { ChangeGraphService } from "./change-graph.service.js";
import { createCareerDocService, ParsedCareerDocument } from "./career-doc.service.js";

interface ResolveCareerModelInput {
  jobId: string;
  positioningId?: string;
  includeTag?: string;
}

interface CareerModelMetadata {
  totalExperienceYears: number;
  topSkills: string[];
  skillsCount: number;
  rolesCount: number;
  educationCount: number;
  basedOnPositioning?: string;
}

export class CareerModelService {
  private careerDocService: ReturnType<typeof createCareerDocService>;
  private modelCache: Map<string, CareerModel> = new Map();

  constructor(private db: Database, _changeGraphService: ChangeGraphService) {
    this.careerDocService = createCareerDocService();
  }

  /**
   * Resolve a career model by loading master document, accepting changes, and applying positioning
   */
  async resolveCareerModel(
    input: ResolveCareerModelInput
  ): Promise<CareerModel> {
    // Load master career document
    const masterContent = this.careerDocService.readCareerDocument();
    const parsed = this.careerDocService.parseCareerDocument(masterContent);

    // Deep copy to avoid mutations
    const resolvedDoc = this.deepCopyParsedCareerDocument(parsed);

    // Get and apply accepted changes from the conversation
    const acceptedChanges = this.getAcceptedChangesForJob(input.jobId);

    for (const change of acceptedChanges) {
      this.applyChange(resolvedDoc, change);
    }

    // Load and apply positioning profile if provided
    let positioningProfile: any = null;
    if (input.positioningId) {
      positioningProfile = this.getPositioningProfile(input.positioningId);
    }

    // Compute metadata
    const metadata: CareerModelMetadata = {
      totalExperienceYears: this.computeTotalExperience(resolvedDoc),
      topSkills: this.extractTopSkills(resolvedDoc, input.includeTag),
      skillsCount: this.countAllSkills(resolvedDoc),
      rolesCount: resolvedDoc.roles.length,
      educationCount: resolvedDoc.education.length,
      ...(positioningProfile && {
        basedOnPositioning: input.positioningId,
      }),
    };

    // Hash the content for caching
    const contentString = JSON.stringify(resolvedDoc);
    const hash = this.hashContent(contentString);

    // Check cache
    const cached = this.getCachedModel(hash);
    if (cached) {
      return cached;
    }

    // Create new career model record
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO career_models (id, hash, created_at, based_on, content, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        id,
        hash,
        now,
        "master",
        contentString,
        JSON.stringify(metadata)
      );
    } catch (err: any) {
      // Hash collision - model already exists
      if (err.message.includes("UNIQUE constraint failed")) {
        const existing = this.getCachedModel(hash);
        if (existing) {
          return existing;
        }
      }
      throw err;
    }

    const careerModel: CareerModel = {
      id,
      hash,
      created_at: now,
      based_on: "master",
      content: contentString,
      metadata,
    };

    // Cache in memory
    this.modelCache.set(hash, careerModel);

    return careerModel;
  }

  /**
   * Get a cached model by hash
   */
  getCachedModel(hash: string): CareerModel | null {
    // Check memory cache first
    if (this.modelCache.has(hash)) {
      return this.modelCache.get(hash) || null;
    }

    // Check database
    const stmt = this.db.prepare("SELECT * FROM career_models WHERE hash = ?");
    const row = stmt.get(hash) as any;

    if (!row) {
      return null;
    }

    const model = this.rowToCareerModel(row);
    // Cache in memory
    this.modelCache.set(hash, model);
    return model;
  }

  /**
   * Get model by ID
   */
  getModelById(id: string): CareerModel | null {
    const stmt = this.db.prepare("SELECT * FROM career_models WHERE id = ?");
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    const model = this.rowToCareerModel(row);
    this.modelCache.set(model.hash, model);
    return model;
  }

  /**
   * List all career models
   */
  listModels(limit: number = 100): CareerModel[] {
    const stmt = this.db.prepare(`
      SELECT * FROM career_models
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map((row) => {
      const model = this.rowToCareerModel(row);
      this.modelCache.set(model.hash, model);
      return model;
    });
  }

  /**
   * Clear old cached models (older than specified days)
   */
  clearOldModels(olderThanDays: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const stmt = this.db.prepare(`
      DELETE FROM career_models
      WHERE created_at < ?
    `);

    const result = stmt.run(cutoffDate.toISOString());
    this.modelCache.clear();
    return result.changes;
  }

  /**
   * Private: Get accepted changes for a job
   */
  private getAcceptedChangesForJob(jobId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT cg.* FROM change_graph cg
      JOIN conversations c ON cg.conversation_id = c.id
      WHERE c.job_id = ? AND cg.accepted_at IS NOT NULL
      ORDER BY cg.created_at ASC
    `);
    return stmt.all(jobId) as any[];
  }

  /**
   * Private: Apply a change to the resolved career document
   */
  private applyChange(doc: ParsedCareerDocument, change: any): void {
    const field = change.field;
    const operation = change.operation;

    if (operation === "modify" && change.new_value) {
      // Handle modifications at specific paths
      this.setValueAtPath(doc, field, change.new_value);
    } else if (operation === "add" && change.new_value) {
      // Add to array fields
      const section = field.split(".")[0];

      if (section === "roles") {
        // Parse new role from new_value
        const roleData = JSON.parse(change.new_value);
        doc.roles.push(roleData);
      } else if (section === "skills") {
        // Parse and add skill
        const skillData = JSON.parse(change.new_value);
        if (!doc.skillsInventory[skillData.category as keyof typeof doc.skillsInventory]) {
          doc.skillsInventory[
            skillData.category as keyof typeof doc.skillsInventory
          ] = [];
        }
        doc.skillsInventory[
          skillData.category as keyof typeof doc.skillsInventory
        ]?.push(skillData.name);
      } else if (section === "education") {
        const eduData = JSON.parse(change.new_value);
        doc.education.push(eduData);
      } else if (section === "certifications") {
        const certData = JSON.parse(change.new_value);
        doc.certifications.push(certData);
      } else if (section === "projects") {
        const projData = JSON.parse(change.new_value);
        doc.projects.push(projData);
      }
    } else if (operation === "remove") {
      // Handle removal by ID
      const [section, id] = field.split(".");
      if (section === "roles" && id) {
        doc.roles = doc.roles.filter((r) => r.company !== id);
      } else if (section === "education" && id) {
        doc.education = doc.education.filter((e) => e.school !== id);
      } else if (section === "projects" && id) {
        doc.projects = doc.projects.filter((p) => p.name !== id);
      }
    }
  }

  /**
   * Private: Set a value at a path in the document
   */
  private setValueAtPath(doc: any, path: string, value: any): void {
    const parts = path.split(".");
    let current = doc;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Private: Compute total years of experience
   */
  private computeTotalExperience(doc: ParsedCareerDocument): number {
    let totalMonths = 0;

    for (const role of doc.roles) {
      if (role.startDate && role.endDate) {
        const start = new Date(role.startDate);
        const end = new Date(role.endDate);
        const months =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());
        totalMonths += months;
      } else if (role.startDate) {
        // Current role - calculate from start to now
        const start = new Date(role.startDate);
        const now = new Date();
        const months =
          (now.getFullYear() - start.getFullYear()) * 12 +
          (now.getMonth() - start.getMonth());
        totalMonths += months;
      }
    }

    return Math.floor(totalMonths / 12);
  }

  /**
   * Private: Extract top skills
   */
  private extractTopSkills(
    doc: ParsedCareerDocument,
    _includeTag?: string
  ): string[] {
    const skillFrequency = new Map<string, number>();

    // Count skill frequency across roles
    for (const role of doc.roles) {
      if (role.technologies) {
        for (const tech of role.technologies) {
          skillFrequency.set(tech, (skillFrequency.get(tech) || 0) + 2);
        }
      }
    }

    // Add skills from inventory with weight by category
    const categoryWeights: Record<string, number> = {
      designUX: 3,
      languagesFrameworks: 2,
      toolsPlatforms: 2,
      other: 1,
    };

    for (const [category, categorySkills] of Object.entries(
      doc.skillsInventory
    )) {
      const weight = categoryWeights[category] || 1;
      for (const skill of categorySkills || []) {
        skillFrequency.set(skill, (skillFrequency.get(skill) || 0) + weight);
      }
    }

    // Convert to sorted array
    const sorted = Array.from(skillFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 20);

    return sorted;
  }

  /**
   * Private: Count total skills
   */
  private countAllSkills(doc: ParsedCareerDocument): number {
    let count = 0;
    for (const skills of Object.values(doc.skillsInventory)) {
      count += skills?.length || 0;
    }
    return count;
  }

  /**
   * Private: Hash content for deduplication
   */
  private hashContent(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  /**
   * Private: Get positioning profile
   */
  private getPositioningProfile(id: string): any {
    const stmt = this.db.prepare("SELECT * FROM positioning_profiles WHERE id = ?");
    return stmt.get(id);
  }

  /**
   * Private: Deep copy a parsed career document
   */
  private deepCopyParsedCareerDocument(
    doc: ParsedCareerDocument
  ): ParsedCareerDocument {
    return JSON.parse(JSON.stringify(doc));
  }

  /**
   * Private: Convert database row to CareerModel
   */
  private rowToCareerModel(row: any): CareerModel {
    return {
      id: row.id,
      hash: row.hash,
      created_at: row.created_at,
      based_on: row.based_on,
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}

/**
 * Factory function to create a CareerModelService instance
 */
export function createCareerModelService(
  db: Database,
  changeGraphService: ChangeGraphService
): CareerModelService {
  return new CareerModelService(db, changeGraphService);
}
