import { z } from "zod";

// Job states
export const JobState = z.enum([
  "draft",
  "analyzed",
  "refining",
  "approved",
  "generated",
  "applied",
  "closed",
]);

export type JobState = z.infer<typeof JobState>;

// Valid state transitions
const STATE_TRANSITIONS: Record<JobState, JobState[]> = {
  draft: ["analyzed", "closed"],
  analyzed: ["refining", "closed"],
  refining: ["approved", "closed"],
  approved: ["generated", "closed"],
  generated: ["applied", "closed"],
  applied: ["closed"],
  closed: [],
};

export function isValidTransition(from: JobState, to: JobState): boolean {
  return STATE_TRANSITIONS[from].includes(to);
}

// Create job from JD
export const CreateJobSchema = z.object({
  jobDescription: z.string().min(10, "Job description must be at least 10 characters"),
  company: z.string().optional(),
  title: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

// Update job state
export const UpdateJobStateSchema = z.object({
  newState: JobState,
  notes: z.string().optional(),
});

export type UpdateJobStateInput = z.infer<typeof UpdateJobStateSchema>;

// Update job (general)
export const UpdateJobSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type UpdateJobInput = z.infer<typeof UpdateJobSchema>;
