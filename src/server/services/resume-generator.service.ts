import { CareerModel } from "../../shared/types.js";
import { ClaudeService } from "./claude.service.js";
import { ResumePromptBuilderService } from "./resume-prompt-builder.service.js";
import { ArtifactService } from "./artifact.service.js";
import {
  Artifact,
  ResumeContentSchema,
  ResumeContent,
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
  artifact?: Artifact;
  error?: GenerationError;
  success: boolean;
}

const RETRY_CONFIG = {
  maxAttempts: 3,
  delayMs: [1000, 2000, 4000], // exponential backoff: 1s, 2s, 4s
};

export class ResumeGeneratorService {
  constructor(
    private claudeService: ClaudeService,
    private promptBuilder: ResumePromptBuilderService,
    private artifactService: ArtifactService
  ) {}

  /**
   * Generate a resume artifact with retry logic
   */
  async generateResume(
    jobId: string,
    careerProfile: CareerModel,
    jobDescription: string,
    fitAnalysis: FitAnalysisResult
  ): Promise<GenerationResult> {
    // Validate career profile
    if (!careerProfile || !careerProfile.sections.experience?.length) {
      return {
        error: {
          code: "INVALID_PROFILE",
          message: "Career profile incomplete. Must have at least one experience entry.",
        },
        success: false,
      };
    }

    // Attempt generation with retry logic
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
      try {
        // Build prompt
        const prompt = this.promptBuilder.buildResumePrompt(
          careerProfile,
          jobDescription,
          fitAnalysis
        );

        // Call Claude with timeout
        const claudeResult = await Promise.race([
          this.claudeService.analyzeJobWithJSON<any>(prompt),
          this.createTimeout(30000),
        ]);

        if (!claudeResult) {
          throw new Error("Claude returned empty response");
        }

        // Validate against schema
        let validated: ResumeContent;
        try {
          validated = ResumeContentSchema.parse(claudeResult);
        } catch (validationErr: any) {
          const zodError = validationErr as ZodError;
          const issues = zodError.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
          throw new Error(`JSON validation failed: ${issues}`);
        }

        // Source-consistency validation
        this.validateSourceConsistency(validated, careerProfile);

        // Convert to rendered text
        const renderedText = this.toRenderedText(validated.resume);

        // Persist artifact
        const artifactInput: CreateArtifactInput = {
          jobId,
          artifactType: "resume",
          careerDocVersionId: careerProfile.metadata.hash,
          promptVersion: 1,
          model: "claude-sonnet-4-20250514",
          jsonContent: validated,
          renderedText,
          positioning: validated.analysis.positioning,
          title: `Resume - ${validated.analysis.positioning}`,
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
        message: lastError?.message || "Resume generation failed after 3 attempts",
        attempt: RETRY_CONFIG.maxAttempts,
      },
      success: false,
    };
  }

  /**
   * Validate that generated content is consistent with career profile
   * This catches obvious hallucinations but doesn't guarantee perfection
   */
  private validateSourceConsistency(content: ResumeContent, careerProfile: CareerModel): void {
    const careerText = this.formatCareerForValidation(careerProfile);

    // Check companies - all company names should be in career profile
    for (const role of content.resume.experience) {
      const companyLower = role.company.toLowerCase();
      if (!careerText.toLowerCase().includes(companyLower)) {
        throw new Error(`Hallucinated company: "${role.company}" not found in career profile`);
      }
    }

    // Check skills - high-priority keywords should be in career profile
    if (careerProfile.sections.skills) {
      const profileSkillsLower = new Set(
        careerProfile.sections.skills.map((s) => s.toLowerCase())
      );

      for (const skill of content.resume.coreSkills) {
        const skillLower = skill.toLowerCase();
        // Allow partial matches (e.g., "React" matches "ReactJS")
        const hasMatch = Array.from(profileSkillsLower).some(
          (ps) => skillLower.includes(ps) || ps.includes(skillLower)
        );

        if (!hasMatch) {
          throw new Error(
            `Hallucinated skill: "${skill}" not found in career profile. Ensure all skills come from the provided career profile.`
          );
        }
      }
    }

    // Check education - all schools should be in career profile
    if (careerProfile.sections.education) {
      const profileSchools = new Set(
        careerProfile.sections.education.map((e) => e.school.toLowerCase())
      );

      for (const edu of content.resume.education) {
        if (!profileSchools.has(edu.school.toLowerCase())) {
          throw new Error(`Hallucinated school: "${edu.school}" not found in career profile`);
        }
      }
    }
  }

  /**
   * Format career profile for validation checks
   */
  private formatCareerForValidation(careerProfile: CareerModel): string {
    let text = "";

    if (careerProfile.sections.experience) {
      text += careerProfile.sections.experience
        .map((e) => `${e.company} ${e.title} ${e.description || ""}`)
        .join(" ");
    }

    if (careerProfile.sections.skills) {
      text += " " + careerProfile.sections.skills.join(" ");
    }

    if (careerProfile.sections.education) {
      text += " " + careerProfile.sections.education.map((e) => e.school).join(" ");
    }

    return text;
  }

  /**
   * Convert structured resume to rendered text format
   */
  private toRenderedText(resume: ResumeContent["resume"]): string {
    let text = "";

    // Professional Summary
    text += "PROFESSIONAL SUMMARY\n";
    text += resume.professionalSummary + "\n\n";

    // Core Skills
    text += "CORE SKILLS\n";
    resume.coreSkills.forEach((skill) => {
      text += `• ${skill}\n`;
    });
    text += "\n";

    // Experience
    text += "EXPERIENCE\n";
    resume.experience.forEach((role) => {
      text += `${role.title} at ${role.company}\n`;
      if (role.dates) {
        text += `${role.dates}\n`;
      }
      if (role.description) {
        text += `${role.description}\n`;
      }
      if (role.bullets) {
        role.bullets.forEach((bullet) => {
          text += `• ${bullet}\n`;
        });
      }
      text += "\n";
    });

    // Education
    if (resume.education && resume.education.length > 0) {
      text += "EDUCATION\n";
      resume.education.forEach((edu) => {
        text += `${edu.degree} from ${edu.school}`;
        if (edu.year) {
          text += ` (${edu.year})`;
        }
        text += "\n";
      });
    }

    return text;
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createResumeGeneratorService(
  claudeService: ClaudeService,
  promptBuilder: ResumePromptBuilderService,
  artifactService: ArtifactService
): ResumeGeneratorService {
  return new ResumeGeneratorService(claudeService, promptBuilder, artifactService);
}
