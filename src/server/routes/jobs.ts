import { Router, Request, Response } from "express";
import { getDatabase } from "../db/database.js";
import { createJobService } from "../services/job.service.js";
import { createMessageService } from "../services/message.service.js";
import {
  CreateJobSchema,
  UpdateJobStateSchema,
  UpdateJobSchema,
  JobState,
} from "../schemas/job.schema.js";
import { CreateMessageSchema } from "../schemas/message.schema.js";
import { ZodError } from "zod";

const router = Router();
const jobService = createJobService();
const messageService = createMessageService();

// Error handler middleware for this router
function handleZodError(res: Response, error: ZodError) {
  res.status(400).json({
    code: "VALIDATION_ERROR",
    message: "Invalid request",
    details: error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    })),
  });
}

// POST /api/jobs - Create a new job
router.post("/", (req: Request, res: Response) => {
  try {
    const input = CreateJobSchema.parse(req.body);
    const job = jobService.createJob(input);

    // Add opening message to chat
    messageService.createMessage(
      job.id,
      "assistant",
      `I've received the job description for "${job.title}" at ${job.company}. Let's analyze this opportunity.`,
      "system"
    );

    res.status(201).json({
      id: job.id,
      title: job.title,
      company: job.company,
      state: job.state,
      created_at: job.created_at,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(res, error);
    } else {
      res.status(500).json({
        code: "SERVER_ERROR",
        message: (error as Error).message,
      });
    }
  }
});

// GET /api/jobs/applications/recent - Get recent applied jobs
router.get("/applications/recent", (_req: Request, res: Response) => {
  try {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(`
      SELECT id, title, company, state, applied_at, updated_at
      FROM jobs
      WHERE state = 'applied'
      ORDER BY applied_at DESC
      LIMIT 10
    `);
    const jobs = stmt.all() as any[];

    res.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        state: job.state,
        applied_at: job.applied_at,
        updated_at: job.updated_at,
      })),
      total: jobs.length,
    });
  } catch (error) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: (error as Error).message,
    });
  }
});

// GET /api/jobs - List jobs, optionally filtered by state
router.get("/", (req: Request, res: Response) => {
  try {
    const state = req.query.state as string | undefined;

    if (state && !["draft", "analyzed", "refining", "approved", "generated", "applied", "closed"].includes(state)) {
      return res.status(400).json({
        code: "INVALID_STATE",
        message: "Invalid state filter",
      });
    }

    const jobs = jobService.listJobs(state as JobState | undefined);

    res.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        state: job.state,
        created_at: job.created_at,
      })),
      total: jobs.length,
    });
  } catch (error) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: (error as Error).message,
    });
  }
});

// GET /api/jobs/:id - Get job details
router.get("/:id", (req: Request, res: Response) => {
  try {
    const job = jobService.getJob(req.params.id);

    if (!job) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Job ${req.params.id} not found`,
      });
    }

    res.json({
      id: job.id,
      title: job.title,
      company: job.company,
      description: job.description,
      state: job.state,
      url: job.url,
      notes: job.notes,
      created_at: job.created_at,
      updated_at: job.updated_at,
    });
  } catch (error) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: (error as Error).message,
    });
  }
});

// PATCH /api/jobs/:id - Update job (title, company, url, notes)
router.patch("/:id", (req: Request, res: Response) => {
  try {
    const updates = UpdateJobSchema.parse(req.body);
    const job = jobService.updateJob(req.params.id, updates);

    res.json({
      id: job.id,
      title: job.title,
      company: job.company,
      state: job.state,
      updated_at: job.updated_at,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(res, error);
    } else if ((error as Error).message.includes("not found")) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: (error as Error).message,
      });
    } else {
      res.status(500).json({
        code: "SERVER_ERROR",
        message: (error as Error).message,
      });
    }
  }
});

// POST /api/jobs/:id/state - Transition job state
router.post("/:id/state", (req: Request, res: Response) => {
  try {
    const { newState, notes } = UpdateJobStateSchema.parse(req.body);
    const job = jobService.updateJobState(req.params.id, newState, notes);

    res.json({
      id: job.id,
      state: job.state,
      updated_at: job.updated_at,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(res, error);
    } else if ((error as Error).message.includes("not found")) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: (error as Error).message,
      });
    } else if ((error as Error).message.includes("Invalid state transition")) {
      res.status(422).json({
        code: "INVALID_STATE_TRANSITION",
        message: (error as Error).message,
      });
    } else {
      res.status(500).json({
        code: "SERVER_ERROR",
        message: (error as Error).message,
      });
    }
  }
});

// GET /api/jobs/:id/messages - Get chat messages for a job
router.get("/:id/messages", (req: Request, res: Response) => {
  try {
    const job = jobService.getJob(req.params.id);

    if (!job) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Job ${req.params.id} not found`,
      });
    }

    const messages = messageService.getJobMessages(req.params.id);

    res.json({
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        messageType: msg.message_type,
        created_at: msg.created_at,
      })),
    });
  } catch (error) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: (error as Error).message,
    });
  }
});

// POST /api/jobs/:id/messages - Send a message in job chat
router.post("/:id/messages", (req: Request, res: Response) => {
  try {
    const job = jobService.getJob(req.params.id);

    if (!job) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Job ${req.params.id} not found`,
      });
    }

    const input = CreateMessageSchema.parse(req.body);
    const message = messageService.createMessage(
      req.params.id,
      "user",
      input.content,
      input.messageType
    );

    res.status(201).json({
      id: message.id,
      content: message.content,
      created_at: message.created_at,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(res, error);
    } else if ((error as Error).message.includes("not found")) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: (error as Error).message,
      });
    } else {
      res.status(500).json({
        code: "SERVER_ERROR",
        message: (error as Error).message,
      });
    }
  }
});

// POST /api/jobs/:id/mark-applied - Mark job as applied with tracking data
router.post("/:id/mark-applied", (req: Request, res: Response) => {
  try {
    const { resumeArtifactId, coverLetterArtifactId, sourceUrl, notes } = req.body;
    const job = jobService.markApplied(req.params.id, {
      resumeArtifactId,
      coverLetterArtifactId,
      sourceUrl,
      notes,
    });

    res.json({
      id: job.id,
      state: job.state,
      applied_at: (job as any).applied_at,
      updated_at: job.updated_at,
    });
  } catch (error) {
    if ((error as Error).message.includes("not found")) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: (error as Error).message,
      });
    } else {
      res.status(500).json({
        code: "SERVER_ERROR",
        message: (error as Error).message,
      });
    }
  }
});

export default router;
