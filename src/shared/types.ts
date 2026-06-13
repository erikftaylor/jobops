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
