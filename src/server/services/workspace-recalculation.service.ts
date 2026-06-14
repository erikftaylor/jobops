import { Database } from "better-sqlite3";
import type {
  CareerModel,
  ResumeScore,
  KeywordAnalysis,
  RecruiterHeatmap,
  JobFitAnalysis,
} from "../../shared/types.js";
import { ResumeScoreService } from "./resume-score.service.js";
import { KeywordAnalyzerService } from "./keyword-analyzer.service.js";
import { HeatmapAnalyzerService } from "./heatmap-analyzer.service.js";
import { FitAnalyzerService } from "./fit-analyzer.service.js";
import { ArtifactCacheService } from "./artifact-cache.service.js";

export interface RecalculationResult {
  score: ResumeScore;
  keywords: KeywordAnalysis;
  heatmap: RecruiterHeatmap;
  fit: JobFitAnalysis;
}

export interface RecalculationEvent {
  jobId: string;
  changeNodeId?: string;
  keyword?: string;
  type?: string;
  timestamp: string;
}

export interface RecalculatedEventData extends RecalculationResult {
  jobId: string;
  timestamp: string;
}

/**
 * Workspace Recalculation Service
 * Handles recalculation of all analyses when career model changes are accepted
 */
export class WorkspaceRecalculationService {
  private scoreService: ResumeScoreService;
  private keywordService: KeywordAnalyzerService;
  private heatmapService: HeatmapAnalyzerService;
  private fitService: FitAnalyzerService;
  private cacheService: ArtifactCacheService;

  constructor(db: Database) {
    this.scoreService = new ResumeScoreService();
    this.keywordService = new KeywordAnalyzerService();
    this.heatmapService = new HeatmapAnalyzerService();
    this.fitService = new FitAnalyzerService();
    this.cacheService = new ArtifactCacheService(db);
  }

  /**
   * Recalculate all analyses for a job
   * Returns all results in parallel for efficiency
   */
  async recalculateAll(
    job: any,
    careerModel: CareerModel
  ): Promise<RecalculationResult> {
    if (!job?.description) {
      throw new Error("Job must have a description for recalculation");
    }

    // Clear cache for this job before recalculation
    this.invalidateCache(job.id);

    // Convert CareerModel to resume text for keyword analysis
    const resumeText = this.careerModelToText(careerModel);

    // Run all analyses in parallel
    const [score, keywords, heatmap, fit] = await Promise.all([
      Promise.resolve(this.recalculateScore(careerModel, job.description)),
      Promise.resolve(this.recalculateKeywords(job.description, resumeText)),
      Promise.resolve(this.recalculateHeatmap(careerModel)),
      Promise.resolve(this.recalculateFit(careerModel, job.description)),
    ]);

    return {
      score,
      keywords,
      heatmap,
      fit,
    };
  }

  /**
   * Recalculate resume score
   */
  recalculateScore(careerModel: CareerModel, jobDescription: string): ResumeScore {
    return this.scoreService.calculateScore(careerModel, jobDescription);
  }

  /**
   * Recalculate keyword analysis
   */
  recalculateKeywords(jobDescription: string, resumeText: string): KeywordAnalysis {
    return this.keywordService.analyze(jobDescription, resumeText);
  }

  /**
   * Recalculate heatmap analysis
   */
  recalculateHeatmap(careerModel: CareerModel): RecruiterHeatmap {
    return this.heatmapService.analyze(careerModel);
  }

  /**
   * Recalculate job fit analysis
   */
  recalculateFit(
    careerModel: CareerModel,
    jobDescription: string
  ): JobFitAnalysis {
    return this.fitService.analyze(careerModel, jobDescription);
  }

  /**
   * Invalidate artifact cache for a job
   * Forces regeneration of artifacts with new scores
   */
  invalidateCache(jobId: string): void {
    try {
      const cleared = this.cacheService.clearJobArtifacts(jobId);
      console.log(`Cleared ${cleared} cached artifacts for job ${jobId}`);
    } catch (error) {
      console.error(`Error clearing cache for job ${jobId}:`, error);
      // Don't throw - cache clearing shouldn't block recalculation
    }
  }

  /**
   * Convert CareerModel to resume text for keyword analysis
   */
  private careerModelToText(careerModel: CareerModel): string {
    const parts = [
      careerModel.fullName,
      careerModel.sections.summary,
      (careerModel.sections.experience || [])
        .map((e) => `${e.title} ${e.description}`)
        .join(" "),
      (careerModel.sections.skills || []).join(" "),
    ];
    return parts.filter(Boolean).join(" ");
  }
}

/**
 * Factory function to create a WorkspaceRecalculationService instance
 */
export function createWorkspaceRecalculationService(
  db: Database
): WorkspaceRecalculationService {
  return new WorkspaceRecalculationService(db);
}
