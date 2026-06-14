import "dotenv/config.js";
import express, { Request, Response, NextFunction } from "express";
import { fileURLToPath } from "url";
import { initDatabase, getDatabase } from "./db/database.js";
import { loadMasterCV, getMasterCVHealth } from "./services/cv.service.js";
import { createCareerDocService } from "./services/career-doc.service.js";
import { createSettingsService } from "./services/settings.service.js";
import { initializeClaudeService } from "./services/claude.service.js";
import jobsRouter from "./routes/jobs.js";
import settingsRouter from "./routes/settings.js";
import analysisRouter from "./routes/analysis.js";
import conversationRouter from "./routes/conversation.js";
import artifactsRouter, { initializeArtifactServices } from "./routes/artifacts.js";
import jobArtifactsRouter, { initializeJobArtifactServices } from "./routes/job-artifacts.js";
import workspaceRouter, { initializeWorkspaceServices } from "./routes/workspace.js";

fileURLToPath(import.meta.url); // Keep for potential future use

const app = express();
const PORT = process.env.SERVER_PORT || 3001;
const DATABASE_PATH = process.env.DATABASE_PATH || "./data/jobops.db";

// Middleware
app.use(express.json());
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Request logging
app.use((_req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${_req.method} ${_req.path}`);
  next();
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    code: "SERVER_ERROR",
    message: "Internal server error",
    ...(process.env.DEBUG && { detail: err.message }),
  });
});

// Routes
app.use("/api/jobs", jobsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/jobs", analysisRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/artifacts", artifactsRouter);
app.use("/api/jobs", jobArtifactsRouter);
app.use("/api/workspace", workspaceRouter);

app.get("/health", (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const dbHealth = db.health();
    const cvHealth = getMasterCVHealth();

    const apiKeyConfigured = !!process.env.ANTHROPIC_API_KEY;

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealth.connected,
        path: dbHealth.path,
        size_bytes: dbHealth.size,
      },
      master_career_document: cvHealth,
      claude_api: {
        key_configured: apiKeyConfigured,
        warning: !apiKeyConfigured ? "ANTHROPIC_API_KEY not set" : null,
      },
    });
  } catch (err: any) {
    res.status(503).json({
      status: "unhealthy",
      error: err.message,
    });
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    code: "NOT_FOUND",
    message: `Route ${_req.path} not found`,
  });
});

// Initialize and start
async function start() {
  try {
    console.log("🚀 Initializing JobOps Server...");

    // Initialize database
    console.log(`📊 Initializing database at ${DATABASE_PATH}...`);
    initDatabase({ dbPath: DATABASE_PATH });
    const db = getDatabase();
    const dbHealth = db.health();
    console.log(`✅ Database connected (${dbHealth.size} bytes)`);

    // Initialize artifact services (depends on database)
    console.log("🎨 Initializing artifact services...");
    initializeArtifactServices();
    console.log("✅ Artifact services initialized");

    // Initialize job artifact services (depends on database)
    console.log("🎯 Initializing job artifact services...");
    initializeJobArtifactServices();
    console.log("✅ Job artifact services initialized");

    // Initialize workspace services (depends on database)
    console.log("💼 Initializing workspace services...");
    initializeWorkspaceServices();
    console.log("✅ Workspace services initialized");

    // Load and version Master Career Document
    console.log("📄 Loading Master Career Document...");
    try {
      loadMasterCV();
      const careerDocService = createCareerDocService();
      const parsed = careerDocService.parseCareerDocument();
      const hash = careerDocService.saveCareerDocumentVersion(parsed);
      console.log(`✅ Master Career Document loaded (hash: ${hash.substring(0, 8)}...)`);
      if (parsed.isPlaceholder) {
        console.warn("⚠️  Career document appears to be a placeholder. Fill it in for accurate job analysis.");
      }
    } catch (err: any) {
      console.warn("⚠️  Career Document error:", err.message);
    }

    // Initialize settings
    console.log("⚙️  Initializing settings...");
    try {
      const settingsService = createSettingsService();
      settingsService.ensureDefaultSettings();
      console.log("✅ Settings initialized");
    } catch (err: any) {
      console.warn("⚠️  Settings error:", err.message);
    }

    // Initialize Claude
    console.log("🤖 Initializing Claude service...");
    try {
      const settingsService = createSettingsService();
      const settings = settingsService.getAllSettings();
      initializeClaudeService(process.env.ANTHROPIC_API_KEY, settings.modelName);

      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn("⚠️  ANTHROPIC_API_KEY not set - AI analysis features will not work");
      } else {
        console.log(`✅ Claude API configured (model: ${settings.modelName})`);
      }
    } catch (err: any) {
      console.warn("⚠️  Claude initialization warning:", err.message);
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🎯 JobOps Server running on http://localhost:${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
      console.log(`❤️  Health check: http://localhost:${PORT}/health`);
      console.log("\nReady to accept requests.");
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();

export default app;
