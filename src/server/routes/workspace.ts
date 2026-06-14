import { Router, Request, Response } from 'express';
import { ResumeScoreService } from '../services/resume-score.service.js';
import { KeywordAnalyzerService } from '../services/keyword-analyzer.service.js';
import { HeatmapAnalyzerService } from '../services/heatmap-analyzer.service.js';
import { FitAnalyzerService } from '../services/fit-analyzer.service.js';
import { RecruiterChatService } from '../services/recruiter-chat.service.js';
import { createJobService } from '../services/job.service.js';
import { createCareerDocService } from '../services/career-doc.service.js';
import { getClaudeService } from '../services/claude.service.js';
import type { CareerModel } from '../../shared/types.js';

const router = Router();
const scoreService = new ResumeScoreService();
const keywordService = new KeywordAnalyzerService();
const heatmapService = new HeatmapAnalyzerService();
const fitService = new FitAnalyzerService();
const recruiterChatService = new RecruiterChatService(getClaudeService());
const jobService = createJobService();
const careerDocService = createCareerDocService();

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

// GET /api/workspace/:jobId - Get workspace overview
router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = jobService.getJob(jobId);

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

    // Get career document and adapt it
    const careerDocContent = careerDocService.readCareerDocument();
    const parsed = careerDocService.parseCareerDocument(careerDocContent);
    const careerModel = adaptToCareerModel(parsed);

    // Calculate score
    const score = scoreService.calculateScore(careerModel, job.description);

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
    const { jobId } = req.params;
    const job = jobService.getJob(jobId);

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

    const careerDocContent = careerDocService.readCareerDocument();
    const parsed = careerDocService.parseCareerDocument(careerDocContent);
    const careerModel = adaptToCareerModel(parsed);

    const score = scoreService.calculateScore(careerModel, job.description);

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
    const { jobId } = req.params;
    const job = jobService.getJob(jobId);

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

    const careerDocContent = careerDocService.readCareerDocument();
    const parsed = careerDocService.parseCareerDocument(careerDocContent);
    const careerModel = adaptToCareerModel(parsed);

    const resumeText = [
      careerModel.fullName,
      careerModel.sections.summary,
      careerModel.sections.experience?.map(e => `${e.title} ${e.description}`).join(' '),
      careerModel.sections.skills?.join(' '),
    ].filter(Boolean).join(' ');

    const analysis = keywordService.analyze(job.description, resumeText);

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
    const { jobId } = req.params;
    const job = jobService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    const careerDocContent = careerDocService.readCareerDocument();
    const parsed = careerDocService.parseCareerDocument(careerDocContent);
    const careerModel = adaptToCareerModel(parsed);

    const heatmap = heatmapService.analyze(careerModel);

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
    const { jobId } = req.params;
    const job = jobService.getJob(jobId);

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

    const careerDocContent = careerDocService.readCareerDocument();
    const parsed = careerDocService.parseCareerDocument(careerDocContent);
    const careerModel = adaptToCareerModel(parsed);

    const analysis = fitService.analyze(careerModel, job.description);

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
    const job = jobService.getJob(jobId);
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
    const careerDocContent = careerDocService.readCareerDocument();
    const parsed = careerDocService.parseCareerDocument(careerDocContent);
    const careerModel = adaptToCareerModel(parsed);

    // Calculate score and fit
    const score = scoreService.calculateScore(careerModel, job.description);
    const fit = fitService.analyze(careerModel, job.description);

    // Answer the question
    const answer = await recruiterChatService.answerQuestion(
      questionId,
      careerModel,
      job.description,
      score,
      fit
    );

    return res.json(answer);
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      code: 'AI_SERVICE_ERROR',
      message: 'Failed to generate response',
    });
  }
});

export default router;
