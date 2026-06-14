// Job
export interface Job {
  id: string;
  title: string;
  company: string;
  state: "draft" | "analyzed" | "refining" | "approved" | "generated" | "applied" | "closed";
  url?: string;
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  job_type?: "full-time" | "contract" | "part-time" | "other";
  source?: "manual" | "linkedin" | "indeed" | "glassdoor" | "company_website" | "other";
  source_url?: string;
  added_at: string;
  archived_at?: string;
  updated_at: string;
  notes?: string;
  positioning_angle?: string;
  created_at?: string;
  accepted_changes?: string[]; // change_set IDs that have been accepted
  conversation_id?: string; // current active conversation
}

// Analysis
export interface Analysis {
  id: string;
  job_id: string;
  analyzed_at: string;
  career_doc_version_hash?: string;
  fit_score: number;
  fit_justification?: string;
  skills_match: {
    matched: string[];
    partial: string[];
    missing: string[];
  };
  experience_gaps: string[];
  positioning_suggestions?: string[];
  confidence_score: number;
}

// Chat Message
export interface ChatMessage {
  id: string;
  job_id: string;
  role: "user" | "assistant";
  created_at: string;
  content: string;
  message_type?: "chat" | "estimate_confirmation" | "positioning_suggestion" | "system";
  estimate?: string;
  user_confirmed?: boolean;
  confirmed_at?: string;
}

// Artifact
export interface Artifact {
  id: string;
  job_id: string;
  artifact_type:
    | "resume_pdf"
    | "resume_source"
    | "cover_letter_pdf"
    | "cover_letter_source"
    | "both_pdf";
  file_path: string;
  created_at: string;
  career_doc_version_hash?: string;
  content_hash?: string;
  template_used?: string;
}

// Tracker Event
export interface TrackerEvent {
  id: string;
  job_id: string;
  event_type: string;
  event_at: string;
  details?: Record<string, any>;
  notes?: string;
  score_band?: string;
  positioning_angle?: string;
}

// Settings
export interface Settings {
  [key: string]: any;
}

// Conversation state
export interface Conversation {
  id: string;
  job_id: string;
  analysis_id: string;
  created_at: string;
  updated_at: string;
  status: "active" | "closed";
  memory: ConversationMemory;
}

export interface ConversationMemory {
  accepted_changes: string[]; // change_set IDs
  rejected_changes: string[];
  user_tone_preference?: "formal" | "casual" | "balanced";
  positioning_angle?: string;
  ats_optimization_level?: "aggressive" | "balanced" | "minimal";
  writing_preferences?: Record<string, string>; // e.g., { "verb_style": "action-oriented" }
  company_specific_notes?: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  message_type: "chat" | "question" | "suggestion" | "confirmation";
}

export interface ChangeSet {
  id: string;
  conversation_id: string;
  analysis_id: string;
  section_type: "bullet" | "paragraph" | "sentence" | "section";
  location: string; // "experience.0.description" or similar
  original_text: string;
  proposed_text: string;
  reasoning: string;
  business_impact: string[];
  confidence: number; // 0-1
  status: "pending" | "accepted" | "rejected" | "modified";
  created_at: string;
  decided_at?: string;
  decision_note?: string;
}

export interface AnalyticsEvent {
  id: string;
  job_id: string;
  conversation_id?: string;
  event_type: "analysis_started" | "analysis_completed" | "follow_up_asked" |
    "recommendation_accepted" | "recommendation_rejected" | "conversation_modified" |
    "resume_updated" | "memory_recorded";
  timestamp: string;
  details?: Record<string, any>;
}

// Career Document
export interface CareerDocument {
  id: string;
  user_id?: string;
  summary?: string;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  certifications?: Certification[];
  projects?: Project[];
  created_at: string;
  updated_at: string;
}

export interface Experience {
  id?: string;
  title: string;
  company: string;
  location?: string;
  start_date: string;
  end_date?: string;
  is_current?: boolean;
  description: string;
  achievements?: string[];
  technologies?: string[];
}

export interface Education {
  id?: string;
  degree: string;
  field_of_study: string;
  institution: string;
  graduation_date: string;
  gpa?: number;
  description?: string;
}

export interface Skill {
  id?: string;
  name: string;
  level?: "beginner" | "intermediate" | "advanced" | "expert";
  category?: string;
  years_of_experience?: number;
}

export interface Certification {
  id?: string;
  name: string;
  issuer: string;
  issue_date: string;
  expiration_date?: string;
  credential_id?: string;
  credential_url?: string;
}

export interface Project {
  id?: string;
  name: string;
  description: string;
  url?: string;
  technologies?: string[];
  start_date?: string;
  end_date?: string;
}

// Change Graph Node
export interface ChangeNode {
  id: string;
  target: "resume" | "cover_letter" | "both";
  field: string;
  operation: "add" | "remove" | "modify" | "rewrite";
  original_value?: string;
  new_value?: string;
  reason: string;
  source: "analysis" | "user" | "ai_suggestion" | "system";
  confidence: number; // 0-1
  accepted_at?: string;
  conversation_id?: string;
  analysis_id?: string;
  tags?: string[];
  created_at: string;
}

// Career Model (resolved snapshot) - Simplified for scoring services
export interface CareerModel {
  fullName: string;
  sections: {
    summary?: string;
    experience?: Array<{
      company: string;
      title: string;
      startDate: string;
      endDate: string;
      description: string;
      metrics?: string[];
    }>;
    skills?: string[];
    education?: Array<{
      school: string;
      degree: string;
      year: string;
    }>;
  };
  metadata: {
    hash: string;
    source: string;
  };
  // Legacy fields for backward compatibility
  id?: string;
  created_at?: string;
  based_on?: string;
  content?: string;
}

// Artifact Template
export interface ArtifactTemplate {
  id: string;
  name: string;
  type: "resume" | "cover_letter";
  variant?: string;
  content: string; // template content with placeholders
  schema?: Record<string, any>; // JSON schema for template variables
  created_at: string;
}

// Output Contract (schema for generated artifacts)
export interface OutputContract {
  id: string;
  artifact_type: "resume_pdf" | "resume_source" | "cover_letter_pdf" | "cover_letter_source" | "both_pdf";
  schema: Record<string, any>; // JSON schema
  required_fields: string[];
  optional_fields: string[];
}

// Positioning Profile (reusable positioning configuration)
export interface PositioningProfile {
  id: string;
  name: string;
  description?: string;
  tone: "formal" | "casual" | "balanced";
  emphasis: string[]; // e.g., ["technical", "leadership", "innovation"]
  ats_keywords?: string[];
  industry_focus?: string[];
  created_at: string;
}

// API Responses
export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  database: {
    connected: boolean;
    path: string;
    size_bytes: number;
  };
  master_career_document: {
    found: boolean;
    loaded: boolean;
    hash: string | null;
    loaded_at: string | null;
  };
  claude_api: {
    key_configured: boolean;
    warning?: string | null;
  };
}

// Workspace: Resume Scoring
export interface ScoreCategory {
  name: string;
  score: number;
  maxScore: number;
  explanation: string;
}

export interface ResumeScore {
  total: number;
  maxScore: 100;
  confidence: number; // 0-1
  categories: {
    atsKeywordMatch: ScoreCategory;
    roleAlignment: ScoreCategory;
    seniorityAlignment: ScoreCategory;
    impactMetrics: ScoreCategory;
    recruiterReadability: ScoreCategory;
    formattingQuality: ScoreCategory;
  };
  recommendations: string[];
  updatedAt: string;
}

// Workspace: Keyword Analysis
export interface MissingKeyword {
  keyword: string;
  importance: "critical" | "high" | "medium" | "low";
  status: "missing" | "weak";
  frequency: {
    inJob: number;
    inResume: number;
  };
  suggestedPlacement: string; // e.g., "skills", "summary", "experience"
  suggestedLanguage: string;
}

export interface KeywordAnalysis {
  missingKeywords: MissingKeyword[];
  totalKeywordsInJob: number;
  matchedCount: number;
  matchPercentage: number;
  summary: string;
}

// Workspace: Recruiter Heatmap
export interface HeatmapSection {
  sectionName: string;
  visibilityScore: number; // 0-100
  recruiterConfidence: "high" | "medium" | "low";
  riskLevel: "low" | "medium" | "high";
  keyObservations: string[];
  recommendedImprovement: string;
  isVisible: boolean;
}

export interface RecruiterHeatmap {
  overallVisibility: number;
  sections: HeatmapSection[];
  sixSecondSkim: string[];
  skippedSections: string[];
}

// Workspace: Job Fit Analysis
export interface ExperienceGap {
  requirement: string;
  hasMatch: boolean;
  severity: "critical" | "moderate" | "minor";
  suggestion: string;
}

export interface JobFitAnalysis {
  overallFit: number; // 0-100
  confidenceLevel: "high" | "medium" | "low";
  strongMatches: string[];
  weakMatches: string[];
  rejectionRisks: string[];
  interviewTalkingPoints: string[];
  experienceGaps: ExperienceGap[];
  recommendedPositioningAngle: string;
  likelihood: {
    phoneScreen: number;
    technicalInterview: number;
    offer: number;
  };
}

// Recruiter Chat - Structured Q&A for resume feedback
export interface RecruiterQuestion {
  id: string;
  question: string;
  description: string;
}

export interface SuggestedChange {
  target: string; // "skills", "summary", "experience", "education"
  operation: string; // "add", "remove", "modify"
  value: string;
  reasoning: string;
}

export interface RecruiterAnswer {
  question: string;
  answer: string;
  risks: string[];
  suggestedChanges: SuggestedChange[];
  followUpQuestions: string[];
  confidence: number; // 0-1
}

// Keyword Proposal - track proposed keywords and their acceptance status
export interface KeywordProposal {
  id: string;
  jobId: string;
  keyword: string;
  suggestedLanguage: string;
  target: "resume" | "cover_letter" | "both";
  status: "pending" | "accepted" | "ignored";
  changeNodeId?: string;
  createdAt: string;
  acceptedAt?: string;
  ignoredAt?: string;
}

export const RECRUITER_QUESTIONS: RecruiterQuestion[] = [
  {
    id: 'worry',
    question: 'What would worry a recruiter?',
    description: 'Identify gaps and weaknesses that could cause rejection',
  },
  {
    id: 'weakest',
    question: 'Where is my resume weakest?',
    description: 'Find the lowest-scoring areas and how to improve them',
  },
  {
    id: 'interview',
    question: 'Would this likely get an interview?',
    description: 'Honest assessment of interview likelihood',
  },
  {
    id: 'improve-first',
    question: 'What should I improve first?',
    description: 'Prioritized list of improvements for maximum impact',
  },
];
