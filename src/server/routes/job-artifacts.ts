import { Router, Request, Response } from "express";
import { getDatabase } from "../db/database.js";
import { getClaudeService } from "../services/claude.service.js";
import { createArtifactService } from "../services/artifact.service.js";
import { createResumePromptBuilderService } from "../services/resume-prompt-builder.service.js";
import { createResumeGeneratorService } from "../services/resume-generator.service.js";
import { createJobService } from "../services/job.service.js";
import { createCareerModelService } from "../services/career-model.service.js";
import { createChangeGraphService } from "../services/change-graph.service.js";
import { FitAnalyzerService } from "../services/fit-analyzer.service.js";
import { createPDFExportService } from "../services/pdf-export.service.js";
import { createCareerDocService } from "../services/career-doc.service.js";

const router = Router();

// Lazy initialization: services are created after database is ready
let services: {
  artifactService: ReturnType<typeof createArtifactService>;
  resumeGeneratorService: ReturnType<typeof createResumeGeneratorService>;
  jobService: ReturnType<typeof createJobService>;
  careerModelService: ReturnType<typeof createCareerModelService>;
  fitAnalyzerService: FitAnalyzerService;
  pdfExportService: ReturnType<typeof createPDFExportService>;
  careerDocService: ReturnType<typeof createCareerDocService>;
} | null = null;

/**
 * Initialize job artifact services after database is ready
 * Called from server startup (index.ts)
 */
export function initializeJobArtifactServices() {
  const db = getDatabase().getConnection();
  const claudeService = getClaudeService();
  const jobService = createJobService();
  const changeGraphService = createChangeGraphService(db);
  const careerModelService = createCareerModelService(db, changeGraphService);
  const careerDocService = createCareerDocService();
  const artifactService = createArtifactService();
  const promptBuilder = createResumePromptBuilderService();
  const resumeGeneratorService = createResumeGeneratorService(
    claudeService,
    promptBuilder,
    artifactService
  );
  const fitAnalyzerService = new FitAnalyzerService();
  const pdfExportService = createPDFExportService();

  services = {
    artifactService,
    resumeGeneratorService,
    jobService,
    careerModelService,
    fitAnalyzerService,
    pdfExportService,
    careerDocService,
  };
}

/**
 * Get initialized services (throws if not initialized)
 */
function getServices() {
  if (!services) {
    throw new Error(
      "Job artifact services not initialized. Call initializeJobArtifactServices first."
    );
  }
  return services;
}

/**
 * POST /api/jobs/:jobId/artifacts/generate
 * Generate a resume for a job
 */
router.post("/:jobId/artifacts/generate", async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId } = req.params;
    const { artifactType = "resume" } = req.body;

    // Only support resume generation in Phase 1
    if (artifactType !== "resume") {
      return res.status(400).json({
        status: 400,
        error: {
          code: "UNSUPPORTED_ARTIFACT_TYPE",
          message: "Only resume generation is supported in Phase 1. Cover letters coming in Phase 2.",
          details: { requestedType: artifactType },
        },
      });
    }

    // Get job
    const job = svc.jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        status: 404,
        error: {
          code: "JOB_NOT_FOUND",
          message: `Job ${jobId} not found`,
          details: { jobId },
        },
      });
    }

    // Get latest career model
    const careerModel = await svc.careerModelService.resolveCareerModel({ jobId });
    if (!careerModel || !careerModel.sections.experience?.length) {
      return res.status(400).json({
        status: 400,
        error: {
          code: "CAREER_PROFILE_INCOMPLETE",
          message: "Career profile must have at least one experience entry to generate resume",
          details: { hasProfile: !!careerModel, experienceCount: careerModel?.sections.experience?.length || 0 },
        },
      });
    }

    // Run fit analysis
    const fitAnalysis = svc.fitAnalyzerService.analyze(careerModel, job.description);

    // Generate resume
    const result = await svc.resumeGeneratorService.generateResume(
      jobId,
      careerModel,
      job.description,
      {
        positioning: fitAnalysis.recommendedPositioningAngle || "Strong Candidate",
        strengths: fitAnalysis.strongMatches || [],
        gaps: fitAnalysis.experienceGaps.map((g) => g.requirement) || [],
        score: fitAnalysis.overallFit || 0,
      }
    );

    if (!result.success) {
      return res.status(500).json({
        status: 500,
        error: {
          code: result.error?.code || "GENERATION_FAILED",
          message: result.error?.message || "Resume generation failed",
          details: {
            attempt: result.error?.attempt,
          },
        },
      });
    }

    return res.json({
      status: 200,
      data: {
        artifactId: result.artifact!.id,
        jobId: result.artifact!.jobId,
        artifactType: result.artifact!.artifactType,
        version: result.artifact!.version,
        positioning: result.artifact!.positioning,
        status: result.artifact!.status,
        createdAt: result.artifact!.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Resume generation error:", error);
    res.status(500).json({
      status: 500,
      error: {
        code: "GENERATION_ERROR",
        message: "Unexpected error during resume generation",
        details: {
          reason: error.message || "Unknown error",
        },
      },
    });
  }
});

/**
 * GET /api/jobs/:jobId/artifacts/:artifactId
 * Get a specific artifact with stale status
 */
router.get("/:jobId/artifacts/:artifactId", (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { artifactId } = req.params;

    const artifact = svc.artifactService.getById(artifactId);
    if (!artifact) {
      return res.status(404).json({
        status: 404,
        error: {
          code: "ARTIFACT_NOT_FOUND",
          message: `Artifact ${artifactId} not found`,
          details: {},
        },
      });
    }

    // Check if artifact is stale (career profile version mismatch)
    const currentCareerDoc = svc.careerDocService.parseCareerDocument();
    const currentHash = svc.careerDocService.saveCareerDocumentVersion(currentCareerDoc);
    const isStale = artifact.careerDocVersionId !== currentHash;

    return res.json({
      status: 200,
      data: {
        ...artifact,
        isStale,
      },
    });
  } catch (error: any) {
    console.error("Get artifact error:", error);
    res.status(500).json({
      status: 500,
      error: {
        code: "ARTIFACT_RETRIEVAL_FAILED",
        message: "Failed to retrieve artifact",
        details: {
          reason: error.message || "Unknown error",
        },
      },
    });
  }
});

/**
 * GET /api/jobs/:jobId/artifacts
 * List artifacts for a job with stale status
 */
router.get("/:jobId/artifacts", (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId } = req.params;
    const { type } = req.query;

    const artifacts = svc.artifactService.listByJob(
      jobId,
      type ? (type as "resume" | "cover_letter") : undefined
    );

    // Check if any artifacts are stale
    const currentCareerDoc = svc.careerDocService.parseCareerDocument();
    const currentHash = svc.careerDocService.saveCareerDocumentVersion(currentCareerDoc);

    const artifactsWithStaleStatus = artifacts.map((artifact) => ({
      ...artifact,
      isStale: artifact.careerDocVersionId !== currentHash,
    }));

    return res.json({
      status: 200,
      data: {
        artifacts: artifactsWithStaleStatus,
        count: artifactsWithStaleStatus.length,
      },
    });
  } catch (error: any) {
    console.error("List artifacts error:", error);
    res.status(500).json({
      status: 500,
      error: {
        code: "ARTIFACTS_LIST_FAILED",
        message: "Failed to list artifacts",
        details: {
          reason: error.message || "Unknown error",
        },
      },
    });
  }
});

/**
 * POST /api/jobs/:jobId/artifacts/:artifactId/pdf
 * Export artifact as PDF using template-based rendering
 */
router.post("/:jobId/artifacts/:artifactId/pdf", async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { artifactId } = req.params;

    const artifact = svc.artifactService.getById(artifactId);
    if (!artifact) {
      return res.status(404).json({
        status: 404,
        error: {
          code: "ARTIFACT_NOT_FOUND",
          message: `Artifact ${artifactId} not found`,
          details: {},
        },
      });
    }

    // Check if artifact is stale (career profile version mismatch)
    const currentCareerDoc = svc.careerDocService.parseCareerDocument();
    const currentHash = svc.careerDocService.saveCareerDocumentVersion(currentCareerDoc);
    const isStale = artifact.careerDocVersionId !== currentHash;

    // Generate PDF from artifact JSON using template service
    // This ensures ATS-safe structure: single column, standard typography, no graphics
    let pdfBytes: Buffer;
    try {
      pdfBytes = await svc.pdfExportService.generateResumePDF(artifact.jsonContent.resume);

      if (!pdfBytes || pdfBytes.length === 0) {
        throw new Error("PDF generation produced empty output");
      }
    } catch (pdfError: any) {
      console.error("PDF generation error:", pdfError);
      return res.status(500).json({
        status: 500,
        error: {
          code: "PDF_GENERATION_FAILED",
          message: "Failed to generate PDF from artifact template",
          details: {
            reason: pdfError.message || "Unknown error",
            artifactId,
          },
        },
      });
    }

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="resume_v${artifact.version}.pdf"`
    );
    res.setHeader("Content-Length", pdfBytes.length);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    // Send PDF bytes
    res.send(pdfBytes);

    // Log stale warning (no error, but useful for debugging)
    if (isStale) {
      console.warn(
        `PDF exported for stale artifact (id=${artifactId}, version=${artifact.version}, careerDocVersion=${artifact.careerDocVersionId})`
      );
    }
  } catch (error: any) {
    console.error("PDF export error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        status: 500,
        error: {
          code: "PDF_EXPORT_FAILED",
          message: "Unexpected error during PDF export",
          details: {
            reason: error.message || "Unknown error",
          },
        },
      });
    }
  }
});

export default router;
