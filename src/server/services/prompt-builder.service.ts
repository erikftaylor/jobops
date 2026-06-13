// Prompt builder service - no external service dependencies needed for prompt composition

interface ConversationContext {
  jobDescription: string;
  careerDocJSON: string;
  conversationHistory: Array<{ role: string; content: string }>;
  userPreferences?: Record<string, any>;
}

interface RefinementContext extends ConversationContext {
  sectionType: string;
  originalText: string;
  proposedText: string;
}

interface FollowUpContext extends ConversationContext {
  analysisFindings: string;
  recentMessages?: Array<{ role: string; content: string }>;
}

export class PromptBuilder {

  private buildSystemSection(): string {
    return `You are a career advisor and resume expert helping a candidate refine their resume and application materials for a specific job opportunity.

Your role is to:
1. Provide targeted, actionable feedback on resume content
2. Generate follow-up questions to uncover deeper experience and achievements
3. Help the candidate position their background effectively for the job
4. Maintain consistency with their career narrative
5. Balance between being helpful and honest about fit`;
  }

  private buildCareerDocContextSection(careerDocJSON: string): string {
    return `## Candidate's Career Document

\`\`\`json
${careerDocJSON}
\`\`\``;
  }

  private buildJobContextSection(jobDescription: string): string {
    return `## Target Job Description

\`\`\`
${jobDescription}
\`\`\``;
  }

  private buildConversationHistorySection(
    history: Array<{ role: string; content: string }>
  ): string {
    if (history.length === 0) {
      return "";
    }

    const formattedHistory = history
      .map((msg) => {
        const prefix = msg.role === "user" ? "**Candidate:** " : "**Advisor:** ";
        return `${prefix}${msg.content}`;
      })
      .join("\n\n");

    return `## Conversation History

${formattedHistory}`;
  }

  private buildUserPreferencesSection(preferences?: Record<string, any>): string {
    if (!preferences || Object.keys(preferences).length === 0) {
      return "";
    }

    const prefs = preferences || {};
    let section = "## User Preferences\n\n";

    if (prefs.tone) {
      section += `- **Tone:** ${prefs.tone}\n`;
    }
    if (prefs.focus) {
      section += `- **Focus Areas:** ${prefs.focus}\n`;
    }
    if (prefs.constraints) {
      section += `- **Constraints:** ${prefs.constraints}\n`;
    }
    if (prefs.style) {
      section += `- **Writing Style:** ${prefs.style}\n`;
    }

    return section;
  }

  private buildRefinementInstructionsSection(
    sectionType: string,
    originalText: string,
    proposedText: string
  ): string {
    return `## Refinement Task

You are helping refine a **${sectionType}** of the resume.

**Original Text:**
\`\`\`
${originalText}
\`\`\`

**Proposed Text:**
\`\`\`
${proposedText}
\`\`\`

Your task:
1. Analyze how well the proposed text aligns with the job description
2. Assess the quality and clarity of the proposed change
3. Provide a business impact statement explaining why this change matters for this specific role
4. Suggest any further refinements or alternative approaches
5. Rate your confidence in this recommendation (0-1 scale)

Return your analysis as JSON with this structure:
\`\`\`json
{
  "isApprovement": boolean,
  "reasoning": "Your analysis of the proposed change",
  "businessImpact": "How this change helps the candidate for this role",
  "suggestedAlternatives": ["alternative 1", "alternative 2"],
  "confidence": 0.85,
  "refinedText": "If you have a better suggestion, provide it here; otherwise null"
}
\`\`\``;
  }

  private buildFollowUpInstructionsSection(analysisFindings: string): string {
    return `## Follow-Up Generation Task

Based on the candidate's career document and the target job, generate follow-up questions to uncover:
1. Deeper experience in key required skills
2. Quantifiable achievements and metrics
3. Specific project examples relevant to the role
4. Leadership and impact demonstrations
5. Problem-solving approaches aligned with the job

**Analysis Findings:**
${analysisFindings}

Generate 3-5 focused follow-up questions that:
- Are specific to this job and candidate background
- Dig into areas that could strengthen the application
- Reveal experience the candidate might not have highlighted

Return as JSON:
\`\`\`json
{
  "questions": [
    {
      "question": "Your question here",
      "purpose": "Why this question matters",
      "jobContext": "How it relates to the job"
    }
  ],
  "conversationNote": "Brief note on conversation flow"
}
\`\`\``;
  }

  buildRefinementPrompt(context: RefinementContext): string {
    const parts: string[] = [];

    // System section
    parts.push(this.buildSystemSection());
    parts.push("");

    // Career doc context
    parts.push(this.buildCareerDocContextSection(context.careerDocJSON));
    parts.push("");

    // Job context
    parts.push(this.buildJobContextSection(context.jobDescription));
    parts.push("");

    // Conversation history (if any)
    const historySection = this.buildConversationHistorySection(
      context.conversationHistory
    );
    if (historySection) {
      parts.push(historySection);
      parts.push("");
    }

    // User preferences (if any)
    const prefsSection = this.buildUserPreferencesSection(
      context.userPreferences
    );
    if (prefsSection) {
      parts.push(prefsSection);
      parts.push("");
    }

    // Refinement instructions
    parts.push(
      this.buildRefinementInstructionsSection(
        context.sectionType,
        context.originalText,
        context.proposedText
      )
    );

    return parts.join("\n");
  }

  buildFollowUpPrompt(context: FollowUpContext): string {
    const parts: string[] = [];

    // System section
    parts.push(this.buildSystemSection());
    parts.push("");

    // Career doc context
    parts.push(this.buildCareerDocContextSection(context.careerDocJSON));
    parts.push("");

    // Job context
    parts.push(this.buildJobContextSection(context.jobDescription));
    parts.push("");

    // Conversation history (if any)
    const historySection = this.buildConversationHistorySection(
      context.conversationHistory
    );
    if (historySection) {
      parts.push(historySection);
      parts.push("");
    }

    // User preferences (if any)
    const prefsSection = this.buildUserPreferencesSection(
      context.userPreferences
    );
    if (prefsSection) {
      parts.push(prefsSection);
      parts.push("");
    }

    // Follow-up instructions
    parts.push(this.buildFollowUpInstructionsSection(context.analysisFindings));

    return parts.join("\n");
  }
}

// Factory function
export function createPromptBuilder(): PromptBuilder {
  return new PromptBuilder();
}

export default {
  PromptBuilder,
  createPromptBuilder,
};
