import { Database } from "better-sqlite3";
import crypto from "crypto";
import {
  Artifact,
  ArtifactType,
  CreateArtifactInput,
} from "../schemas/artifact.schema.js";
import { getDatabase } from "../db/database.js";

interface ArtifactRecord {
  id: string;
  job_id: string;
  artifact_type: string;
  version: number;
  positioning: string | null;
  title: string | null;
  career_doc_version_id: string;
  prompt_version: number;
  model: string;
  json_content: string;
  rendered_text: string;
  status: string;
  is_preferred: boolean;
  created_at: string;
  updated_at: string;
}

export class ArtifactService {
  constructor(private db: Database) {}

  /**
   * Create a new artifact with auto-incrementing version
   */
  create(input: CreateArtifactInput): Artifact {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Get next version for this job + artifact_type
    const maxVersion = this.getMaxVersion(input.jobId, input.artifactType);
    const version = maxVersion + 1;

    // Serialize JSON content
    const jsonContent = JSON.stringify(input.jsonContent);

    const stmt = this.db.prepare(`
      INSERT INTO job_artifacts (
        id, job_id, artifact_type, version, positioning, title,
        career_doc_version_id, prompt_version, model,
        json_content, rendered_text, status, is_preferred, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.jobId,
      input.artifactType,
      version,
      input.positioning || null,
      input.title || null,
      input.careerDocVersionId,
      input.promptVersion,
      input.model,
      jsonContent,
      input.renderedText,
      "ready",
      0,
      now,
      now
    );

    return this.getById(id)!;
  }

  /**
   * Get artifact by ID
   */
  getById(id: string): Artifact | null {
    const stmt = this.db.prepare("SELECT * FROM job_artifacts WHERE id = ?");
    const row = stmt.get(id) as ArtifactRecord | undefined;

    if (!row) return null;

    return this.mapRowToArtifact(row);
  }

  /**
   * List all artifacts for a job
   */
  listByJob(jobId: string, artifactType?: ArtifactType): Artifact[] {
    let stmt;
    const params: any[] = [jobId];

    if (artifactType) {
      stmt = this.db.prepare(
        "SELECT * FROM job_artifacts WHERE job_id = ? AND artifact_type = ? ORDER BY created_at DESC"
      );
      params.push(artifactType);
    } else {
      stmt = this.db.prepare(
        "SELECT * FROM job_artifacts WHERE job_id = ? ORDER BY created_at DESC"
      );
    }

    const rows = stmt.all(...params) as ArtifactRecord[];
    return rows.map(row => this.mapRowToArtifact(row));
  }

  /**
   * Get the latest artifact for a job + type
   */
  getLatestByType(jobId: string, artifactType: ArtifactType): Artifact | null {
    const stmt = this.db.prepare(`
      SELECT * FROM job_artifacts
      WHERE job_id = ? AND artifact_type = ?
      ORDER BY version DESC
      LIMIT 1
    `);

    const row = stmt.get(jobId, artifactType) as ArtifactRecord | undefined;
    return row ? this.mapRowToArtifact(row) : null;
  }

  /**
   * Get max version for job + artifact_type (for auto-incrementing)
   */
  private getMaxVersion(jobId: string, artifactType: ArtifactType): number {
    const stmt = this.db.prepare(
      "SELECT MAX(version) as max_version FROM job_artifacts WHERE job_id = ? AND artifact_type = ?"
    );
    const result = stmt.get(jobId, artifactType) as { max_version: number | null };
    return result.max_version || 0;
  }

  /**
   * Mark artifact as preferred
   */
  markPreferred(artifactId: string): Artifact {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      "UPDATE job_artifacts SET is_preferred = 1, updated_at = ? WHERE id = ?"
    );
    stmt.run(now, artifactId);

    return this.getById(artifactId)!;
  }

  /**
   * Archive artifact
   */
  archive(artifactId: string): Artifact {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      "UPDATE job_artifacts SET status = 'archived', updated_at = ? WHERE id = ?"
    );
    stmt.run(now, artifactId);

    return this.getById(artifactId)!;
  }

  /**
   * Map database row to Artifact type
   */
  private mapRowToArtifact(row: ArtifactRecord): Artifact {
    return {
      id: row.id,
      jobId: row.job_id,
      artifactType: row.artifact_type as ArtifactType,
      version: row.version,
      positioning: row.positioning || undefined,
      title: row.title || undefined,
      careerDocVersionId: row.career_doc_version_id,
      promptVersion: row.prompt_version,
      model: row.model,
      jsonContent: JSON.parse(row.json_content),
      renderedText: row.rendered_text,
      status: row.status as any,
      isPreferred: (row.is_preferred as unknown as number) === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export function createArtifactService(): ArtifactService {
  return new ArtifactService(getDatabase().getConnection());
}
