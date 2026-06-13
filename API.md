# JobOps API Contract

## Overview

The JobOps backend is a thin Express server that handles:
- Job CRUD operations
- Job analysis and gap identification
- Document generation (resume, cover letter)
- PDF generation and download
- Settings management

All endpoints return JSON. Errors include a `code` and `message` field.

---

## Base URL

```
http://localhost:3001/api
```

---

## Error Responses

### 400 Bad Request
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Title is required",
  "details": {
    "field": "title",
    "reason": "Missing required field"
  }
}
```

### 404 Not Found
```json
{
  "code": "NOT_FOUND",
  "message": "Job with id 'abc123' not found"
}
```

### 422 Unprocessable Entity (AI Safety)
```json
{
  "code": "ANTI_FABRICATION_VIOLATION",
  "message": "Generated resume contains unsupported claim",
  "details": {
    "claim": "5 years of Kubernetes experience",
    "reason": "Master CV shows only 2 years of Kubernetes"
  }
}
```

### 503 Service Unavailable
```json
{
  "code": "AI_SERVICE_ERROR",
  "message": "Claude API temporarily unavailable",
  "retryAfter": 30
}
```

---

## Job Endpoints

### POST /jobs

Create a new job opportunity.

**Request:**
```json
{
  "title": "Senior Product Designer",
  "company": "Acme Corp",
  "url": "https://acme.com/jobs/123",
  "description": "We are looking for...",
  "location": "San Francisco, CA",
  "salary_min": 150000,
  "salary_max": 200000,
  "currency": "USD",
  "job_type": "full-time",
  "source": "linkedin",
  "source_id": "linkedin-job-123",
  "notes": "Referred by John Smith"
}
```

**Response:** 201 Created
```json
{
  "id": "job-abc123",
  "title": "Senior Product Designer",
  "company": "Acme Corp",
  "status": "interested",
  "added_at": "2026-06-12T14:30:00Z",
  "created": true
}
```

**Validation:**
- `title` required, max 200 chars
- `company` required, max 200 chars
- `url` optional, must be valid URL
- `salary_min` and `salary_max` must be positive if provided
- `source` must be one of: manual, linkedin, indeed, glassdoor, company_website, other
- `job_type` must be one of: full-time, contract, part-time, other

---

### GET /jobs

List all jobs with optional filtering.

**Query Parameters:**
- `status` — Filter by status (interested, applied, rejected, etc.)
- `source` — Filter by source
- `sort_by` — Sort field (added_at, updated_at, title, fit_score)
- `order` — ASC or DESC
- `limit` — Results per page (default 50)
- `offset` — Pagination offset (default 0)
- `include_archived` — Include archived jobs (default false)

**Request:**
```
GET /jobs?status=applied&sort_by=added_at&order=DESC&limit=20&offset=0
```

**Response:** 200 OK
```json
{
  "jobs": [
    {
      "id": "job-abc123",
      "title": "Senior Product Designer",
      "company": "Acme Corp",
      "status": "applied",
      "added_at": "2026-06-12T14:30:00Z",
      "applied_at": "2026-06-13T10:00:00Z",
      "url": "https://acme.com/jobs/123",
      "analysis": {
        "fit_score": 82,
        "skills_match": ["UI Design", "Figma"],
        "skills_gap": ["Data Analysis"]
      }
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

### GET /jobs/:id

Get a single job with full details.

**Response:** 200 OK
```json
{
  "id": "job-abc123",
  "title": "Senior Product Designer",
  "company": "Acme Corp",
  "url": "https://acme.com/jobs/123",
  "description": "Full job posting text...",
  "location": "San Francisco, CA",
  "salary_min": 150000,
  "salary_max": 200000,
  "currency": "USD",
  "job_type": "full-time",
  "source": "linkedin",
  "source_id": "linkedin-job-123",
  "status": "applied",
  "added_at": "2026-06-12T14:30:00Z",
  "applied_at": "2026-06-13T10:00:00Z",
  "notes": "Referred by John Smith",
  
  "analysis": {
    "fit_score": 82,
    "fit_justification": "Strong product design background matches well...",
    "skills_match": {
      "matched": ["UI Design", "Figma", "User Research"],
      "partial": ["Data Analysis"],
      "missing": ["Machine Learning"]
    },
    "experience_gaps": ["3+ years in fintech (you have 0)"],
    "positioning_suggestions": ["Emphasize your user research experience", "..."],
    "analyzed_at": "2026-06-12T14:35:00Z"
  },
  
  "documents": [
    {
      "id": "doc-xyz789",
      "type": "resume",
      "version": 1,
      "is_current": true,
      "modified_by_user": false,
      "generated_at": "2026-06-12T14:35:00Z"
    }
  ],
  
  "outcome": null
}
```

---

### PATCH /jobs/:id

Update job status or details.

**Request:**
```json
{
  "status": "applied",
  "notes": "Applied via email to hiring@acme.com"
}
```

**Response:** 200 OK
```json
{
  "id": "job-abc123",
  "status": "applied",
  "applied_at": "2026-06-13T10:00:00Z",
  "updated_at": "2026-06-13T10:05:00Z",
  "notes": "Applied via email to hiring@acme.com"
}
```

**Valid status transitions:**
```
interested → qualified | not_qualified | applied
qualified → not_qualified | applied
not_qualified → applied (if reconsidered)
applied → interview | rejected | withdrawn
interview → offer | rejected
offer → accepted | rejected
```

---

### DELETE /jobs/:id

Soft-delete a job (moves to archived).

**Response:** 200 OK
```json
{
  "id": "job-abc123",
  "archived": true,
  "archived_at": "2026-06-13T10:00:00Z"
}
```

---

## Chat Endpoints

### GET /jobs/:id/chat

Get job-scoped chat history.

**Query Parameters:**
- `limit` — Number of messages (default 50)
- `offset` — Pagination offset (default 0)

**Response:** 200 OK
```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "assistant",
      "created_at": "2026-06-12T14:35:00Z",
      "content": "Here's my analysis of this Senior Designer role at Acme Corp...",
      "message_type": "chat"
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "created_at": "2026-06-12T14:36:00Z",
      "content": "The job requires 3+ years fintech experience. Your CV shows 0 years.",
      "message_type": "estimate_confirmation",
      "estimate": "3+ years fintech = significant gap",
      "user_confirmed": null
    },
    {
      "id": "msg-3",
      "role": "user",
      "created_at": "2026-06-12T14:40:00Z",
      "content": "That's fair. I have adjacent experience in payment systems though.",
      "message_type": "chat",
      "user_confirmed": false
    }
  ],
  "total": 12,
  "limit": 50,
  "offset": 0
}
```

### POST /jobs/:id/chat

Send a chat message for a job.

**Request:**
```json
{
  "content": "That's fair. I have adjacent experience in payment systems though.",
  "message_type": "chat",
  "responding_to_estimate": "msg-2"
}
```

**Response:** 201 Created
```json
{
  "id": "msg-3",
  "job_id": "job-abc123",
  "role": "user",
  "created_at": "2026-06-12T14:40:00Z",
  "content": "That's fair. I have adjacent experience in payment systems though."
}
```

---

## Job Analysis Endpoints

### POST /jobs/:id/analyze

Analyze job posting against Master Career Document.

**Request:**
```json
{
  "force_reanalyze": false,
  "positioning_angle": "leadership"  // Optional hint
}
```

**Response:** 200 OK
```json
{
  "analysis_id": "analysis-abc123",
  "job_id": "job-abc123",
  "analyzed_at": "2026-06-12T14:35:00Z",
  
  "fit_score": 82,
  "fit_justification": "Strong product design background matches well. Primary gap is fintech domain.",
  
  "skills_match": {
    "matched": ["UI Design", "Figma", "User Research"],
    "partial": ["Analytics"],
    "missing": ["Machine Learning"]
  },
  
  "experience_gaps": [
    "Job requires 5+ years fintech (you have 0)"
  ],
  
  "positioning_suggestions": [
    "Emphasize user research in previous roles",
    "Highlight ability to learn new domains"
  ],
  
  "confidence_score": 0.92,
  "career_doc_version_hash": "abc123def456..."
}
```

Also sends estimate_confirmation chat messages (see chat endpoints).

---

### GET /jobs/:id/gaps

Get identified gaps for a job.

**Response:** 200 OK
```json
{
  "job_id": "job-abc123",
  "skills_gaps": [
    {
      "skill": "Machine Learning",
      "criticality": "nice_to_have",
      "mitigation": "Not required for role, but shows initiative"
    },
    {
      "skill": "Fintech Domain Knowledge",
      "criticality": "important",
      "mitigation": "Position your ability to learn quickly; mention adjacent domain experience"
    }
  ],
  
  "experience_gaps": [
    {
      "gap": "5+ years fintech",
      "severity": "high",
      "your_experience": "0 years",
      "mitigation": "Highlight transferable design principles from other industries"
    }
  ],
  
  "actionable_recommendations": [
    "Consider taking an online fintech domain course",
    "Research fintech design trends before interviews",
    "Prepare examples of you learning new domains quickly"
  ]
}
```

---

## Document Generation Endpoints

### POST /jobs/:id/documents

Generate resume or cover letter for a job.

**Anti-fabrication validation happens BEFORE artifact is created.**

**Request:**
```json
{
  "type": "resume",
  "template": "ats-standard"
}
```

**Response (Success):** 201 Created
```json
{
  "artifact_id": "artifact-xyz789",
  "job_id": "job-abc123",
  "artifact_type": "resume_source",
  "created_at": "2026-06-12T14:35:00Z",
  "content_hash": "sha256...",
  "career_doc_version_hash": "sha256...",
  "ready_for_export": true
}
```

Also creates a tracker_event: [resume_generated]

**Response (Validation Failed):** 422 Unprocessable Entity
```json
{
  "code": "ANTI_FABRICATION_VIOLATION",
  "message": "Generated resume contains unsupported claim",
  "violations": [
    {
      "claim": "5 years Kubernetes experience",
      "reason": "Master CV shows 2 years",
      "cv_location": "Experience > Tech Corp > Kubernetes"
    }
  ],
  "action": "regenerate_or_edit_cv"
}
```

---

### GET /jobs/:id/documents

List all artifacts (resumes and cover letters) for a job.

**Response:** 200 OK
```json
{
  "artifacts": [
    {
      "id": "artifact-xyz789",
      "job_id": "job-abc123",
      "artifact_type": "resume_source",
      "created_at": "2026-06-12T14:35:00Z",
      "content_hash": "sha256...",
      "career_doc_version_hash": "sha256...",
      "template_used": "ats-standard"
    }
  ]
}
```

---

### GET /jobs/:id/documents/:artifact_id/source

Get the HTML source for a resume/letter (before PDF conversion).

**Response:** 200 OK
```json
{
  "artifact_id": "artifact-xyz789",
  "artifact_type": "resume_source",
  "content": "<html>... resume in HTML with citation links ...</html>",
  "citations": [
    {
      "text": "UI Design",
      "cv_location": "Skills > Design Tools > UI Design",
      "confidence": 1.0
    }
  ]
}
```

---

### PATCH /jobs/:id/documents/:artifact_id

Edit (customize) a generated artifact.

**Request:**
```json
{
  "content": "<html>... user-edited HTML ...</html>",
  "reason": "Reworded some bullets"
}
```

**Response:** 200 OK
```json
{
  "artifact_id": "artifact-xyz789",
  "modified_at": "2026-06-12T14:45:00Z",
  "user_modified": true,
  "reason": "Reworded some bullets"
}
```

---

### POST /jobs/:id/documents/:artifact_id/pdf

Generate PDF from artifact source.

**Request:**
```json
{
  "template": "ats-standard"
}
```

**Response:** 200 OK
```json
{
  "artifact_id": "artifact-xyz789",
  "pdf_file_path": "output/resumes/job-abc123-resume-v1.pdf",
  "download_url": "/api/artifacts/artifact-xyz789/pdf",
  "file_size_bytes": 125432,
  "created_at": "2026-06-12T14:50:00Z"
}
```

---

## Artifact Endpoints

### GET /artifacts/:artifact_id/download

Download generated PDF.

**Response:** 200 OK (binary PDF)
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="resume-senior-designer-acme.pdf"
[Binary PDF content]
```

---

### DELETE /artifacts/:artifact_id

Delete a generated artifact.

**Response:** 200 OK
```json
{
  "artifact_id": "artifact-abc123",
  "deleted": true
}
```

---

## Tracker Event Endpoints

### GET /jobs/:id/events

Get event history for a job (immutable log).

**Query Parameters:**
- `event_type` — Filter by event type (applied, interviewed, offered, etc.)
- `limit` — Results per page (default 50)
- `offset` — Pagination offset

**Response:** 200 OK
```json
{
  "events": [
    {
      "id": "event-1",
      "job_id": "job-abc123",
      "event_type": "job_added",
      "event_at": "2026-06-12T10:00:00Z",
      "details": {}
    },
    {
      "id": "event-2",
      "job_id": "job-abc123",
      "event_type": "job_analyzed",
      "event_at": "2026-06-12T14:35:00Z",
      "analysis_id": "analysis-abc123"
    },
    {
      "id": "event-3",
      "job_id": "job-abc123",
      "event_type": "estimate_confirmed",
      "event_at": "2026-06-12T14:45:00Z",
      "details": {"estimate": "fintech gap", "confirmed": true}
    },
    {
      "id": "event-4",
      "job_id": "job-abc123",
      "event_type": "resume_generated",
      "event_at": "2026-06-13T09:00:00Z",
      "artifact_id": "artifact-xyz789"
    },
    {
      "id": "event-5",
      "job_id": "job-abc123",
      "event_type": "applied",
      "event_at": "2026-06-14T10:00:00Z",
      "score_band": "61-100",
      "positioning_angle": "leadership"
    },
    {
      "id": "event-6",
      "job_id": "job-abc123",
      "event_type": "interview_scheduled",
      "event_at": "2026-06-16T14:00:00Z",
      "details": {"type": "phone_screen", "scheduled_for": "2026-06-20T10:00:00Z"}
    }
  ],
  "total": 6
}
```

### POST /jobs/:id/events

Record a tracker event (application, interview, outcome, etc.).

**Request:**
```json
{
  "event_type": "applied",
  "details": {
    "method": "online_form",
    "notes": "Applied via Acme careers page"
  },
  "positioning_angle": "leadership"
}
```

**Response:** 201 Created
```json
{
  "id": "event-5",
  "job_id": "job-abc123",
  "event_type": "applied",
  "event_at": "2026-06-14T10:00:00Z",
  "score_band": "61-100",
  "positioning_angle": "leadership"
}
```

**Note:** event_type determines what details are expected. Tracker events are immutable; create new event for updates.

---

## Funnel Analysis Endpoints

### GET /funnel/stats

Get funnel conversion statistics, grouped by score band and positioning angle.

**Query Parameters:**
- `days_back` — Analyze last N days (default 90)
- `score_band` — Filter by band (0-30, 31-60, 61-100)
- `positioning_angle` — Filter by angle (leadership, technical, etc.)

**Response:** 200 OK
```json
{
  "period_days": 90,
  "total_jobs_added": 42,
  "total_applied": 18,
  "application_rate": 0.43,
  
  "by_score_band": [
    {
      "band": "0-30",
      "total_applied": 2,
      "interviewed": 0,
      "offer": 0,
      "conversion_to_interview": 0.0
    },
    {
      "band": "31-60",
      "total_applied": 6,
      "interviewed": 1,
      "offer": 0,
      "conversion_to_interview": 0.167
    },
    {
      "band": "61-100",
      "total_applied": 10,
      "interviewed": 5,
      "offer": 2,
      "conversion_to_interview": 0.50,
      "conversion_interview_to_offer": 0.40
    }
  ],
  
  "by_positioning_angle": [
    {
      "angle": "leadership",
      "total_applied": 8,
      "interviewed": 4,
      "conversion_to_interview": 0.50
    },
    {
      "angle": "technical",
      "total_applied": 7,
      "interviewed": 1,
      "conversion_to_interview": 0.143
    }
  ],
  
  "overall_metrics": {
    "conversion_applied_to_interview": 0.33,
    "conversion_interview_to_offer": 0.33,
    "conversion_offer_to_acceptance": 0.67,
    "avg_time_to_interview_days": 5.2,
    "avg_time_to_offer_days": 12.1,
    "median_time_to_response_days": 3
  },
  
  "recommendations": [
    "Leadership angle is performing 3.5x better; focus on that positioning",
    "61-100 band has better outcomes; consider raising min threshold",
    "Average time to interview is 5 days"
  ]
}
```

---

## Settings Endpoints

### GET /settings

Get all user settings.

**Response:** 200 OK
```json
{
  "min_fit_score_to_apply": 70,
  "min_salary": 120000,
  "max_salary": 300000,
  "preferred_locations": ["San Francisco", "Remote"],
  "preferred_job_types": ["full-time"],
  "required_skills": ["React", "TypeScript"],
  "auto_generate_documents": true,
  "ats_template": "clean",
  "cover_letter_tone": "professional"
}
```

---

### PATCH /settings

Update one or more settings.

**Request:**
```json
{
  "min_fit_score_to_apply": 75,
  "min_salary": 130000
}
```

**Response:** 200 OK
```json
{
  "min_fit_score_to_apply": 75,
  "min_salary": 130000,
  "updated_at": "2026-06-12T15:00:00Z"
}
```

---

## Career Document Endpoints

### GET /cv

Get the active Master Career Document (latest version).

**Response:** 200 OK
```json
{
  "content_hash": "sha256abc123...",
  "is_active": true,
  "created_at": "2026-06-01T10:00:00Z",
  "loaded_from": "data/Master_Career_Document.md",
  
  "content": {
    "personal": {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1-555-0123"
    },
    "summary": "Senior Product Designer with 8 years...",
    "skills": [
      {
        "category": "Design Tools",
        "items": ["Figma", "Sketch", "Adobe XD"]
      }
    ],
    "experience": [
      {
        "company": "Big Tech Corp",
        "position": "Senior Product Designer",
        "start_date": "2022-01",
        "end_date": null,
        "description": "Led design of..."
      }
    ],
    "education": [
      {
        "school": "University of California",
        "degree": "B.A.",
        "field": "Design",
        "year": 2015
      }
    ]
  }
}
```

---

### GET /cv/versions

Get all career document versions (immutable snapshots).

**Query Parameters:**
- `limit` — Results per page (default 20)

**Response:** 200 OK
```json
{
  "versions": [
    {
      "content_hash": "sha256abc123...",
      "created_at": "2026-06-12T15:00:00Z",
      "is_active": true,
      "summary": {
        "total_skills": 50,
        "total_experience_items": 12,
        "total_projects": 5
      }
    },
    {
      "content_hash": "sha256def456...",
      "created_at": "2026-06-01T10:00:00Z",
      "is_active": false,
      "summary": {
        "total_skills": 48,
        "total_experience_items": 11,
        "total_projects": 4
      }
    }
  ]
}
```

---

### POST /cv/refresh

Reload Master Career Document from `data/Master_Career_Document.md`.

**Response:** 200 OK
```json
{
  "refreshed": true,
  "loaded_at": "2026-06-12T15:00:00Z",
  "content_hash": "sha256abc123...",
  "changed": false,
  "message": "Career document unchanged since last load"
}
```

**Response (Changed):** 200 OK
```json
{
  "refreshed": true,
  "loaded_at": "2026-06-12T15:10:00Z",
  "content_hash": "sha256xyz789...",
  "changed": true,
  "previous_hash": "sha256abc123...",
  "message": "Career document updated. New version is now active.",
  "note": "Existing analyses may be outdated; consider re-analyzing key jobs."
}
```

---

### GET /pending-additions

Get pending manually confirmed additions (from `data/pending_additions.md`).

**Response:** 200 OK
```json
{
  "pending_additions": [
    {
      "id": "pending-1",
      "category": "skills",
      "addition": "Prototyping",
      "description": "Confirmed by user as newly acquired skill",
      "status": "pending_merge"
    }
  ],
  "merge_instructions": "Review pending additions and merge into Master_Career_Document.md"
}
```

---

## Health Check

### GET /health

Basic health check.

**Response:** 200 OK
```json
{
  "status": "healthy",
  "timestamp": "2026-06-12T15:00:00Z",
  "database": "connected",
  "claude_api": "reachable"
}
```

---

## Summary

The API is:
- ✅ RESTful (uses HTTP methods correctly)
- ✅ Stateless (no session management needed)
- ✅ Clear error responses with codes and details
- ✅ Pagination support for list endpoints
- ✅ Validation errors are informative
- ✅ Anti-fabrication violations are explicit (422)
- ✅ All responses are JSON
- ✅ No API keys needed (server-side only)
