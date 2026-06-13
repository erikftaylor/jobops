import fs from "fs";
import { getDatabase } from "../db/database.js";
import { getClaudeService } from "./claude.service.js";
import { createCareerDocService } from "./career-doc.service.js";
import { createSettingsService } from "./settings.service.js";
import { AnalysisResult } from "../schemas/analysis.schema.js";
import crypto from "crypto";

interface AnalysisPromptData {
  jobDescription: string;
  careerDocJSON: string;
  atsRules: string;
  matchingRubric: string;
  autoProceedThreshold: number;
  minimumFloorThreshold: number;
  angles: any[];
  settingsSummary: string;
}

class AnalysisService {
  private careerDocService = createCareerDocService();
  private settingsService = createSettingsService();

  loadPromptFile(filename: string): string {
    const path = `./prompts/${filename}`;
    try {
      return fs.readFileSync(path, "utf-8");
    } catch (err) {
      throw new Error(
        `Failed to load prompt file: ${filename}. Ensure ${path} exists.`
      );
    }
  }

  loadAnglesConfig(): any[] {
    try {
      const content = fs.readFileSync("./config/angles.json", "utf-8");
      const parsed = JSON.parse(content);
      return parsed.angles || [];
    } catch (err) {
      throw new Error(
        `Failed to load angles config: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  composePrompt(data: AnalysisPromptData): string {
    const anglesText = data.angles
      .map(
        (a) => `
**${a.label}** (${a.id})
${a.description}
- Lead with: ${a.leadWith.join(", ")}
`
      )
      .join("\n");

    return `You are a career advisor analyzing a job description against a candidate's career document.

Your task is to provide a structured analysis JSON that helps the candidate decide whether to apply.

## Career Document (Parsed)
\`\`\`json
${data.careerDocJSON}
\`\`\`

## Job Description
\`\`\`
${data.jobDescription}
\`\`\`

## ATS Scoring Rules
${data.atsRules}

## Matching Rubric
${data.matchingRubric}

## Positioning Angles (for recommended angle field)
${anglesText}

## User Settings
${data.settingsSummary}

---

Analyze this job against the career document and return a JSON object with this exact structure:

\`\`\`json
{
  "company": "Company Name (extracted from JD or context)",
  "roleTitle": "The job title",
  "seniority": "junior|mid|senior|lead|executive",
  "verdict": "APPLY|STRETCH|SKIP",
  "estimatedATSFit": {
    "score": 0-100,
    "label": "Poor|Fair|Good|Excellent",
    "explanation": "Why this score",
    "formulaNote": "Estimated ATS fit — internal heuristic, not a platform score."
  },
  "requiredRequirements": ["list of required requirements from JD"],
  "preferredRequirements": ["list of preferred requirements from JD"],
  "gapTable": [
    {
      "requirement": "The specific requirement",
      "type": "required|preferred",
      "confidence": "DIRECT|TRANSFERABLE|ADJACENT|GAP",
      "evidence": "What from career document covers this (or 'No evidence')",
      "evidenceSource": "Where in career document (e.g., 'Company XYZ role')",
      "recommendedFraming": "How to frame this for the employer",
      "risk": "Any risks or ramp-up concerns"
    }
  ],
  "redFlags": ["List of red flags or concerns"],
  "terminologyMap": {
    "job_description_term": "candidate_background_equivalent",
    "example": "Full-stack engineer → Frontend + Backend experience"
  },
  "recommendedAngle": "One of the positioning angles (id or label)",
  "topStrengths": ["Top 3-5 strengths relative to job"],
  "remainingGaps": ["Key gaps that would need ramp-up time"],
  "followUpQuestions": ["Questions to ask the recruiter or hiring manager"]
}
\`\`\`

Important rules:
1. NEVER invent skills or experience not in the career document
2. If uncertain about evidence, use TRANSFERABLE or ADJACENT, not DIRECT
3. Use GAP only when no evidence exists
4. Every confidence assignment must be justified in the evidence field
5. Red flags must be specific and actionable
6. ATS fit must ALWAYS include the formula note
7. Verdict must follow the rules:
   - APPLY if ATS fit >= ${data.autoProceedThreshold}
   - STRETCH if ATS fit is between ${data.minimumFloorThreshold} and ${data.autoProceedThreshold}
   - SKIP if ATS fit < ${data.minimumFloorThreshold}

Return only the JSON, no additional text.`;
  }

  async analyzeJob(jobId: string, jobDescription: string): Promise<AnalysisResult> {
    // Validate job exists
    const db = getDatabase().getConnection();
    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as any;
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Validate career document exists and is parsed
    const careerDoc = this.careerDocService.getActiveCareerDocument();
    if (!careerDoc) {
      throw new Error(
        "Master Career Document not found or not yet parsed. Update data/Master_Career_Document.md and restart the server."
      );
    }

    // Load settings
    const settings = this.settingsService.getAllSettings();

    // Load prompt files
    const atsRules = this.loadPromptFile("ats-rules.md");
    const matchingRubric = this.loadPromptFile("matching-rubric.md");
    const angles = this.loadAnglesConfig();

    // Compose prompt
    const settingsSummary = `
- Auto-proceed threshold: ${settings.autoProceedThreshold}%
- Minimum floor threshold: ${settings.minimumFloorThreshold}%
- Model: ${settings.modelName}
- Career document is ${careerDoc.isPlaceholder ? "a placeholder" : "complete"}
`;

    const promptData: AnalysisPromptData = {
      jobDescription,
      careerDocJSON: JSON.stringify(careerDoc, null, 2),
      atsRules,
      matchingRubric,
      autoProceedThreshold: settings.autoProceedThreshold,
      minimumFloorThreshold: settings.minimumFloorThreshold,
      angles,
      settingsSummary,
    };

    const prompt = this.composePrompt(promptData);

    // Call Claude
    const claudeService = getClaudeService();
    if (!claudeService.isConfigured()) {
      throw new Error(
        "Claude API not configured. Set ANTHROPIC_API_KEY in .env to enable analysis."
      );
    }

    let analysis: AnalysisResult;
    try {
      analysis = await claudeService.analyzeJobWithJSON<AnalysisResult>(prompt);
    } catch (err) {
      throw new Error(
        `Claude analysis failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Validate with Zod (handled by Claude service, but double-check)
    if (!analysis.verdict || !analysis.estimatedATSFit) {
      throw new Error("Invalid analysis response from Claude");
    }

    return analysis;
  }

  async persistAnalysis(
    jobId: string,
    analysis: AnalysisResult,
    careerDocHash: string
  ): Promise<string> {
    const db = getDatabase().getConnection();
    const analysisId = crypto.randomBytes(8).toString("hex");
    const now = new Date().toISOString();
    const model = this.settingsService.getAllSettings().modelName;

    const stmt = db.prepare(
      `INSERT INTO analyses (id, job_id, analyzed_at, career_doc_version_hash, model, fit_score,
       skills_match, experience_gaps, positioning_suggestions, fit_justification, confidence_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      analysisId,
      jobId,
      now,
      careerDocHash,
      model,
      analysis.estimatedATSFit.score,
      JSON.stringify({
        verdict: analysis.verdict,
        gapTable: analysis.gapTable,
      }),
      JSON.stringify({
        remainingGaps: analysis.remainingGaps,
        recommendedFraming: analysis.gapTable
          .filter((row) => row.confidence === "GAP")
          .map((row) => row.requirement),
      }),
      JSON.stringify({
        angle: analysis.recommendedAngle,
        strengths: analysis.topStrengths,
        terminology: analysis.terminologyMap,
      }),
      JSON.stringify(analysis),
      0.85 // Default confidence
    );

    return analysisId;
  }

  formatFindingsMessage(analysis: AnalysisResult): string {
    const verdict = analysis.verdict === "APPLY" ? "✅ APPLY" :
                    analysis.verdict === "STRETCH" ? "⚠️  STRETCH" :
                    "❌ SKIP";

    const topGaps = analysis.gapTable
      .filter((row) => row.confidence === "GAP")
      .slice(0, 3);

    const topStrengths = analysis.topStrengths.slice(0, 3);

    return `## Analysis Complete

**Verdict:** ${verdict}

**Estimated ATS Fit:** ${analysis.estimatedATSFit.score}% — ${analysis.estimatedATSFit.label}
*Note: ${analysis.estimatedATSFit.formulaNote}*

---

### Top Strengths
${topStrengths.map((s) => `- ${s}`).join("\n")}

### Key Gaps
${topGaps.length > 0
  ? topGaps.map((g) => `- **${g.requirement}** (${g.confidence}): ${g.risk || "Ramp-up needed"}`)
      .join("\n")
  : "- No major gaps identified"}

### Recommended Positioning Angle
**${analysis.recommendedAngle}**

${analysis.followUpQuestions.length > 0
  ? `### Questions to Ask Recruiter
${analysis.followUpQuestions.map((q) => `- ${q}`).join("\n")}`
  : ""}

---

*Use the Studio panel to see the full analysis details, gap table, and red flags.*`;
  }
}

export function createAnalysisService(): AnalysisService {
  return new AnalysisService();
}
