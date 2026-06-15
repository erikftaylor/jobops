import { z } from "zod";

export const ArtifactTypeSchema = z.enum(["resume", "cover_letter"]);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export const ArtifactStatusSchema = z.enum(["draft", "ready", "error", "archived"]);
export type ArtifactStatus = z.infer<typeof ArtifactStatusSchema>;

export const ResumeSectionSchema = z.object({
  title: z.string(),
  company: z.string(),
  dates: z.string().optional(),
  description: z.string().optional(),
  bullets: z.array(z.string()).optional(),
});

export type ResumeSection = z.infer<typeof ResumeSectionSchema>;

export const ResumeContentSchema = z.object({
  analysis: z.object({
    positioning: z.string(),
    highPriorityKeywords: z.array(z.string()),
    strengthsToHighlight: z.array(z.string()),
  }),
  resume: z.object({
    professionalSummary: z.string(),
    coreSkills: z.array(z.string()),
    experience: z.array(ResumeSectionSchema),
    education: z.array(
      z.object({
        school: z.string(),
        degree: z.string(),
        year: z.string().optional(),
      })
    ),
  }),
});

export type ResumeContent = z.infer<typeof ResumeContentSchema>;

export const CoverLetterContentSchema = z.object({
  analysis: z.object({
    positioning: z.string(),
    keyThemes: z.array(z.string()),
    companyCultureFit: z.string(),
  }),
  coverLetter: z.object({
    greeting: z.string(),
    opening: z.string(),
    bodyParagraphs: z.array(z.string()),
    closing: z.string(),
    signature: z.string(),
  }),
});

export type CoverLetterContent = z.infer<typeof CoverLetterContentSchema>;

export const ArtifactSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  artifactType: ArtifactTypeSchema,
  version: z.number().int().positive(),
  positioning: z.string().optional(),
  title: z.string().optional(),
  careerDocVersionId: z.string(),
  promptVersion: z.number().int().positive(),
  model: z.string(),
  jsonContent: z.union([ResumeContentSchema, CoverLetterContentSchema]),
  renderedText: z.string(),
  status: ArtifactStatusSchema,
  isPreferred: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Artifact = z.infer<typeof ArtifactSchema>;

export const CreateArtifactSchema = z.object({
  jobId: z.string(),
  artifactType: ArtifactTypeSchema,
  careerDocVersionId: z.string(),
  promptVersion: z.number().int().positive(),
  model: z.string(),
  jsonContent: z.union([ResumeContentSchema, CoverLetterContentSchema]),
  renderedText: z.string(),
  positioning: z.string().optional(),
  title: z.string().optional(),
});

export type CreateArtifactInput = z.infer<typeof CreateArtifactSchema>;
