import { Router, Request, Response } from "express";
import { createSettingsService } from "../services/settings.service.js";
import { createCareerDocService } from "../services/career-doc.service.js";
import fs from "fs";
import { ZodError } from "zod";
import { z } from "zod";

const router = Router();
const settingsService = createSettingsService();
const careerDocService = createCareerDocService();

// Validation schemas
const UpdateSettingsSchema = z.object({
  autoProceedThreshold: z.number().min(0).max(100).optional(),
  minimumFloorThreshold: z.number().min(0).max(100).optional(),
  modelName: z.string().optional(),
  outputDirectory: z.string().optional(),
});

const PendingAdditionSchema = z.object({
  type: z.enum(["skill", "experience", "project", "achievement"]),
  content: z.string().min(5, "Content must be at least 5 characters"),
});

// GET /api/settings
router.get("/", (_req: Request, res: Response) => {
  try {
    const settings = settingsService.getAllSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: (error as Error).message,
    });
  }
});

// PATCH /api/settings
router.patch("/", (req: Request, res: Response) => {
  try {
    const updates = UpdateSettingsSchema.parse(req.body);
    const settings = settingsService.getAllSettings();

    // Update each provided setting
    if (updates.autoProceedThreshold !== undefined) {
      settingsService.updateThreshold(
        "auto_proceed_threshold",
        updates.autoProceedThreshold
      );
      settings.autoProceedThreshold = updates.autoProceedThreshold;
    }

    if (updates.minimumFloorThreshold !== undefined) {
      settingsService.updateThreshold(
        "minimum_floor_threshold",
        updates.minimumFloorThreshold
      );
      settings.minimumFloorThreshold = updates.minimumFloorThreshold;
    }

    if (updates.modelName !== undefined) {
      settingsService.updateModelName(updates.modelName);
      settings.modelName = updates.modelName;
    }

    if (updates.outputDirectory !== undefined) {
      settingsService.updateOutputDirectory(updates.outputDirectory);
      settings.outputDirectory = updates.outputDirectory;
    }

    res.json(settings);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    } else {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: (error as Error).message,
      });
    }
  }
});

// GET /api/career-document
router.get("/career-document", (_req: Request, res: Response) => {
  try {
    const parsed = careerDocService.getActiveCareerDocument();

    if (!parsed) {
      // Return empty/placeholder state
      const rawContent = careerDocService.readCareerDocument();
      const parsed = careerDocService.parseCareerDocument(rawContent);
      return res.json({
        ...parsed,
        hash: careerDocService.computeHash(rawContent),
      });
    }

    res.json({
      ...parsed,
      hash: careerDocService.computeHash(parsed.rawSourceText),
    });
  } catch (error) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: (error as Error).message,
    });
  }
});

// GET /api/config/angles
router.get("/config/angles", (_req: Request, res: Response) => {
  try {
    const anglesPath = "./config/angles.json";
    const content = fs.readFileSync(anglesPath, "utf-8");
    const angles = JSON.parse(content);
    res.json(angles);
  } catch (error) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: "Failed to load positioning angles configuration",
    });
  }
});

// POST /api/settings/pending-addition
router.post("/pending-addition", (req: Request, res: Response) => {
  try {
    const input = PendingAdditionSchema.parse(req.body);
    careerDocService.appendPendingAddition(input.type, input.content);

    res.status(201).json({
      message: `Added to pending ${input.type}s`,
      type: input.type,
      content: input.content,
      addedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
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
