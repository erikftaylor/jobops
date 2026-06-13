import { Router, Request, Response } from "express";
import { createConversationService } from "../services/conversation.service.js";
import { createAnalyticsService } from "../services/analytics.service.js";
import { createJobService } from "../services/job.service.js";
import { z } from "zod";

const router = Router();
const conversationService = createConversationService();
const analyticsService = createAnalyticsService();
const jobService = createJobService();

// Validation schemas
const StartConversationSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
  analysisId: z.string().min(1, "analysisId is required"),
});

const AddMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(10000),
  messageType: z
    .enum(["chat", "question", "suggestion", "confirmation"])
    .optional(),
});

const AcceptChangeSchema = z.object({
  changeSetId: z.string().min(1, "changeSetId is required"),
});

const RejectChangeSchema = z.object({
  changeSetId: z.string().min(1, "changeSetId is required"),
  note: z.string().optional(),
});

const ModifyChangeSchema = z.object({
  changeSetId: z.string().min(1, "changeSetId is required"),
  modifiedText: z.string().min(1, "modifiedText is required"),
});

// POST /api/conversations/start - Start new conversation
router.post("/start", async (req: Request, res: Response) => {
  try {
    const validation = StartConversationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        errors: validation.error.errors,
      });
    }

    const { jobId, analysisId } = validation.data;

    // Validate job exists
    const job = jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Job ${jobId} not found`,
      });
    }

    // Start conversation
    const conversation = conversationService.startConversation({
      jobId,
      analysisId,
    });

    // Log analytics event
    analyticsService.logEvent({
      jobId,
      eventType: "analysis_started",
      conversationId: conversation.id,
    });

    res.status(201).json({
      id: conversation.id,
      jobId: conversation.job_id,
      analysisId: conversation.analysis_id,
      status: conversation.status,
      createdAt: conversation.created_at,
    });
  } catch (err) {
    console.error("Error starting conversation:", err);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: (err as Error).message,
    });
  }
});

// GET /api/conversations/:id - Get conversation with messages and pending changes
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;

    const conversation = conversationService.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Conversation ${conversationId} not found`,
      });
    }

    const messages = conversationService.getConversationMessages(conversationId);
    const pendingChanges = conversationService.getPendingChangeSets(conversationId);

    res.json({
      id: conversation.id,
      jobId: conversation.job_id,
      analysisId: conversation.analysis_id,
      status: conversation.status,
      memory: conversation.memory,
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        messageType: msg.message_type,
        createdAt: msg.created_at,
      })),
      pendingChanges: pendingChanges.map((change) => ({
        id: change.id,
        sectionType: change.section_type,
        location: change.location,
        originalText: change.original_text,
        proposedText: change.proposed_text,
        reasoning: change.reasoning,
        businessImpact: change.business_impact,
        confidence: change.confidence,
        status: change.status,
        createdAt: change.created_at,
      })),
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
    });
  } catch (err) {
    console.error("Error getting conversation:", err);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: (err as Error).message,
    });
  }
});

// POST /api/conversations/:id/message - Add message to conversation
router.post("/:id/message", async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const validation = AddMessageSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        errors: validation.error.errors,
      });
    }

    const conversation = conversationService.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Conversation ${conversationId} not found`,
      });
    }

    const message = conversationService.addUserMessage(
      conversationId,
      {
        content: validation.data.content,
      }
    );

    res.status(201).json({
      id: message.id,
      role: message.role,
      content: message.content,
      messageType: message.message_type,
      createdAt: message.created_at,
    });
  } catch (err) {
    console.error("Error adding message:", err);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: (err as Error).message,
    });
  }
});

// POST /api/conversations/:id/accept-change - Accept change
router.post("/:id/accept-change", async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const validation = AcceptChangeSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        errors: validation.error.errors,
      });
    }

    const conversation = conversationService.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Conversation ${conversationId} not found`,
      });
    }

    const { changeSetId } = validation.data;

    conversationService.acceptChange(
      conversationId,
      changeSetId,
      conversation.job_id
    );

    // Log analytics event
    analyticsService.logEvent({
      jobId: conversation.job_id,
      conversationId,
      eventType: "recommendation_accepted",
      details: { changeSetId },
    });

    res.json({
      success: true,
      message: "Change accepted",
      changeSetId,
    });
  } catch (err) {
    console.error("Error accepting change:", err);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: (err as Error).message,
    });
  }
});

// POST /api/conversations/:id/reject-change - Reject change
router.post("/:id/reject-change", async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const validation = RejectChangeSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        errors: validation.error.errors,
      });
    }

    const conversation = conversationService.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Conversation ${conversationId} not found`,
      });
    }

    const { changeSetId, note } = validation.data;

    conversationService.rejectChange(conversationId, changeSetId, note);

    // Log analytics event
    analyticsService.logEvent({
      jobId: conversation.job_id,
      conversationId,
      eventType: "recommendation_rejected",
      details: { changeSetId, note },
    });

    res.json({
      success: true,
      message: "Change rejected",
      changeSetId,
    });
  } catch (err) {
    console.error("Error rejecting change:", err);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: (err as Error).message,
    });
  }
});

// POST /api/conversations/:id/modify-change - Modify change
router.post("/:id/modify-change", async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const validation = ModifyChangeSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        errors: validation.error.errors,
      });
    }

    const conversation = conversationService.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Conversation ${conversationId} not found`,
      });
    }

    const { changeSetId, modifiedText } = validation.data;

    const modifiedChange = conversationService.modifyChange(
      conversationId,
      changeSetId,
      { modifiedText }
    );

    // Log analytics event
    analyticsService.logEvent({
      jobId: conversation.job_id,
      conversationId,
      eventType: "conversation_modified",
      details: { changeSetId, modifiedText },
    });

    res.json({
      success: true,
      message: "Change modified",
      change: {
        id: modifiedChange.id,
        status: modifiedChange.status,
        proposedText: modifiedChange.proposed_text,
      },
    });
  } catch (err) {
    console.error("Error modifying change:", err);
    res.status(500).json({
      code: "SERVER_ERROR",
      message: (err as Error).message,
    });
  }
});

export default router;
