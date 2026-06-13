import { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

interface CacheInput {
  jobId: string;
  content: Record<string, any>;
  artifact_type: string;
  variant?: string;
}

interface CacheResult {
  id: string;
  contentHash: string;
  isCached: boolean;
}

interface CacheStats {
  total_cached: number;
  by_type: Record<string, number>;
  oldest?: string;
  newest?: string;
  by_job: Record<string, number>;
}

interface CachedArtifact {
  id: string;
  job_id: string;
  artifact_type: string;
  variant?: string;
  content_hash: string;
  generated_at: string;
}

/**
 * Artifact Cache Service
 * Manages caching of generated artifacts with deduplication
 */
export class ArtifactCacheService {
  constructor(private db: Database) {}

  /**
   * Generate SHA-256 hash for content
   */
  hashContent(content: any): string {
    const contentString =
      typeof content === "string" ? content : JSON.stringify(content);
    return crypto.createHash("sha256").update(contentString).digest("hex");
  }

  /**
   * Get cached artifact by content hash
   */
  getCachedByHash(contentHash: string): CachedArtifact | null {
    const stmt = this.db.prepare(
      "SELECT * FROM cached_artifacts WHERE content_hash = ? LIMIT 1"
    );
    const row = stmt.get(contentHash) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      job_id: row.job_id,
      artifact_type: row.artifact_type,
      variant: row.variant,
      content_hash: row.content_hash,
      generated_at: row.generated_at,
    };
  }

  /**
   * Cache an artifact, returning existing if already cached
   */
  cache(input: CacheInput): CacheResult {
    // Hash the content
    const contentHash = this.hashContent(input.content);

    // Check if already cached by hash
    const existing = this.getCachedByHash(contentHash);
    if (existing) {
      return {
        id: existing.id,
        contentHash,
        isCached: true,
      };
    }

    // Create new cache entry
    const id = uuidv4();
    const now = new Date().toISOString();
    const artifactTypeForDb = input.artifact_type === "resume" ? "resume_source" : input.artifact_type === "cover_letter" ? "cover_letter_source" : input.artifact_type;

    // Note: This requires a valid career_model_id
    // For now, we'll use a placeholder approach - in production, pass career_model_id
    const stmt = this.db.prepare(`
      INSERT INTO cached_artifacts (
        id, artifact_type, career_model_id, content_hash, created_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      artifactTypeForDb,
      "default", // Placeholder - should be provided by caller
      contentHash,
      now,
      JSON.stringify({
        job_id: input.jobId,
        variant: input.variant,
        output: input.content,
      })
    );

    return {
      id,
      contentHash,
      isCached: false,
    };
  }

  /**
   * Prune cache - keep only the last 100 artifacts globally
   */
  pruneCache(): void {
    // Get total count
    const countStmt = this.db.prepare("SELECT COUNT(*) as count FROM cached_artifacts");
    const countRow = countStmt.get() as any;
    const total = countRow?.count || 0;

    if (total > 100) {
      // Delete oldest artifacts beyond 100
      const deleteStmt = this.db.prepare(`
        DELETE FROM cached_artifacts WHERE id IN (
          SELECT id FROM cached_artifacts
          ORDER BY created_at ASC
          LIMIT ?
        )
      `);
      deleteStmt.run(total - 100);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    // Total cached
    const totalStmt = this.db.prepare("SELECT COUNT(*) as count FROM cached_artifacts");
    const totalRow = totalStmt.get() as any;
    const total_cached = totalRow?.count || 0;

    // By type
    const byTypeStmt = this.db.prepare(
      `SELECT artifact_type, COUNT(*) as count
       FROM cached_artifacts
       GROUP BY artifact_type`
    );
    const byTypeRows = byTypeStmt.all() as any[];
    const by_type: Record<string, number> = {};
    for (const row of byTypeRows) {
      by_type[row.artifact_type] = row.count;
    }

    // By job (extracted from metadata)
    const by_job: Record<string, number> = {};
    const allStmt = this.db.prepare("SELECT metadata FROM cached_artifacts");
    const allRows = allStmt.all() as any[];
    for (const row of allRows) {
      try {
        const metadata = JSON.parse(row.metadata);
        const jobId = metadata.job_id;
        if (jobId) {
          by_job[jobId] = (by_job[jobId] || 0) + 1;
        }
      } catch {
        // Skip rows with invalid metadata
      }
    }

    // Oldest and newest
    const oldestStmt = this.db.prepare(
      "SELECT created_at FROM cached_artifacts ORDER BY created_at ASC LIMIT 1"
    );
    const oldestRow = oldestStmt.get() as any;

    const newestStmt = this.db.prepare(
      "SELECT created_at FROM cached_artifacts ORDER BY created_at DESC LIMIT 1"
    );
    const newestRow = newestStmt.get() as any;

    return {
      total_cached,
      by_type,
      by_job,
      oldest: oldestRow?.created_at,
      newest: newestRow?.created_at,
    };
  }

  /**
   * Clear all artifacts for a specific job
   */
  clearJobArtifacts(jobId: string): number {
    const jobIdPattern = `%"job_id":"${jobId}"%`;
    const stmt = this.db.prepare("DELETE FROM cached_artifacts WHERE metadata LIKE ?");
    const result = stmt.run(jobIdPattern);
    return result.changes;
  }

  /**
   * Clear all cached artifacts
   */
  clearAllArtifacts(): number {
    const stmt = this.db.prepare("DELETE FROM cached_artifacts");
    const result = stmt.run();
    return result.changes;
  }
}

/**
 * Factory function to create an ArtifactCacheService instance
 */
export function createArtifactCacheService(db: Database): ArtifactCacheService {
  return new ArtifactCacheService(db);
}
