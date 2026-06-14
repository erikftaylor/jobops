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
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

const router = Router();

// Lazy initialization: services are created after database is ready
let services: {
  artifactService: ReturnType<typeof createArtifactService>;
  resumeGeneratorService: ReturnType<typeof createResumeGeneratorService>;
  jobService: ReturnType<typeof createJobService>;
  careerModelService: ReturnType<typeof createCareerModelService>;
  fitAnalyzerService: FitAnalyzerService;
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
  const artifactService = createArtifactService();
  const promptBuilder = createResumePromptBuilderService();
  const resumeGeneratorService = createResumeGeneratorService(
    claudeService,
    promptBuilder,
    artifactService
  );
  const fitAnalyzerService = new FitAnalyzerService();

  services = {
    artifactService,
    resumeGeneratorService,
    jobService,
    careerModelService,
    fitAnalyzerService,
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
          code: "UNSUPPORTED_TYPE",
          message: "Phase 1 only supports resume generation",
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
        },
      });
    }

    // Get latest career model
    const careerModel = await svc.careerModelService.resolveCareerModel({ jobId });
    if (!careerModel || !careerModel.sections.experience?.length) {
      return res.status(400).json({
        status: 400,
        error: {
          code: "INVALID_PROFILE",
          message: "Career profile incomplete. Must have at least one experience entry.",
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
        error: result.error,
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
        message: error.message || "Failed to generate resume",
      },
    });
  }
});

/**
 * GET /api/jobs/:jobId/artifacts/:artifactId
 * Get a specific artifact
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
          code: "NOT_FOUND",
          message: `Artifact ${artifactId} not found`,
        },
      });
    }

    return res.json({
      status: 200,
      data: artifact,
    });
  } catch (error: any) {
    console.error("Get artifact error:", error);
    res.status(500).json({
      status: 500,
      error: {
        code: "GET_FAILED",
        message: error.message || "Failed to retrieve artifact",
      },
    });
  }
});

/**
 * GET /api/jobs/:jobId/artifacts
 * List artifacts for a job
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

    return res.json({
      status: 200,
      data: {
        artifacts,
        count: artifacts.length,
      },
    });
  } catch (error: any) {
    console.error("List artifacts error:", error);
    res.status(500).json({
      status: 500,
      error: {
        code: "LIST_FAILED",
        message: error.message || "Failed to list artifacts",
      },
    });
  }
});

/**
 * POST /api/jobs/:jobId/artifacts/:artifactId/pdf
 * Export artifact as PDF
 */
router.post("/:jobId/artifacts/:artifactId/pdf", (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { artifactId } = req.params;

    const artifact = svc.artifactService.getById(artifactId);
    if (!artifact) {
      return res.status(404).json({
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: `Artifact ${artifactId} not found`,
        },
      });
    }

    // Create PDF from rendered text
    const pdf = new PDFDocument();
    const stream = pdf.pipe(new PassThrough());

    // Add title
    pdf.fontSize(16).font("Helvetica-Bold").text("Resume", { underline: true });
    pdf.fontSize(12).font("Helvetica");

    // Add resume content
    pdf.text(artifact.renderedText, { align: "left" });

    pdf.end();

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="resume_v${artifact.version}.pdf"`
    );

    // Pipe PDF to response
    stream.pipe(res);

    // Handle errors
    stream.on("error", (error: Error) => {
      console.error("PDF generation error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          status: 500,
          error: {
            code: "PDF_GENERATION_FAILED",
            message: error.message,
          },
        });
      }
    });
  } catch (error: any) {
    console.error("PDF export error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        status: 500,
        error: {
          code: "PDF_EXPORT_FAILED",
          message: error.message || "Failed to export PDF",
        },
      });
    }
  }
});

export default router;
