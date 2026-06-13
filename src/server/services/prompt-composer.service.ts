import { CareerModel } from "../../shared/types.js";

interface PromptComposerContext {
  artifact_type: "resume" | "cover_letter" | "linkedin" | "bio";
  career_model: CareerModel;
  job_description: string;
  positioning_angle?: string;
  template?: string;
  variant?: string;
}

interface ResumePromptContext extends PromptComposerContext {
  artifact_type: "resume";
  variant?: "ats_optimized" | "creative" | "technical" | "leadership";
}

interface CoverLetterPromptContext extends PromptComposerContext {
  artifact_type: "cover_letter";
}

/**
 * Modular prompt composer service for building AI prompts
 * Uses static methods for reusability and composability
 */
export class PromptComposerService {
  /**
   * Compose a generic artifact prompt
   */
  static composeArtifactPrompt(context: PromptComposerContext): string {
    const sections: string[] = [];

    // System section
    const system = this.systemSection(context.artifact_type);
    if (system) sections.push(system);

    // Career model section
    const careerModel = this.careerModelSection(context.career_model);
    if (careerModel) sections.push(careerModel);

    // Job context
    const jobCtx = this.jobContext(context.job_description);
    if (jobCtx) sections.push(jobCtx);

    // Positioning section
    if (context.positioning_angle) {
      const positioning = this.positioningSection(context.positioning_angle);
      if (positioning) sections.push(positioning);
    }

    // Template section
    if (context.template) {
      const template = this.templateSection(context.template);
      if (template) sections.push(template);
    }

    // Generation instructions
    const instructions = this.generationInstructions(context.artifact_type);
    if (instructions) sections.push(instructions);

    // Output contract
    const contract = this.outputContractSection(context.artifact_type);
    if (contract) sections.push(contract);

    return sections.filter((s) => s.length > 0).join("\n\n");
  }

  /**
   * Compose a resume-specific prompt with variant handling
   */
  static composeResumePrompt(context: ResumePromptContext): string {
    const sections: string[] = [];

    // System section
    const system = this.systemSection(context.artifact_type);
    if (system) sections.push(system);

    // Career model section
    const careerModel = this.careerModelSection(context.career_model);
    if (careerModel) sections.push(careerModel);

    // Job context
    const jobCtx = this.jobContext(context.job_description);
    if (jobCtx) sections.push(jobCtx);

    // Positioning section
    if (context.positioning_angle) {
      const positioning = this.positioningSection(context.positioning_angle);
      if (positioning) sections.push(positioning);
    }

    // Template section
    if (context.template) {
      const template = this.templateSection(context.template);
      if (template) sections.push(template);
    }

    // Resume-specific instructions with variant
    const instructions = this.resumeInstructions(context.variant);
    if (instructions) sections.push(instructions);

    // Output contract for resume
    const contract = this.resumeJsonContract();
    if (contract) sections.push(contract);

    return sections.filter((s) => s.length > 0).join("\n\n");
  }

  /**
   * Compose a cover letter-specific prompt
   */
  static composeCoverLetterPrompt(context: CoverLetterPromptContext): string {
    const sections: string[] = [];

    // System section
    const system = this.systemSection(context.artifact_type);
    if (system) sections.push(system);

    // Career model section
    const careerModel = this.careerModelSection(context.career_model);
    if (careerModel) sections.push(careerModel);

    // Job context
    const jobCtx = this.jobContext(context.job_description);
    if (jobCtx) sections.push(jobCtx);

    // Positioning section
    if (context.positioning_angle) {
      const positioning = this.positioningSection(context.positioning_angle);
      if (positioning) sections.push(positioning);
    }

    // Template section
    if (context.template) {
      const template = this.templateSection(context.template);
      if (template) sections.push(template);
    }

    // Cover letter-specific instructions
    const instructions = this.coverLetterInstructions();
    if (instructions) sections.push(instructions);

    // Output contract for cover letter
    const contract = this.coverLetterJsonContract();
    if (contract) sections.push(contract);

    return sections.filter((s) => s.length > 0).join("\n\n");
  }

  // ============ Private Section Builders ============

  /**
   * System section describing the AI's role
   */
  private static systemSection(artifact_type: string): string {
    const roles: Record<string, string> = {
      resume:
        "You are an expert resume writer and career coach. Your task is to generate a compelling, ATS-optimized resume tailored to the target job. Focus on relevant achievements, quantifiable results, and clear communication of skills and experience.",
      cover_letter:
        "You are a professional cover letter writer. Your task is to generate a compelling cover letter that tells a compelling narrative, demonstrates genuine interest in the role, and connects the candidate's experience to the company's needs.",
      linkedin:
        "You are a LinkedIn profile optimization expert. Your task is to generate a compelling LinkedIn profile summary and headline that positions the candidate effectively and attracts recruiter attention.",
      bio: "You are a professional biographer. Your task is to generate a concise, impactful professional biography that positions the candidate as an authority in their field.",
    };

    return `# Role Definition

${roles[artifact_type] || roles.resume}`;
  }

  /**
   * Career model section with parsed data
   */
  private static careerModelSection(model: CareerModel): string {
    try {
      const content = JSON.parse(model.content);
      return `# Candidate Career Profile

The following is the candidate's career information based on their master career document:

\`\`\`json
${JSON.stringify(content, null, 2)}
\`\`\`

Metadata:
${JSON.stringify(model.metadata || {}, null, 2)}`;
    } catch (err) {
      return `# Candidate Career Profile

Career model hash: ${model.hash}
Created: ${model.created_at}`;
    }
  }

  /**
   * Job context section
   */
  private static jobContext(jobDescription: string): string {
    return `# Target Job Description

\`\`\`
${jobDescription}
\`\`\``;
  }

  /**
   * Positioning angle section
   */
  private static positioningSection(angle: string): string {
    return `# Positioning Angle

Apply this positioning strategy to highlight the candidate's fit:

${angle}`;
  }

  /**
   * Template section for artifact structure
   */
  private static templateSection(template: string): string {
    return `# Template / Format Guide

Use this template structure as a guide:

\`\`\`
${template}
\`\`\``;
  }

  /**
   * Generation instructions for artifact type
   */
  private static generationInstructions(artifact_type: string): string {
    const instructions: Record<string, string> = {
      resume: `# Generation Instructions for Resume

1. Extract the most relevant experience, skills, and achievements from the career profile
2. Customize content to match the job description requirements
3. Use action verbs and quantifiable metrics throughout
4. Organize experience in reverse chronological order
5. Ensure ATS compatibility by avoiding complex formatting
6. Keep total length to 1 page (or 2 pages max for senior roles)
7. Highlight transferable skills and relevant accomplishments
8. Include key technical skills and tools relevant to the role`,

      cover_letter: `# Generation Instructions for Cover Letter

1. Create a compelling narrative that connects experience to the role
2. Address the specific company and role (demonstrate research)
3. Highlight 2-3 key accomplishments or experiences relevant to the job
4. Show genuine interest and enthusiasm for the opportunity
5. Address potential concerns or gaps proactively if needed
6. Use a professional, warm, and authentic tone
7. Keep to 3-4 paragraphs (max 400 words)
8. Include a strong closing call-to-action`,

      linkedin: `# Generation Instructions for LinkedIn Profile

1. Create a compelling headline that includes key skills and value proposition
2. Write a professional summary (about section) that tells the career story
3. Highlight key accomplishments and areas of expertise
4. Include relevant keywords for searchability
5. Use a professional but personable tone
6. Aim for 2-3 short paragraphs in the summary`,

      bio: `# Generation Instructions for Professional Biography

1. Create a concise, impactful biography (50-150 words)
2. Highlight key accomplishments and areas of expertise
3. Use third-person professional voice
4. Include relevant credentials and specializations
5. Position the candidate as an authority in their field`,
    };

    return instructions[artifact_type] || instructions.resume;
  }

  /**
   * Resume-specific instructions with variant handling
   */
  private static resumeInstructions(variant?: string): string {
    const baseInstructions = `# Resume Generation Instructions

1. Extract the most relevant experience, skills, and achievements from the career profile
2. Customize content to match the job description requirements
3. Use action verbs and quantifiable metrics throughout
4. Organize experience in reverse chronological order
5. Ensure ATS compatibility by avoiding complex formatting
6. Keep total length to 1 page (or 2 pages max for senior roles)
7. Highlight transferable skills and relevant accomplishments
8. Include key technical skills and tools relevant to the role`;

    if (!variant) {
      return baseInstructions;
    }

    const variantInstructions: Record<string, string> = {
      ats_optimized: `${baseInstructions}

## ATS Optimization Variant
- Prioritize keyword matching with job description
- Use standard section headers (Experience, Education, Skills)
- Avoid tables, columns, graphics, and special formatting
- Include both hard and soft skills
- Use full company names instead of abbreviations where possible
- Incorporate relevant acronyms naturally`,

      creative: `${baseInstructions}

## Creative Variant
- Use compelling language and storytelling
- Highlight unique value propositions and differentiators
- Include brief context for career transitions or gaps
- Use professional but engaging tone
- Show personality while maintaining professionalism`,

      technical: `${baseInstructions}

## Technical Variant
- Emphasize technical skills, tools, and technologies
- Include specific technical accomplishments and metrics
- Highlight certifications and technical education
- Detail programming languages, frameworks, and platforms
- Include relevant open source contributions or projects`,

      leadership: `${baseInstructions}

## Leadership Variant
- Emphasize leadership roles and team management experience
- Highlight strategic initiatives and business impact
- Include team size managed and organizational scope
- Focus on achievements that demonstrate leadership qualities
- Detail mentoring and development of team members`,
    };

    return variantInstructions[variant] || baseInstructions;
  }

  /**
   * Cover letter-specific instructions
   */
  private static coverLetterInstructions(): string {
    return `# Cover Letter Generation Instructions

1. Create a compelling narrative that connects experience to the role
2. Address the specific company and role (demonstrate research)
3. Highlight 2-3 key accomplishments or experiences relevant to the job
4. Show genuine interest and enthusiasm for the opportunity
5. Address potential concerns or gaps proactively if needed
6. Use a professional, warm, and authentic tone
7. Keep to 3-4 paragraphs (max 400 words)
8. Include a strong closing call-to-action

## Structure
- **Opening paragraph:** Address the role and express interest
- **Body paragraphs:** Connect experience to job requirements
- **Closing paragraph:** Reiterate interest and call to action`;
  }

  /**
   * Output contract section for validation
   */
  private static outputContractSection(artifact_type: string): string {
    if (artifact_type === "resume") {
      return this.resumeJsonContract();
    } else if (artifact_type === "cover_letter") {
      return this.coverLetterJsonContract();
    }

    return "";
  }

  /**
   * JSON contract for resume output
   */
  private static resumeJsonContract(): string {
    return `# Output Contract - Resume JSON Schema

Return the generated resume as a valid JSON object matching this schema:

\`\`\`json
{
  "type": "object",
  "properties": {
    "header": {
      "type": "string",
      "description": "Name and professional title"
    },
    "contact": {
      "type": "object",
      "properties": {
        "email": { "type": "string" },
        "phone": { "type": "string" },
        "linkedin": { "type": "string" },
        "website": { "type": "string" }
      }
    },
    "summary": {
      "type": "string",
      "description": "Professional summary (2-3 sentences)"
    },
    "experience": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "company": { "type": "string" },
          "title": { "type": "string" },
          "duration": { "type": "string" },
          "description": { "type": "string" },
          "achievements": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    },
    "education": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "school": { "type": "string" },
          "degree": { "type": "string" },
          "field": { "type": "string" },
          "year": { "type": "string" }
        }
      }
    },
    "skills": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["header", "contact", "summary", "experience", "education", "skills"]
}
\`\`\``;
  }

  /**
   * JSON contract for cover letter output
   */
  private static coverLetterJsonContract(): string {
    return `# Output Contract - Cover Letter JSON Schema

Return the generated cover letter as a valid JSON object matching this schema:

\`\`\`json
{
  "type": "object",
  "properties": {
    "header": {
      "type": "string",
      "description": "Sender contact information"
    },
    "date": {
      "type": "string",
      "description": "Letter date (YYYY-MM-DD format)"
    },
    "recipient": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "title": { "type": "string" },
        "company": { "type": "string" },
        "address": { "type": "string" }
      }
    },
    "greeting": {
      "type": "string",
      "description": "Salutation (e.g., 'Dear [Name]')"
    },
    "body": {
      "type": "string",
      "description": "Main letter content (3-4 paragraphs)"
    },
    "closing": {
      "type": "string",
      "description": "Sign-off and signature"
    },
    "subject_line": {
      "type": "string",
      "description": "Optional subject line"
    }
  },
  "required": ["header", "date", "recipient", "greeting", "body", "closing"]
}
\`\`\``;
  }

  /**
   * Get JSON schema for artifact type
   */
  static getJsonSchema(artifact_type: string): Record<string, any> {
    const schemas: Record<string, any> = {
      resume: {
        type: "object",
        properties: {
          header: { type: "string" },
          contact: {
            type: "object",
            properties: {
              email: { type: "string" },
              phone: { type: "string" },
              linkedin: { type: "string" },
              website: { type: "string" },
            },
          },
          summary: { type: "string" },
          experience: {
            type: "array",
            items: {
              type: "object",
              properties: {
                company: { type: "string" },
                title: { type: "string" },
                duration: { type: "string" },
                description: { type: "string" },
                achievements: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
          education: {
            type: "array",
            items: {
              type: "object",
              properties: {
                school: { type: "string" },
                degree: { type: "string" },
                field: { type: "string" },
                year: { type: "string" },
              },
            },
          },
          skills: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["header", "contact", "summary", "experience", "education", "skills"],
      },
      cover_letter: {
        type: "object",
        properties: {
          header: { type: "string" },
          date: { type: "string" },
          recipient: {
            type: "object",
            properties: {
              name: { type: "string" },
              title: { type: "string" },
              company: { type: "string" },
              address: { type: "string" },
            },
          },
          greeting: { type: "string" },
          body: { type: "string" },
          closing: { type: "string" },
          subject_line: { type: "string" },
        },
        required: ["header", "date", "recipient", "greeting", "body", "closing"],
      },
    };

    return schemas[artifact_type] || schemas.resume;
  }
}

/**
 * Factory function to create a PromptComposerService instance
 */
export function createPromptComposerService(): PromptComposerService {
  return PromptComposerService;
}
