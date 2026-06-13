import { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { Artifact, CareerModel } from "../../shared/types.js";
import { ClaudeService } from "./claude.service.js";
import { PromptComposerService } from "./prompt-composer.service.js";
import { OutputContractService } from "./output-contract.service.js";
import { TemplateService } from "./template.service.js";
import { CareerModelService } from "./career-model.service.js";

interface GenerateArtifactInput {
  jobId: string;
  artifact_type: "resume" | "cover_letter" | "linkedin" | "bio";
  variant?: string;
  jobDescription: string;
  positioningAngle?: string;
  template?: string;
  careerModel?: CareerModel;
}

interface GeneratedArtifact {
  id: string;
  artifact_type: string;
  variant?: string;
  output: Record<string, any>;
  generated_at: string;
  career_doc_version_hash?: string;
  content_hash?: string;
}

/**
 * Artifact Engine Service
 * Orchestrates artifact generation using prompt composition and Claude API
 */
export class ArtifactEngineService {
  constructor(
    private db: Database,
    private claudeService: ClaudeService,
    private outputContractService: OutputContractService,
    _templateService: TemplateService,
    private careerModelService: CareerModelService
  ) {}

  /**
   * Generate an artifact (resume, cover letter, etc.)
   */
  async generateArtifact(input: GenerateArtifactInput): Promise<GeneratedArtifact> {
    // Resolve career model if not provided
    let careerModel = input.careerModel;
    if (!careerModel) {
      careerModel = await this.careerModelService.resolveCareerModel({
        jobId: input.jobId,
      });
    }

    if (!careerModel) {
      throw new Error("Cannot resolve career model for artifact generation");
    }

    // Compose prompt based on artifact type
    let prompt: string;

    if (input.artifact_type === "resume") {
      prompt = PromptComposerService.composeResumePrompt({
        artifact_type: input.artifact_type,
        career_model: careerModel,
        job_description: input.jobDescription,
        positioning_angle: input.positioningAngle,
        template: input.template,
        variant: input.variant as any,
      });
    } else if (input.artifact_type === "cover_letter") {
      prompt = PromptComposerService.composeCoverLetterPrompt({
        artifact_type: input.artifact_type,
        career_model: careerModel,
        job_description: input.jobDescription,
        positioning_angle: input.positioningAngle,
        template: input.template,
      });
    } else {
      prompt = PromptComposerService.composeArtifactPrompt({
        artifact_type: input.artifact_type,
        career_model: careerModel,
        job_description: input.jobDescription,
        positioning_angle: input.positioningAngle,
        template: input.template,
      });
    }

    // Call Claude API
    let output: Record<string, any>;
    try {
      output = await this.claudeService.analyzeJobWithJSON<Record<string, any>>(prompt);
    } catch (err) {
      throw new Error(`Claude API error during artifact generation: ${(err as Error).message}`);
    }

    // Validate output against contract
    const contractType =
      input.artifact_type === "resume"
        ? "resume_source"
        : input.artifact_type === "cover_letter"
          ? "cover_letter_source"
          : "resume_source";

    const validationResult = this.outputContractService.validate(contractType, output);
    if (!validationResult.valid) {
      console.warn("Output validation warnings:", validationResult.errors);
      // Continue anyway but log warnings
    }

    // Generate hash of output
    const contentHash = this.hashContent(JSON.stringify(output));

    // Store in cached_artifacts table
    const id = uuidv4();
    const now = new Date().toISOString();
    const artifactTypeForDb = input.artifact_type === "resume" ? "resume_source" : input.artifact_type === "cover_letter" ? "cover_letter_source" : "resume_source";

    const stmt = this.db.prepare(`
      INSERT INTO cached_artifacts (
        id, artifact_type, career_model_id, content_hash, created_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      artifactTypeForDb,
      careerModel.id,
      contentHash,
      now,
      JSON.stringify({
        job_id: input.jobId,
        variant: input.variant,
        output: output,
        generated_for_job: input.jobId,
      })
    );

    return {
      id,
      artifact_type: input.artifact_type,
      variant: input.variant,
      output,
      generated_at: now,
      career_doc_version_hash: careerModel.hash,
      content_hash: contentHash,
    };
  }

  /**
   * Get a cached artifact by ID
   */
  getArtifact(id: string): Artifact | null {
    const stmt = this.db.prepare("SELECT * FROM cached_artifacts WHERE id = ?");
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      job_id: row.job_id,
      artifact_type: row.artifact_type,
      file_path: row.file_path || "",
      created_at: row.generated_at,
      career_doc_version_hash: row.career_doc_version_hash,
      content_hash: row.content_hash,
    };
  }

  /**
   * Get all artifacts for a job
   */
  getJobArtifacts(jobId: string): Artifact[] {
    const stmt = this.db.prepare(
      `SELECT * FROM cached_artifacts
       WHERE metadata LIKE ?
       ORDER BY created_at DESC`
    );
    const jobIdPattern = `%"job_id":"${jobId}"%`;
    const rows = stmt.all(jobIdPattern) as any[];

    return rows.map((row) => ({
      id: row.id,
      job_id: jobId,
      artifact_type: row.artifact_type,
      file_path: row.file_path || "",
      created_at: row.created_at,
      career_doc_version_hash: undefined,
      content_hash: row.content_hash,
    }));
  }

  /**
   * Get cached artifact output by ID
   */
  getArtifactOutput(id: string): Record<string, any> | null {
    const stmt = this.db.prepare("SELECT metadata FROM cached_artifacts WHERE id = ?");
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    try {
      const metadata = JSON.parse(row.metadata);
      return metadata.output || metadata;
    } catch {
      return null;
    }
  }

  /**
   * Private: Hash content using SHA-256
   */
  private hashContent(content: string): string {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(content).digest("hex");
  }
}

/**
 * Factory function to create an ArtifactEngineService instance
 */
export function createArtifactEngineService(
  db: Database,
  claudeService: ClaudeService,
  outputContractService: OutputContractService,
  templateService: TemplateService,
  careerModelService: CareerModelService
): ArtifactEngineService {
  return new ArtifactEngineService(
    db,
    claudeService,
    outputContractService,
    templateService,
    careerModelService
  );
}
