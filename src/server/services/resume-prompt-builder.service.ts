import { CareerModel } from "../../shared/types.js";

interface FitAnalysisResult {
  positioning: string;
  strengths: string[];
  gaps: string[];
  score: number;
}

export class ResumePromptBuilderService {
  /**
   * Build a prompt for resume generation based on career profile and job description
   */
  buildResumePrompt(
    careerProfile: CareerModel,
    jobDescription: string,
    fitAnalysis: FitAnalysisResult
  ): string {
    const careerText = this.formatCareerProfile(careerProfile);

    return `You are an expert resume writer. Your task is to generate a tailored resume for a specific job opportunity.

CRITICAL RULES - NEVER VIOLATE:
1. NEVER hallucinate. Use ONLY information from the provided career profile.
2. Never invent: employers, titles, dates, metrics, skills, certifications, or education.
3. If information is missing from the career profile, omit it from the resume.
4. Every company, title, date, and achievement must match the career profile exactly.
5. Do not exaggerate or embellish any accomplishments.
6. Output MUST be valid JSON matching the schema below.

CAREER PROFILE:
${careerText}

TARGET JOB DESCRIPTION:
${jobDescription}

POSITIONING:
${fitAnalysis.positioning}

KEY STRENGTHS TO HIGHLIGHT:
${fitAnalysis.strengths.map((s) => `- ${s}`).join("\n")}

IDENTIFIED GAPS:
${fitAnalysis.gaps.map((g) => `- ${g}`).join("\n")}

TASK:
Generate a tailored resume that:
1. Matches the POSITIONING provided
2. Highlights the KEY STRENGTHS
3. Uses only factual information from the CAREER PROFILE
4. Emphasizes experience and skills relevant to the TARGET JOB
5. Maintains chronological accuracy for all dates and roles
6. Uses professional language and ATS-friendly formatting

REQUIRED JSON OUTPUT FORMAT:
{
  "analysis": {
    "positioning": "string - the positioning statement",
    "highPriorityKeywords": ["array of key skills/terms for ATS"],
    "strengthsToHighlight": ["array of strength bullets"]
  },
  "resume": {
    "professionalSummary": "2-3 sentence summary highlighting fit for the role",
    "coreSkills": ["array of relevant technical and soft skills"],
    "experience": [
      {
        "title": "Job Title",
        "company": "Company Name",
        "dates": "Start Date - End Date or Present",
        "description": "Brief role description",
        "bullets": ["Achievement 1", "Achievement 2"]
      }
    ],
    "education": [
      {
        "school": "School Name",
        "degree": "Degree Type",
        "year": "Graduation Year (optional)"
      }
    ]
  }
}

Generate the resume now as valid JSON:`;
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
        text += `  Dates: ${role.startDate} to ${role.endDate}\n`;
        if (role.description) {
          text += `  Description: ${role.description}\n`;
        }
        if (role.metrics && role.metrics.length > 0) {
          text += `  Metrics: ${role.metrics.join(", ")}\n`;
        }
      });
      text += `\n`;
    }

    if (careerProfile.sections.skills && careerProfile.sections.skills.length > 0) {
      text += `SKILLS:\n${careerProfile.sections.skills.map((s) => `- ${s}`).join("\n")}\n\n`;
    }

    if (careerProfile.sections.education && careerProfile.sections.education.length > 0) {
      text += `EDUCATION:\n`;
      careerProfile.sections.education.forEach((edu) => {
        text += `- ${edu.degree} from ${edu.school}`;
        if (edu.year) {
          text += ` (${edu.year})`;
        }
        text += `\n`;
      });
      text += `\n`;
    }

    return text;
  }
}

export function createResumePromptBuilderService(): ResumePromptBuilderService {
  return new ResumePromptBuilderService();
}
