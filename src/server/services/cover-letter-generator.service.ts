import { CareerModel } from "../../shared/types.js";
import { ClaudeService } from "./claude.service.js";
import { CoverLetterPromptBuilderService } from "./cover-letter-prompt-builder.service.js";
import { ArtifactService } from "./artifact.service.js";
import {
  CoverLetterContentSchema,
  CoverLetterContent,
  CreateArtifactInput,
} from "../schemas/artifact.schema.js";
import { ZodError } from "zod";

interface FitAnalysisResult {
  positioning: string;
  strengths: string[];
  gaps: string[];
  score: number;
}

interface GenerationError {
  code:
    | "INVALID_PROFILE"
    | "GENERATION_FAILED"
    | "VALIDATION_FAILED"
    | "CONSISTENCY_FAILED"
    | "UNKNOWN";
  message: string;
  attempt?: number;
}

interface GenerationResult {
  artifact?: any;
  error?: GenerationError;
  success: boolean;
}

const RETRY_CONFIG = {
  maxAttempts: 3,
  delayMs: [1000, 2000, 4000],
};

export class CoverLetterGeneratorService {
  constructor(
    private claudeService: ClaudeService,
    private promptBuilder: CoverLetterPromptBuilderService,
    private artifactService: ArtifactService
  ) {}

  /**
   * Generate a cover letter artifact with retry logic
   */
  async generateCoverLetter(
    jobId: string,
    careerProfile: CareerModel,
    jobDescription: string,
    fitAnalysis: FitAnalysisResult
  ): Promise<GenerationResult> {
    if (!careerProfile || !careerProfile.sections.experience?.length) {
      return {
        error: {
          code: "INVALID_PROFILE",
          message: "Career profile incomplete. Must have at least one experience entry.",
        },
        success: false,
      };
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
      try {
        const prompt = this.promptBuilder.buildCoverLetterPrompt(
          careerProfile,
          jobDescription,
          fitAnalysis
        );

        const claudeResult = await Promise.race([
          this.claudeService.analyzeJobWithJSON<any>(prompt),
          this.createTimeout(30000),
        ]);

        if (!claudeResult) {
          throw new Error("Claude returned empty response");
        }

        let validated: CoverLetterContent;
        try {
          validated = CoverLetterContentSchema.parse(claudeResult);
        } catch (validationErr: any) {
          const zodError = validationErr as ZodError;
          const issues = zodError.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
          throw new Error(`JSON validation failed: ${issues}`);
        }

        this.validateCoverLetterConsistency(validated, careerProfile);

        const renderedText = this.toRenderedText(validated.coverLetter);

        const artifactInput: CreateArtifactInput = {
          jobId,
          artifactType: "cover_letter",
          careerDocVersionId: careerProfile.metadata.hash,
          promptVersion: 1,
          model: "claude-sonnet-4-20250514",
          jsonContent: validated,
          renderedText,
          positioning: validated.analysis.positioning,
          title: `Cover Letter - ${validated.analysis.positioning}`,
        };

        const artifact = this.artifactService.create(artifactInput);

        return {
          artifact,
          success: true,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < RETRY_CONFIG.maxAttempts) {
          const delayMs = RETRY_CONFIG.delayMs[attempt - 1];
          await this.sleep(delayMs);
        }
      }
    }

    return {
      error: {
        code: "GENERATION_FAILED",
        message: lastError?.message || "Cover letter generation failed after 3 attempts",
        attempt: RETRY_CONFIG.maxAttempts,
      },
      success: false,
    };
  }

  /**
   * Validate that generated cover letter is consistent with career profile
   */
  private validateCoverLetterConsistency(
    validated: CoverLetterContent,
    careerProfile: CareerModel
  ): void {
    const letterText = JSON.stringify(validated).toLowerCase();
    const companies = careerProfile.sections.experience?.map((e) => e.company.toLowerCase()) || [];
    const mentionedCompanies = companies.filter((c) => letterText.includes(c));

    if (companies.length > 0 && mentionedCompanies.length === 0) {
      console.warn("Warning: No companies from career profile mentioned in cover letter");
    }
  }

  /**
   * Convert cover letter to rendered text for display/export
   */
  private toRenderedText(coverLetter: CoverLetterContent["coverLetter"]): string {
    return [
      coverLetter.greeting,
      "",
      coverLetter.opening,
      "",
      ...coverLetter.bodyParagraphs.map((p) => [p, ""]).flat(),
      coverLetter.closing,
      "",
      coverLetter.signature,
    ]
      .join("\n")
      .trim();
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
