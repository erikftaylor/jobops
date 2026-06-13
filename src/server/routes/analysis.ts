import { Router, Request, Response } from "express";
import { createAnalysisService } from "../services/analysis.service.js";
import { createJobService } from "../services/job.service.js";
import { createMessageService } from "../services/message.service.js";
import { createCareerDocService } from "../services/career-doc.service.js";

const router = Router();
const analysisService = createAnalysisService();
const jobService = createJobService();
const messageService = createMessageService();
const careerDocService = createCareerDocService();

// POST /api/jobs/:id/analyze - Analyze a job
router.post("/:id/analyze", async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;

    // Validate job exists
    const job = jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Job ${jobId} not found`,
      });
    }

    if (!job.description) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Job description is required for analysis",
      });
    }

    // Get career document hash for persistence
    const careerDoc = careerDocService.getActiveCareerDocument();
    if (!careerDoc) {
      return res.status(400).json({
        code: "MISSING_CAREER_DOCUMENT",
        message:
          "Master Career Document not found. Update data/Master_Career_Document.md and restart the server.",
      });
    }
    const careerDocHash = careerDocService.computeHash(careerDoc.rawSourceText);

    // Run analysis
    let analysis;
    try {
      analysis = await analysisService.analyzeJob(jobId, job.description);
    } catch (err) {
      console.error("Analysis error:", err);
      return res.status(503).json({
        code: "ANALYSIS_FAILED",
        message: (err as Error).message,
      });
    }

    // Persist analysis
    const analysisId = await analysisService.persistAnalysis(
      jobId,
      analysis,
      careerDocHash
    );

    // Update job state to analyzed
    jobService.updateJobState(jobId, "analyzed");

    // Write findings message to chat
    const findingsMessage = analysisService.formatFindingsMessage(analysis);
    messageService.createMessage(jobId, "assistant", findingsMessage, "chat");

    // Return analysis
    res.json({
      id: analysisId,
      jobId,
      analysis,
      message: "Analysis complete. Findings posted to chat.",
    });
  } catch (err) {
    console.error("Unexpected error in analysis:", err);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: (err as Error).message,
    });
  }
});

export default router;
