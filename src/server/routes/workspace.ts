import { Router, Request, Response } from 'express';
import { ResumeScoreService } from '../services/resume-score.service.js';
import { KeywordAnalyzerService } from '../services/keyword-analyzer.service.js';
import { HeatmapAnalyzerService } from '../services/heatmap-analyzer.service.js';
import { FitAnalyzerService } from '../services/fit-analyzer.service.js';
import { RecruiterChatService } from '../services/recruiter-chat.service.js';
import { createJobService } from '../services/job.service.js';
import { createCareerDocService } from '../services/career-doc.service.js';
import { getClaudeService } from '../services/claude.service.js';
import { createChangeGraphService } from '../services/change-graph.service.js';
import { createKeywordProposalService } from '../services/keyword-proposal.service.js';
import { createWorkspaceRecalculationService } from '../services/workspace-recalculation.service.js';
import { createCareerModelService } from '../services/career-model.service.js';
import { createArtifactEngineService } from '../services/artifact-engine.service.js';
import { createWorkspacePersistenceService } from '../services/workspace-persistence.service.js';
import { getClaudeService as getOutputClaudeService } from '../services/claude.service.js';
import { OutputContractService } from '../services/output-contract.service.js';
import { TemplateService } from '../services/template.service.js';
import { getDatabase } from '../db/database.js';
import { eventBus, WorkspaceEvents } from '../services/event-bus.service.js';
import type { CareerModel } from '../../shared/types.js';

const router = Router();

// Lazy initialization: services are created after database is ready
let services: {
  scoreService: ResumeScoreService;
  keywordService: KeywordAnalyzerService;
  heatmapService: HeatmapAnalyzerService;
  fitService: FitAnalyzerService;
  recruiterChatService: RecruiterChatService;
  jobService: ReturnType<typeof createJobService>;
  careerDocService: ReturnType<typeof createCareerDocService>;
  changeGraphService: ReturnType<typeof createChangeGraphService>;
  keywordProposalService: ReturnType<typeof createKeywordProposalService>;
  careerModelService: ReturnType<typeof createCareerModelService>;
  recalculationService: ReturnType<typeof createWorkspaceRecalculationService>;
  outputContractService: OutputContractService;
  templateService: TemplateService;
  artifactEngineService: ReturnType<typeof createArtifactEngineService>;
  persistenceService: ReturnType<typeof createWorkspacePersistenceService>;
} | null = null;

/**
 * Initialize workspace services after database is ready
 * Called from server startup (index.ts)
 */
export function initializeWorkspaceServices() {
  const scoreService = new ResumeScoreService();
  const keywordService = new KeywordAnalyzerService();
  const heatmapService = new HeatmapAnalyzerService();
  const fitService = new FitAnalyzerService();
  const recruiterChatService = new RecruiterChatService(getClaudeService());
  const jobService = createJobService();
  const careerDocService = createCareerDocService();

  const db = getDatabase().getConnection();
  const changeGraphService = createChangeGraphService(db);
  const keywordProposalService = createKeywordProposalService(db, changeGraphService);
  const careerModelService = createCareerModelService(db, changeGraphService);
  const recalculationService = createWorkspaceRecalculationService(db);

  const outputContractService = new OutputContractService(db);
  const templateService = new TemplateService(db);
  const artifactEngineService = createArtifactEngineService(
    db,
    getOutputClaudeService(),
    outputContractService,
    templateService,
    careerModelService
  );
  const persistenceService = createWorkspacePersistenceService(db);

  services = {
    scoreService,
    keywordService,
    heatmapService,
    fitService,
    recruiterChatService,
    jobService,
    careerDocService,
    changeGraphService,
    keywordProposalService,
    careerModelService,
    recalculationService,
    outputContractService,
    templateService,
    artifactEngineService,
    persistenceService,
  };

  // Initialize event listeners after services are set up
  initializeEventListeners();
}

/**
 * Get initialized services (throws if not initialized)
 */
function getServices() {
  if (!services) {
    throw new Error('Workspace services not initialized. Call initializeWorkspaceServices first.');
  }
  return services;
}

/**
 * Initialize event listeners for workspace events
 */
function initializeEventListeners() {
  const svc = getServices();

  // Listen for change acceptance events (from keyword acceptance or recruiter chat)
  eventBus.subscribe(
    WorkspaceEvents.CHANGE_ACCEPTED,
    async (data: any) => {
      try {
        const { jobId } = data;

        if (!jobId) {
          console.error('CHANGE_ACCEPTED event missing jobId:', data);
          return;
        }

        // Fetch the job
        const job = svc.jobService.getJob(jobId);
        if (!job) {
          console.error(`Job ${jobId} not found for recalculation`);
          return;
        }

        if (!job.description) {
          console.error(`Job ${jobId} has no description for recalculation`);
          return;
        }

        // Resolve the updated career model with all accepted changes
        const careerModel = await svc.careerModelService.resolveCareerModel({
          jobId,
        });

        // Recalculate all analyses
        const results = await svc.recalculationService.recalculateAll(job, careerModel);

        // Emit event with results for frontend to consume
        eventBus.emit('workspace:recalculated', {
          jobId,
          ...results,
          timestamp: new Date().toISOString(),
        });

        console.log(`Recalculation completed for job ${jobId}`);
      } catch (error) {
        console.error('Error in workspace recalculation:', error);

        // Emit error event so frontend can show error state
        const jobId = data?.jobId;
        if (jobId) {
          eventBus.emit('workspace:recalculation-error', {
            jobId,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  );
}

/**
 * Adapter to convert ParsedCareerDocument to simplified CareerModel for scoring services
 */
function adaptToCareerModel(parsed: any): CareerModel {
  return {
    fullName: parsed.contact?.name || 'Unknown',
    sections: {
      summary: parsed.professionalSummary || '',
      experience: (parsed.roles || []).map((role: any) => ({
        company: role.company || '',
        title: role.title || '',
        startDate: role.startDate || '',
        endDate: role.endDate || '',
        description: role.description || '',
        metrics: role.achievements || [],
      })),
      skills: [
        ...(parsed.skillsInventory?.languagesFrameworks || []),
        ...(parsed.skillsInventory?.toolsPlatforms || []),
        ...(parsed.skillsInventory?.designUX || []),
      ],
      education: (parsed.education || []).map((edu: any) => ({
        school: edu.school || '',
        degree: edu.degree || '',
        year: edu.graduatedYear || '',
      })),
    },
    metadata: {
      hash: 'current',
      source: 'master',
    },
  };
}

/**
 * Load and parse career document, converting to CareerModel
 * Consolidates repeated pattern: read → parse → adapt
 */
function loadCareerModel(): CareerModel {
  const svc = getServices();
  const careerDocContent = svc.careerDocService.readCareerDocument();
  const parsed = svc.careerDocService.parseCareerDocument(careerDocContent);
  return adaptToCareerModel(parsed);
}

// GET /api/workspace/:jobId - Get workspace overview
router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId } = req.params;
    const job = svc.jobService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    if (!job.description) {
      return res.status(400).json({
        code: 'MISSING_DESCRIPTION',
        message: 'Job description is required',
      });
    }

    // Get career model for scoring
    const careerModel = loadCareerModel();

    // Calculate score
    const score = svc.scoreService.calculateScore(careerModel, job.description);

    return res.json({
      jobId,
      jobTitle: job.title,
      score,
      workspaceUrl: `/workspace/${jobId}`,
    });
  } catch (error) {
    console.error('Error in workspace overview:', error);
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to load workspace',
    });
  }
});

// GET /api/workspace/:jobId/score - Get resume score details
router.get('/:jobId/score', async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId } = req.params;
    const job = svc.jobService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    if (!job.description) {
      return res.status(400).json({
        code: 'MISSING_DESCRIPTION',
        message: 'Job description is required',
      });
    }

    const careerModel = loadCareerModel();
    const score = svc.scoreService.calculateScore(careerModel, job.description);

    return res.json(score);
  } catch (error) {
    console.error('Error calculating score:', error);
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to calculate score',
    });
  }
});

// GET /api/workspace/:jobId/keywords - Get keyword analysis
router.get('/:jobId/keywords', async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId } = req.params;
    const job = svc.jobService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    if (!job.description) {
      return res.status(400).json({
        code: 'MISSING_DESCRIPTION',
        message: 'Job description is required',
      });
    }

    const careerModel = loadCareerModel();

    const resumeText = [
      careerModel.fullName,
      careerModel.sections.summary,
      careerModel.sections.experience?.map(e => `${e.title} ${e.description}`).join(' '),
      careerModel.sections.skills?.join(' '),
    ].filter(Boolean).join(' ');

    const analysis = svc.keywordService.analyze(job.description, resumeText);

    return res.json(analysis);
  } catch (error) {
    console.error('Error analyzing keywords:', error);
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to analyze keywords',
    });
  }
});

// GET /api/workspace/:jobId/heatmap - Get recruiter heatmap
router.get('/:jobId/heatmap', async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId } = req.params;
    const job = svc.jobService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    const careerModel = loadCareerModel();
    const heatmap = svc.heatmapService.analyze(careerModel);

    return res.json(heatmap);
  } catch (error) {
    console.error('Error analyzing heatmap:', error);
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to analyze heatmap',
    });
  }
});

// GET /api/workspace/:jobId/fit - Get job fit analysis
router.get('/:jobId/fit', async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId } = req.params;
    const job = svc.jobService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    if (!job.description) {
      return res.status(400).json({
        code: 'MISSING_DESCRIPTION',
        message: 'Job description is required',
      });
    }

    const careerModel = loadCareerModel();
    const analysis = svc.fitService.analyze(careerModel, job.description);

    return res.json(analysis);
  } catch (error) {
    console.error('Error analyzing fit:', error);
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to analyze fit',
    });
  }
});

// POST /api/workspace/:jobId/chat - Answer recruiter questions
router.post('/:jobId/chat', async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId } = req.params;
    const { questionId } = req.body;

    // Validate question ID
    const validQuestions = ['worry', 'weakest', 'interview', 'improve-first'];
    if (!questionId || !validQuestions.includes(questionId)) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: `Invalid question ID. Must be one of: ${validQuestions.join(', ')}`,
      });
    }

    // Get job
    const job = svc.jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    if (!job.description) {
      return res.status(400).json({
        code: 'MISSING_DESCRIPTION',
        message: 'Job description is required',
      });
    }

    // Get career model and calculate score and fit
    const careerModel = loadCareerModel();
    const score = svc.scoreService.calculateScore(careerModel, job.description);
    const fit = svc.fitService.analyze(careerModel, job.description);

    // Answer the question
    const answer = await svc.recruiterChatService.answerQuestion(
      questionId,
      careerModel,
      job.description,
      score,
      fit
    );

    // Save the answer to persistence
    const questionMap: Record<string, string> = {
      worry: 'What would worry a recruiter?',
      weakest: 'Where is my resume weakest?',
      interview: 'Would this likely get an interview?',
      'improve-first': 'What should I improve first?',
    };

    svc.persistenceService.saveChatAnswer(jobId, {
      questionId,
      question: questionMap[questionId] || questionId,
      answer,
    });

    return res.json(answer);
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      code: 'AI_SERVICE_ERROR',
      message: 'Failed to generate response',
    });
  }
});

// POST /api/workspace/:jobId/keywords/propose - Propose a keyword for a job
router.post('/:jobId/keywords/propose', async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId } = req.params;
    const { keyword, suggestedLanguage, target } = req.body;

    // Validate inputs
    if (!keyword || !suggestedLanguage || !target) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'keyword, suggestedLanguage, and target are required',
      });
    }

    if (!['resume', 'cover_letter', 'both'].includes(target)) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'target must be one of: resume, cover_letter, both',
      });
    }

    // Verify job exists
    const job = svc.jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    // Create proposal
    const proposal = svc.keywordProposalService.proposeKeyword(
      jobId,
      keyword,
      suggestedLanguage,
      target
    );

    return res.status(201).json(proposal);
  } catch (error) {
    console.error('Error proposing keyword:', error);
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to propose keyword',
    });
  }
});

// POST /api/workspace/:jobId/keywords/:keywordId/accept - Accept a keyword proposal
router.post('/:jobId/keywords/:keywordId/accept', async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId, keywordId } = req.params;

    // Verify job exists
    const job = svc.jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    // Get and verify proposal belongs to this job
    const proposal = svc.keywordProposalService.getProposalById(keywordId);
    if (!proposal) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Keyword proposal with id '${keywordId}' not found`,
      });
    }

    if (proposal.jobId !== jobId) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Proposal does not belong to this job',
      });
    }

    // Accept the proposal
    const accepted = svc.keywordProposalService.acceptProposal(keywordId);

    // Emit event for recalculation
    eventBus.emit(WorkspaceEvents.CHANGE_ACCEPTED, {
      jobId,
      changeNodeId: proposal.changeNodeId,
      keyword: proposal.keyword,
      timestamp: new Date().toISOString(),
    });

    return res.json(accepted);
  } catch (error) {
    console.error('Error accepting keyword:', error);
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to accept keyword',
    });
  }
});

// POST /api/workspace/:jobId/keywords/:keywordId/ignore - Ignore a keyword proposal
router.post('/:jobId/keywords/:keywordId/ignore', async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId, keywordId } = req.params;

    // Verify job exists
    const job = svc.jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    // Get and verify proposal belongs to this job
    const proposal = svc.keywordProposalService.getProposalById(keywordId);
    if (!proposal) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Keyword proposal with id '${keywordId}' not found`,
      });
    }

    if (proposal.jobId !== jobId) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Proposal does not belong to this job',
      });
    }

    // Ignore the proposal
    const ignored = svc.keywordProposalService.ignoreProposal(keywordId);

    return res.json(ignored);
  } catch (error) {
    console.error('Error ignoring keyword:', error);
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to ignore keyword',
    });
  }
});

// GET /api/workspace/:jobId/persistence - Get persisted workspace state
router.get('/:jobId/persistence', async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId } = req.params;

    // Verify job exists
    const job = svc.jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    // Get state and chat history
    const state = svc.persistenceService.getState(jobId);
    const chatHistory = svc.persistenceService.getChatHistory(jobId);

    return res.json({
      state: state || {
        jobId,
        dismissedKeywords: [],
        selectedArtifact: 'original',
      },
      chatHistory,
    });
  } catch (error) {
    console.error('Error loading persistence:', error);
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to load persistence',
    });
  }
});

// GET /api/workspace/:jobId/artifacts - Generate artifact variants
router.get('/:jobId/artifacts', async (req: Request, res: Response) => {
  try {
    const svc = getServices();
    const { jobId } = req.params;
    const job = svc.jobService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    if (!job.description) {
      return res.status(400).json({
        code: 'MISSING_DESCRIPTION',
        message: 'Job description is required',
      });
    }

    // Get career model
    const careerModel = await svc.careerModelService.resolveCareerModel({ jobId });
    if (!careerModel) {
      return res.status(400).json({
        code: 'INVALID_CAREER_MODEL',
        message: 'Cannot resolve career model',
      });
    }

    // Define artifact variants with positioning profiles
    const variantConfigs = [
      {
        type: 'original',
        positioningProfile: 'default',
        description: 'Current resume as-is',
      },
      {
        type: 'atsOptimized',
        positioningProfile: 'ats_optimized',
        description: 'Optimized for ATS parsing',
      },
      {
        type: 'executiveSummary',
        positioningProfile: 'executive',
        description: 'Executive-focused version',
      },
      {
        type: 'recruiterOptimized',
        positioningProfile: 'recruiter_optimized',
        description: 'Optimized for recruiter impact',
      },
    ];

    // Generate all variants in parallel
    const variants = await Promise.all(
      variantConfigs.map(async (config) => {
        try {
          // Generate the artifact with the positioning profile
          const artifact = await svc.artifactEngineService.generateArtifact({
            jobId,
            artifact_type: 'resume',
            variant: config.positioningProfile,
            jobDescription: job.description,
            positioningAngle: config.positioningProfile,
            careerModel,
          });

          // Calculate score for this variant
          const score = svc.scoreService.calculateScore(careerModel, job.description);

          // Extract preview text from artifact output
          const preview = extractArtifactPreview(artifact.output);

          // Determine strengths and risks
          const strengths = getVariantStrengths(config.type, score);
          const risks = getVariantRisks(config.type, score);

          return {
            type: config.type,
            description: config.description,
            artifact: artifact.output,
            score: score.total,
            strengths,
            risks,
            preview,
          };
        } catch (err) {
          console.error(`Error generating ${config.type} variant:`, err);
          // Return a minimal valid variant on error
          return {
            type: config.type,
            description: config.description,
            artifact: null,
            score: 0,
            strengths: [],
            risks: ['Failed to generate variant'],
            preview: 'Error generating preview',
          };
        }
      })
    );

    return res.json({ variants });
  } catch (error) {
    console.error('Error generating artifacts:', error);
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate artifacts',
    });
  }
});

/**
 * Extract preview text from artifact output
 */
function extractArtifactPreview(output: any): string {
  if (!output) return '';

  // Try to extract summary or professional summary
  if (output.professional_summary) {
    return output.professional_summary.substring(0, 200) + '...';
  }

  // Try to extract from title or content
  if (output.title) {
    return output.title.substring(0, 200) + '...';
  }

  // Return stringified output preview
  const str = JSON.stringify(output).substring(0, 200);
  return str + '...';
}

/**
 * Get strengths for each variant type
 */
function getVariantStrengths(type: string, _score: any): string[] {
  const baseStrengths = ['Well-formatted', 'All sections included', 'Metrics included'];

  switch (type) {
    case 'atsOptimized':
      return [...baseStrengths, 'ATS-optimized keywords', 'Machine-readable format'];
    case 'executiveSummary':
      return [...baseStrengths, 'Executive focus', 'Leadership emphasis', 'Strategic positioning'];
    case 'recruiterOptimized':
      return [...baseStrengths, 'Recruiter-friendly layout', 'Impact-driven language'];
    default:
      return baseStrengths;
  }
}

/**
 * Get risks for each variant type
 */
function getVariantRisks(type: string, score: any): string[] {
  const risks: string[] = [];

  if (score.total < 70) {
    risks.push('Low job fit - may need additional keywords');
  }

  if (score.total < 50) {
    risks.push('Significant experience gap identified');
  }

  switch (type) {
    case 'atsOptimized':
      if (score.total < 60) {
        risks.push('ATS parsing may miss important context');
      }
      break;
    case 'executiveSummary':
      risks.push('May not highlight hands-on technical skills');
      break;
  }

  return risks;
}

export default router;
