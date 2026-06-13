import { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { ArtifactTemplate } from "../../shared/types.js";

interface LoadTemplateInput {
  name: string;
  type: "resume" | "cover_letter";
  variant?: string;
  filePath: string;
  schema?: Record<string, any>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class TemplateService {
  private templateCache: Map<string, ArtifactTemplate> = new Map();

  constructor(private db: Database) {}

  /**
   * Load a template from disk and cache it in the database
   */
  loadTemplate(input: LoadTemplateInput): ArtifactTemplate {
    try {
      // Check if already exists in database
      const existing = this.getTemplateByNameAndVariant(input.name, input.variant);
      if (existing) {
        return existing;
      }

      // Read template from disk
      const templatePath = path.resolve(input.filePath);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
      }

      const content = fs.readFileSync(templatePath, "utf-8");

      // Create template record
      const id = uuidv4();
      const now = new Date().toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO artifact_templates (
          id, name, type, variant, content, schema, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        input.name,
        input.type,
        input.variant || null,
        content,
        input.schema ? JSON.stringify(input.schema) : null,
        now
      );

      const template: ArtifactTemplate = {
        id,
        name: input.name,
        type: input.type,
        variant: input.variant,
        content,
        schema: input.schema,
        created_at: now,
      };

      // Cache in memory
      const cacheKey = this.getCacheKey(input.name, input.variant);
      this.templateCache.set(cacheKey, template);

      return template;
    } catch (err) {
      throw new Error(`Failed to load template: ${err}`);
    }
  }

  /**
   * Get a template by type and optional variant
   */
  getTemplate(
    type: "resume" | "cover_letter",
    variant?: string
  ): ArtifactTemplate | null {
    const stmt = this.db.prepare(
      variant
        ? "SELECT * FROM artifact_templates WHERE type = ? AND variant = ?"
        : "SELECT * FROM artifact_templates WHERE type = ? AND variant IS NULL"
    );

    const row = variant
      ? (stmt.get(type, variant) as any)
      : (stmt.get(type) as any);

    return row ? this.rowToTemplate(row) : null;
  }

  /**
   * Get a template by ID
   */
  getTemplateById(id: string): ArtifactTemplate | null {
    const stmt = this.db.prepare("SELECT * FROM artifact_templates WHERE id = ?");
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    const template = this.rowToTemplate(row);
    const cacheKey = this.getCacheKey(template.name, template.variant);
    this.templateCache.set(cacheKey, template);

    return template;
  }

  /**
   * List all templates, optionally filtered by type
   */
  listTemplates(type?: "resume" | "cover_letter"): ArtifactTemplate[] {
    const stmt = type
      ? this.db.prepare(
          "SELECT * FROM artifact_templates WHERE type = ? ORDER BY created_at DESC"
        )
      : this.db.prepare(
          "SELECT * FROM artifact_templates ORDER BY created_at DESC"
        );

    const rows = type ? (stmt.all(type) as any[]) : (stmt.all() as any[]);

    return rows.map((row) => {
      const template = this.rowToTemplate(row);
      const cacheKey = this.getCacheKey(template.name, template.variant);
      this.templateCache.set(cacheKey, template);
      return template;
    });
  }

  /**
   * Validate a template against provided data
   */
  validateTemplate(
    template: ArtifactTemplate,
    data: Record<string, any>
  ): ValidationResult {
    const errors: string[] = [];

    // If no schema, basic validation only
    if (!template.schema) {
      // Check that template has expected placeholders
      const placeholderPattern = /\{\{([^}]+)\}\}/g;
      const matches = template.content.match(placeholderPattern);

      if (!matches || matches.length === 0) {
        errors.push("Template has no placeholders");
        return { valid: errors.length === 0, errors };
      }

      return { valid: true, errors: [] };
    }

    // Validate against schema
    const schema = template.schema;

    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in data) || data[field] === undefined || data[field] === null) {
          errors.push(`Required field missing: ${field}`);
        }
      }
    }

    if (schema.properties && typeof schema.properties === "object") {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in data && data[field] !== undefined && data[field] !== null) {
          const value = data[field];
          const fs = fieldSchema as any;

          // Type validation
          if (fs.type) {
            const actualType = Array.isArray(value) ? "array" : typeof value;
            if (actualType !== fs.type && !(fs.type === "string" && typeof value === "number")) {
              errors.push(
                `Field ${field} has wrong type: expected ${fs.type}, got ${actualType}`
              );
            }
          }

          // Pattern validation
          if (fs.pattern && typeof value === "string") {
            const regex = new RegExp(fs.pattern);
            if (!regex.test(value)) {
              errors.push(`Field ${field} does not match pattern: ${fs.pattern}`);
            }
          }

          // Min/max length
          if (fs.minLength && value.length < fs.minLength) {
            errors.push(`Field ${field} is too short (min: ${fs.minLength})`);
          }
          if (fs.maxLength && value.length > fs.maxLength) {
            errors.push(`Field ${field} is too long (max: ${fs.maxLength})`);
          }

          // Min/max value
          if (fs.minimum && value < fs.minimum) {
            errors.push(`Field ${field} is too small (min: ${fs.minimum})`);
          }
          if (fs.maximum && value > fs.maximum) {
            errors.push(`Field ${field} is too large (max: ${fs.maximum})`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Delete a template
   */
  deleteTemplate(id: string): boolean {
    const template = this.getTemplateById(id);
    if (template) {
      const cacheKey = this.getCacheKey(template.name, template.variant);
      this.templateCache.delete(cacheKey);
    }

    const stmt = this.db.prepare("DELETE FROM artifact_templates WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Clear the template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Private: Get template by name and variant
   */
  private getTemplateByNameAndVariant(
    name: string,
    variant?: string
  ): ArtifactTemplate | null {
    const cacheKey = this.getCacheKey(name, variant);

    // Check memory cache
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey) || null;
    }

    // Check database
    const stmt = variant
      ? this.db.prepare(
          "SELECT * FROM artifact_templates WHERE name = ? AND variant = ?"
        )
      : this.db.prepare(
          "SELECT * FROM artifact_templates WHERE name = ? AND variant IS NULL"
        );

    const row = variant
      ? (stmt.get(name, variant) as any)
      : (stmt.get(name) as any);

    if (!row) {
      return null;
    }

    const template = this.rowToTemplate(row);
    this.templateCache.set(cacheKey, template);
    return template;
  }

  /**
   * Private: Get cache key for name and variant
   */
  private getCacheKey(name: string, variant?: string): string {
    return variant ? `${name}:${variant}` : `${name}:default`;
  }

  /**
   * Private: Convert database row to ArtifactTemplate
   */
  private rowToTemplate(row: any): ArtifactTemplate {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      variant: row.variant,
      content: row.content,
      schema: row.schema ? JSON.parse(row.schema) : undefined,
      created_at: row.created_at,
    };
  }
}

/**
 * Factory function to create a TemplateService instance
 */
export function createTemplateService(db: Database): TemplateService {
  return new TemplateService(db);
}
