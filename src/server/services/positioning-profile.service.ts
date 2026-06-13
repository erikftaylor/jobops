import { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { PositioningProfile } from "../../shared/types.js";

interface CreatePositioningProfileInput {
  name: string;
  description?: string;
  tone: "formal" | "casual" | "balanced";
  emphasis: string[];
  ats_keywords?: string[];
  industry_focus?: string[];
}

export class PositioningProfileService {
  constructor(private db: Database) {}

  /**
   * Create a new positioning profile
   */
  createProfile(input: CreatePositioningProfileInput): PositioningProfile {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO positioning_profiles (
        id, name, description, tone, emphasis, ats_keywords,
        industry_focus, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.name,
      input.description || null,
      input.tone,
      JSON.stringify(input.emphasis),
      input.ats_keywords ? JSON.stringify(input.ats_keywords) : null,
      input.industry_focus ? JSON.stringify(input.industry_focus) : null,
      now
    );

    return {
      id,
      name: input.name,
      description: input.description,
      tone: input.tone,
      emphasis: input.emphasis,
      ats_keywords: input.ats_keywords,
      industry_focus: input.industry_focus,
      created_at: now,
    };
  }

  /**
   * Get a positioning profile by ID
   */
  getProfileById(id: string): PositioningProfile | null {
    const stmt = this.db.prepare(
      "SELECT * FROM positioning_profiles WHERE id = ?"
    );
    const row = stmt.get(id) as any;
    return row ? this.rowToProfile(row) : null;
  }

  /**
   * Get a positioning profile by name
   */
  getProfileByName(name: string): PositioningProfile | null {
    const stmt = this.db.prepare(
      "SELECT * FROM positioning_profiles WHERE name = ?"
    );
    const row = stmt.get(name) as any;
    return row ? this.rowToProfile(row) : null;
  }

  /**
   * List all positioning profiles
   */
  listProfiles(): PositioningProfile[] {
    const stmt = this.db.prepare(
      "SELECT * FROM positioning_profiles ORDER BY created_at DESC"
    );
    const rows = stmt.all() as any[];
    return rows.map((row) => this.rowToProfile(row));
  }

  /**
   * Update an existing positioning profile
   */
  updateProfile(
    id: string,
    input: Partial<CreatePositioningProfileInput>
  ): PositioningProfile | null {
    const existing = this.getProfileById(id);
    if (!existing) {
      return null;
    }

    const updates: any = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.tone !== undefined) updates.tone = input.tone;
    if (input.emphasis !== undefined) updates.emphasis = JSON.stringify(input.emphasis);
    if (input.ats_keywords !== undefined)
      updates.ats_keywords = input.ats_keywords ? JSON.stringify(input.ats_keywords) : null;
    if (input.industry_focus !== undefined)
      updates.industry_focus = input.industry_focus ? JSON.stringify(input.industry_focus) : null;

    const setClauses = Object.keys(updates).map((key) => `${key} = ?`);
    const values = Object.values(updates);

    const stmt = this.db.prepare(`
      UPDATE positioning_profiles
      SET ${setClauses.join(", ")}
      WHERE id = ?
    `);

    stmt.run(...values, id);
    return this.getProfileById(id);
  }

  /**
   * Delete a positioning profile
   */
  deleteProfile(id: string): boolean {
    const stmt = this.db.prepare("DELETE FROM positioning_profiles WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Ensure default positioning profiles exist
   */
  ensureDefaultProfiles(): void {
    const defaults: CreatePositioningProfileInput[] = [
      {
        name: "Executive",
        description: "High-level leadership position focused on strategy and vision",
        tone: "formal",
        emphasis: ["strategic_thinking", "leadership", "business_impact"],
        ats_keywords: ["executive", "leadership", "strategy", "vision", "director"],
        industry_focus: ["technology", "finance", "consulting"],
      },
      {
        name: "Senior IC",
        description: "Senior individual contributor role emphasizing technical depth",
        tone: "balanced",
        emphasis: ["technical_excellence", "architecture", "mentorship"],
        ats_keywords: ["senior", "engineer", "architect", "technical", "expert"],
        industry_focus: ["technology", "software"],
      },
      {
        name: "Leadership",
        description: "Team leadership and people management focus",
        tone: "balanced",
        emphasis: ["team_leadership", "people_development", "execution"],
        ats_keywords: ["lead", "manager", "people", "team", "leadership"],
        industry_focus: ["technology", "operations", "product"],
      },
      {
        name: "Startup",
        description: "Fast-paced startup environment with growth and impact focus",
        tone: "casual",
        emphasis: ["growth_mindset", "execution", "innovation", "flexibility"],
        ats_keywords: ["startup", "growth", "impact", "fast-paced", "innovative"],
        industry_focus: ["technology", "startups"],
      },
    ];

    for (const defaultProfile of defaults) {
      const existing = this.getProfileByName(defaultProfile.name);
      if (!existing) {
        this.createProfile(defaultProfile);
      }
    }
  }

  /**
   * Private: Convert database row to PositioningProfile
   */
  private rowToProfile(row: any): PositioningProfile {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      tone: row.tone,
      emphasis: row.emphasis ? JSON.parse(row.emphasis) : [],
      ats_keywords: row.ats_keywords ? JSON.parse(row.ats_keywords) : undefined,
      industry_focus: row.industry_focus ? JSON.parse(row.industry_focus) : undefined,
      created_at: row.created_at,
    };
  }
}

/**
 * Factory function to create a PositioningProfileService instance
 */
export function createPositioningProfileService(
  db: Database
): PositioningProfileService {
  return new PositioningProfileService(db);
}
