import { CareerModel } from "../../shared/types.js";

interface FitAnalysisResult {
  positioning: string;
  strengths: string[];
  gaps: string[];
  score: number;
}

export class CoverLetterPromptBuilderService {
  /**
   * Build a prompt for cover letter generation based on career profile and job description
   */
  buildCoverLetterPrompt(
    careerProfile: CareerModel,
    jobDescription: string,
    fitAnalysis: FitAnalysisResult
  ): string {
    const careerText = this.formatCareerProfile(careerProfile);

    return `You are an expert cover letter writer. Your task is to generate a compelling, personalized cover letter for a specific job opportunity.

CRITICAL RULES - NEVER VIOLATE:
1. NEVER hallucinate. Use ONLY information from the provided career profile.
2. Never invent: employers, titles, dates, metrics, skills, certifications, or education.
3. If information is missing from the career profile, omit it or reference it generally.
4. Every claim about experience must match the career profile exactly.
5. Do not exaggerate or embellish any accomplishments.
6. Do not simply repeat the resume - create a narrative.
7. Output MUST be valid JSON matching the schema below.

CAREER PROFILE:
${careerText}

TARGET JOB DESCRIPTION:
${jobDescription}

POSITIONING:
${fitAnalysis.positioning}

KEY STRENGTHS TO HIGHLIGHT:
${fitAnalysis.strengths.map((s) => `- ${s}`).join("\n")}

EXPERIENCE GAPS TO ADDRESS:
${fitAnalysis.gaps.map((g) => `- ${g}`).join("\n")}

TASK:
Generate a compelling cover letter that:
1. Opens with genuine interest in this specific company and role
2. Connects 2-3 key accomplishments to the job requirements
3. Addresses any experience gaps honestly (or omits them if irrelevant)
4. Shows cultural fit with the company
5. Uses only factual information from the CAREER PROFILE
6. Maintains a professional, conversational tone
7. Is concise (3-4 paragraphs, not long)

REQUIRED JSON OUTPUT FORMAT:
{
  "analysis": {
    "positioning": "string - the positioning statement for this application",
    "keyThemes": ["array of 2-3 key themes you highlighted"],
    "companyCultureFit": "1-2 sentence explanation of cultural fit"
  },
  "coverLetter": {
    "greeting": "Greeting line (e.g., 'Dear Hiring Team,')",
    "opening": "Opening paragraph (2-3 sentences introducing interest)",
    "bodyParagraphs": [
      "First body paragraph (1 accomplishment + job requirement)",
      "Second body paragraph (1 accomplishment + job requirement)",
      "Optional third paragraph (addressing gaps or culture fit)"
    ],
    "closing": "Closing paragraph (1-2 sentences with call to action)",
    "signature": "Your name and contact information"
  }
}

Generate the cover letter now as valid JSON:`;
  }

  /**
   * Format career profile into readable text
   */
  private formatCareerProfile(careerProfile: CareerModel): string {
    let text = `NAME: ${careerProfile.fullName}\n\n`;

    if (careerProfile.sections.summary) {
      text += `PROFESSIONAL SUMMARY:\n${careerProfile.sections.summary}\n\n`;
    }

    if (careerProfile.sections.experience && careerProfile.sections.experience.length > 0) {
      text += `EXPERIENCE:\n`;
      careerProfile.sections.experience.forEach((role) => {
        text += `- ${role.title} at ${role.company}\n`;
        if (role.description) text += `  ${role.description}\n`;
      });
      text += "\n";
    }

    if (careerProfile.sections.skills && careerProfile.sections.skills.length > 0) {
      text += `SKILLS:\n${careerProfile.sections.skills.map((s) => `- ${s}`).join("\n")}\n\n`;
    }

    if (careerProfile.sections.education && careerProfile.sections.education.length > 0) {
      text += `EDUCATION:\n`;
      careerProfile.sections.education.forEach((edu) => {
        text += `- ${edu.degree || "Degree"} from ${edu.school}\n`;
      });
      text += "\n";
    }

    return text;
  }
}
