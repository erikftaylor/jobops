import { z } from "zod";

export const ConfidenceLevel = z.enum(["DIRECT", "TRANSFERABLE", "ADJACENT", "GAP"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

export const RequirementType = z.enum(["required", "preferred"]);
export type RequirementType = z.infer<typeof RequirementType>;

export const Verdict = z.enum(["APPLY", "STRETCH", "SKIP"]);
export type Verdict = z.infer<typeof Verdict>;

export const GapTableRow = z.object({
  requirement: z.string(),
  type: RequirementType,
  confidence: ConfidenceLevel,
  evidence: z.string(),
  evidenceSource: z.string().optional(),
  recommendedFraming: z.string(),
  risk: z.string().optional(),
});

export type GapTableRow = z.infer<typeof GapTableRow>;

export const EstimatedATSFit = z.object({
  score: z.number().min(0).max(100),
  label: z.string(),
  explanation: z.string(),
  formulaNote: z.string().default(
    "Estimated ATS fit — internal heuristic, not a platform score."
  ),
});

export type EstimatedATSFit = z.infer<typeof EstimatedATSFit>;

export const AnalysisResult = z.object({
  // Job metadata
  company: z.string(),
  roleTitle: z.string(),
  seniority: z.string(),

  // Verdict
  verdict: Verdict,

  // ATS fit
  estimatedATSFit: EstimatedATSFit,

  // Requirements analysis
  requiredRequirements: z.array(z.string()),
  preferredRequirements: z.array(z.string()),

  // Gap table
  gapTable: z.array(GapTableRow),

  // Red flags
  redFlags: z.array(z.string()),

  // Terminology mapping
  terminologyMap: z.record(z.string(), z.string()),

  // Recommendation
  recommendedAngle: z.string(),

  // Key findings
  topStrengths: z.array(z.string()),
  remainingGaps: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
});

export type AnalysisResult = z.infer<typeof AnalysisResult>;

export const CreateAnalysisSchema = z.object({
  jobId: z.string(),
  analysis: AnalysisResult,
});

export type CreateAnalysisInput = z.infer<typeof CreateAnalysisSchema>;
