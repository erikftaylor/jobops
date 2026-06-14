import { Router, Request, Response } from "express";
import { getDatabase } from "../db/database.js";
import { getClaudeService } from "../services/claude.service.js";
import { createJobService } from "../services/job.service.js";
import { createCareerModelService } from "../services/career-model.service.js";
import { createOutputContractService } from "../services/output-contract.service.js";
import { createTemplateService } from "../services/template.service.js";
import { createArtifactEngineService } from "../services/artifact-engine.service.js";
import { createArtifactCacheService } from "../services/artifact-cache.service.js";
import { createChangeGraphService } from "../services/change-graph.service.js";

const router = Router();

// Lazy initialization: services are created after database is ready
let services: {
  jobService: ReturnType<typeof createJobService>;
  changeGraphService: ReturnType<typeof createChangeGraphService>;
  careerModelService: ReturnType<typeof createCareerModelService>;
  outputContractService: ReturnType<typeof createOutputContractService>;
  templateService: ReturnType<typeof createTemplateService>;
  artifactEngineService: ReturnType<typeof createArtifactEngineService>;
  cacheService: ReturnType<typeof createArtifactCacheService>;
} | null = null;

/**
 * Initialize artifact services after database is ready
 * Called from server startup (index.ts)
 */
export function initializeArtifactServices() {
  const db = getDatabase().getConnection();
  const claudeService = getClaudeService();
  const jobService = createJobService();
  const changeGraphService = createChangeGraphService(db);
  const careerModelService = createCareerModelService(db, changeGraphService);
  const outputContractService = createOutputContractService(db);
  const templateService = createTemplateService(db);
  const artifactEngineService = createArtifactEngineService(
    db,
    claudeService,
    outputContractService,
    templateService,
    careerModelService
  );
  const cacheService = createArtifactCacheService(db);

  services = {
    jobService,
    changeGraphService,
    careerModelService,
    outputContractService,
    templateService,
    artifactEngineService,
    cacheService,
  };
}

/**
 * Get initialized services (throws if not initialized)
 */
function getServices() {
  if (!services) {
    throw new Error("Artifact services not initialized. Call initializeArtifactServices first.");
  }
  return services;
}

/**
 * POST /api/artifacts/generate
 * Generate an artifact (resume, cover letter, etc.) for a job
 */
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const {
      jobId,
      artifact_type,
      variant,
      jobDescription,
      positioningAngle,
      template,
    } = req.body;

    // Validate required fields
    if (!jobId) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "jobId is required",
      });
    }

    if (!artifact_type) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "artifact_type is required (resume, cover_letter, linkedin, or bio)",
      });
    }

    if (!jobDescription) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "jobDescription is required",
      });
    }

    // Validate artifact_type
    const validTypes = ["resume", "cover_letter", "linkedin", "bio"];
    if (!validTypes.includes(artifact_type)) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: `Invalid artifact_type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Verify job exists
    const job = svc.jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Job ${jobId} not found`,
      });
    }

    // Resolve career model
    let careerModel;
    try {
      careerModel = await svc.careerModelService.resolveCareerModel({
        jobId,
        positioningId: undefined,
      });
    } catch (err) {
      return res.status(400).json({
        code: "CAREER_MODEL_ERROR",
        message: `Failed to resolve career model: ${(err as Error).message}`,
      });
    }

    if (!careerModel) {
      return res.status(400).json({
        code: "CAREER_MODEL_ERROR",
        message: "Unable to resolve career model for artifact generation",
      });
    }

    // Generate artifact
    let artifact;
    try {
      artifact = await svc.artifactEngineService.generateArtifact({
        jobId,
        artifact_type: artifact_type as any,
        variant,
        jobDescription,
        positioningAngle,
        template,
        careerModel,
      });
    } catch (err) {
      console.error("Artifact generation error:", err);
      return res.status(503).json({
        code: "GENERATION_FAILED",
        message: `Failed to generate artifact: ${(err as Error).message}`,
      });
    }

    // Cache the result
    try {
      svc.cacheService.cache({
        jobId,
        content: artifact.output,
        artifact_type,
        variant,
      });
    } catch (cacheErr) {
      console.warn("Failed to cache artifact:", cacheErr);
      // Continue anyway - caching failure is not fatal
    }

    return res.status(201).json({
      id: artifact.id,
      artifact_type: artifact.artifact_type,
      variant: artifact.variant,
      output: artifact.output,
      generated_at: artifact.generated_at,
      career_doc_version_hash: artifact.career_doc_version_hash,
      message: "Artifact generated successfully",
    });
  } catch (err) {
    console.error("Unexpected error in artifact generation:", err);
    return res.status(500).json({
      code: "SERVER_ERROR",
      message: "Internal server error",
      ...(process.env.DEBUG && { detail: (err as Error).message }),
    });
  }
});

/**
 * GET /api/artifacts/:id
 * Get a cached artifact by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { id } = req.params;

    // Get artifact metadata
    const artifact = svc.artifactEngineService.getArtifact(id);
    if (!artifact) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Artifact ${id} not found`,
      });
    }

    // Get artifact output
    const output = svc.artifactEngineService.getArtifactOutput(id);
    if (!output) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Artifact output not found`,
      });
    }

    return res.json({
      id: artifact.id,
      job_id: artifact.job_id,
      artifact_type: artifact.artifact_type,
      created_at: artifact.created_at,
      output,
    });
  } catch (err) {
    console.error("Unexpected error in artifact retrieval:", err);
    return res.status(500).json({
      code: "SERVER_ERROR",
      message: "Internal server error",
      ...(process.env.DEBUG && { detail: (err as Error).message }),
    });
  }
});

/**
 * GET /api/artifacts/job/:jobId
 * Get all artifacts for a specific job
 */
router.get("/job/:jobId", async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId } = req.params;

    // Verify job exists
    const job = svc.jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Job ${jobId} not found`,
      });
    }

    // Get all artifacts for job
    const artifacts = svc.artifactEngineService.getJobArtifacts(jobId);

    return res.json({
      job_id: jobId,
      artifacts: artifacts.map((a) => ({
        id: a.id,
        artifact_type: a.artifact_type,
        created_at: a.created_at,
      })),
      total: artifacts.length,
    });
  } catch (err) {
    console.error("Unexpected error in artifact listing:", err);
    return res.status(500).json({
      code: "SERVER_ERROR",
      message: "Internal server error",
      ...(process.env.DEBUG && { detail: (err as Error).message }),
    });
  }
});

export default router;
