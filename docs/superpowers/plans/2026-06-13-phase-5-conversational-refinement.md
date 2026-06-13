# Phase 5: Conversational Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the one-shot analysis experience into an iterative AI collaboration workflow where users refine recommendations conversationally instead of regenerating entire resumes.

**Architecture:** Build a conversation layer that sits between the Analysis Engine and Resume Generation. Every AI recommendation becomes a proposed change (tracked in `change_sets`) that persists until explicitly accepted or rejected. Conversations survive page refreshes via database persistence. The Master Career Document remains immutable; all proposals are versioned alternatives.

**Tech Stack:** Express, React, SQLite (better-sqlite3), TypeScript, Zod for validation, diff-match-patch for rendering changes.

---

## File Structure Map

### Backend Services (New)
- `src/server/services/conversation.service.ts` — Orchestrate conversation lifecycle (start, add message, accept/reject changes)
- `src/server/services/prompt-builder.service.ts` — Modular prompt composition (context + settings + history → prompt string)
- `src/server/services/change-set.service.ts` — Manage proposed changes (create, track, apply, accept, reject)
- `src/server/services/analytics.service.ts` — Event tracking (analysis started, recommendation accepted, resume updated, etc.)

### Backend Routes (New)
- `src/server/routes/conversation.ts` — Endpoints: POST /start, POST /message, POST /accept, POST /reject, POST /modify, GET /:id

### Frontend Hooks (New)
- `src/client/features/jobs/hooks/useConversation.ts` — Conversation state management (messages, pending changes, memory)
- `src/client/features/jobs/hooks/useChangeSet.ts` — Track individual change proposals (before/after, diff, status)

### Frontend Components (New)
- `src/client/features/jobs/components/ConfirmationCard.tsx` — Reusable card: current → proposed, business impact, accept/modify/reject
- `src/client/features/jobs/components/DiffViewer.tsx` — Inline diff rendering with removed/added highlighting
- `src/client/features/jobs/components/ConversationPanel.tsx` — Chat-like conversation UI for refinement
- `src/client/features/jobs/components/FollowUpSuggestions.tsx` — Quick action buttons below messages

### Database Schema (New)
- `src/server/db/migrations/005-conversation-tables.ts` — Creates: conversations, conversation_messages, change_sets, accepted_changes, analytics_events

### Type Extensions
- `src/shared/types.ts` — Add Conversation, ConversationMessage, ChangeSet, AnalyticsEvent interfaces

### Config & Prompts
- `prompts/refinement-questions.md` — Prompt for generating follow-up questions
- `prompts/change-suggestions.md` — Prompt for proposing specific rewrites

---

## Task Breakdown

### Task 1: Extend Types for Conversations

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add Conversation interfaces**

Open `src/shared/types.ts` and add these types at the end:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/shared/types.ts
git commit -m "feat: add conversation and changeset types for Phase 5"
```

---

### Task 2: Create Database Migrations for Conversation Tables

**Files:**
- Create: `src/server/db/migrations/005-conversation-tables.ts`

- [ ] **Step 1: Create migration file**

Write to `src/server/db/migrations/005-conversation-tables.ts`:

```typescript
import { Database } from "better-sqlite3";

export function migrate005(db: Database): void {
  // Conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL CHECK (status IN ('active', 'closed')) DEFAULT 'active',
      memory TEXT NOT NULL DEFAULT '{}',
      
      UNIQUE(job_id),
      INDEX idx_job_id (job_id),
      INDEX idx_analysis_id (analysis_id),
      INDEX idx_status (status)
    );
  `);

  // Conversation messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      message_type TEXT NOT NULL CHECK (message_type IN ('chat', 'question', 'suggestion', 'confirmation')) DEFAULT 'chat',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      
      INDEX idx_conversation_id (conversation_id),
      INDEX idx_created_at (created_at)
    );
  `);

  // Change sets (proposed changes) table
  db.exec(`
    CREATE TABLE IF NOT EXISTS change_sets (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
      section_type TEXT NOT NULL CHECK (section_type IN ('bullet', 'paragraph', 'sentence', 'section')),
      location TEXT NOT NULL,
      original_text TEXT NOT NULL,
      proposed_text TEXT NOT NULL,
      reasoning TEXT NOT NULL,
      business_impact TEXT NOT NULL,
      confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'modified')) DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      decided_at DATETIME,
      decision_note TEXT,
      
      INDEX idx_conversation_id (conversation_id),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at)
    );
  `);

  // Accepted changes tracking (audit trail)
  db.exec(`
    CREATE TABLE IF NOT EXISTS accepted_changes (
      id TEXT PRIMARY KEY,
      change_set_id TEXT NOT NULL UNIQUE REFERENCES change_sets(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      
      INDEX idx_job_id (job_id),
      INDEX idx_change_set_id (change_set_id)
    );
  `);

  // Analytics events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL CHECK (event_type IN (
        'analysis_started', 'analysis_completed', 'follow_up_asked',
        'recommendation_accepted', 'recommendation_rejected', 'conversation_modified',
        'resume_updated', 'memory_recorded'
      )),
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      details TEXT,
      
      INDEX idx_job_id (job_id),
      INDEX idx_event_type (event_type),
      INDEX idx_timestamp (timestamp)
    );
  `);
}
```

- [ ] **Step 2: Register migration in database.ts**

Open `src/server/db/database.ts` and find the migration initialization. Add this import at the top:

```typescript
import { migrate005 } from "./migrations/005-conversation-tables.js";
```

Then find where migrations are run (likely in an `initDatabase` function) and add:

```typescript
try {
  migrate005(db);
} catch (err: any) {
  if (!err.message.includes("already exists")) {
    throw err;
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/server/db/migrations/005-conversation-tables.ts src/server/db/database.ts
git commit -m "feat: add migration for conversation, changeset, and analytics tables"
```

---

### Task 3: Create Change Set Service

**Files:**
- Create: `src/server/services/change-set.service.ts`

- [ ] **Step 1: Write change set service**

Create `src/server/services/change-set.service.ts`:

```typescript
import { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { ChangeSet } from "../../shared/types.js";

export class ChangeSetService {
  constructor(private db: Database) {}

  /**
   * Create a new proposed change (ChangeSet).
   * Does not apply it yet—just records the proposal.
   */
  createChangeSet(input: {
    conversationId: string;
    analysisId: string;
    sectionType: "bullet" | "paragraph" | "sentence" | "section";
    location: string;
    originalText: string;
    proposedText: string;
    reasoning: string;
    businessImpact: string[];
    confidence: number;
  }): ChangeSet {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO change_sets (
        id, conversation_id, analysis_id, section_type, location,
        original_text, proposed_text, reasoning, business_impact,
        confidence, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `);

    stmt.run(
      id,
      input.conversationId,
      input.analysisId,
      input.sectionType,
      input.location,
      input.originalText,
      input.proposedText,
      input.reasoning,
      JSON.stringify(input.businessImpact),
      input.confidence
    );

    return this.getChangeSetById(id)!;
  }

  /**
   * Get a single change set by ID.
   */
  getChangeSetById(id: string): ChangeSet | null {
    const stmt = this.db.prepare(`
      SELECT * FROM change_sets WHERE id = ?
    `);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.rowToChangeSet(row);
  }

  /**
   * Get all pending changes for a conversation.
   */
  getPendingChanges(conversationId: string): ChangeSet[] {
    const stmt = this.db.prepare(`
      SELECT * FROM change_sets
      WHERE conversation_id = ? AND status = 'pending'
      ORDER BY created_at ASC
    `);
    const rows = stmt.all(conversationId) as any[];
    return rows.map((row) => this.rowToChangeSet(row));
  }

  /**
   * Accept a change set (mark as accepted, record in audit trail).
   */
  acceptChangeSet(changeSetId: string, jobId: string): void {
    const changeSet = this.getChangeSetById(changeSetId);
    if (!changeSet) {
      throw new Error(`ChangeSet ${changeSetId} not found`);
    }

    this.db.prepare(`
      UPDATE change_sets SET status = 'accepted', decided_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(changeSetId);

    // Record in accepted_changes audit trail
    const auditId = uuidv4();
    this.db.prepare(`
      INSERT INTO accepted_changes (id, change_set_id, job_id, accepted_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(auditId, changeSetId, jobId);
  }

  /**
   * Reject a change set with optional note.
   */
  rejectChangeSet(changeSetId: string, note?: string): void {
    this.db.prepare(`
      UPDATE change_sets
      SET status = 'rejected', decided_at = CURRENT_TIMESTAMP, decision_note = ?
      WHERE id = ?
    `).run(note || null, changeSetId);
  }

  /**
   * Modify a change set (e.g., user tweaks proposed text).
   * Creates a new change set with the modified text.
   */
  modifyChangeSet(
    changeSetId: string,
    modifiedText: string,
    modificationNote: string
  ): ChangeSet {
    const original = this.getChangeSetById(changeSetId);
    if (!original) {
      throw new Error(`ChangeSet ${changeSetId} not found`);
    }

    // Mark original as modified
    this.db.prepare(`
      UPDATE change_sets
      SET status = 'modified', decided_at = CURRENT_TIMESTAMP, decision_note = ?
      WHERE id = ?
    `).run(modificationNote, changeSetId);

    // Create new change set with modified text
    return this.createChangeSet({
      conversationId: original.conversation_id,
      analysisId: original.analysis_id,
      sectionType: original.section_type,
      location: original.location,
      originalText: original.original_text,
      proposedText: modifiedText,
      reasoning: `${original.reasoning} (user modified)`,
      businessImpact: JSON.parse(original.business_impact as any),
      confidence: original.confidence,
    });
  }

  /**
   * Get accepted changes for a job (used when generating resume).
   */
  getAcceptedChangesForJob(jobId: string): ChangeSet[] {
    const stmt = this.db.prepare(`
      SELECT cs.* FROM change_sets cs
      INNER JOIN accepted_changes ac ON cs.id = ac.change_set_id
      WHERE ac.job_id = ?
      ORDER BY cs.created_at ASC
    `);
    const rows = stmt.all(jobId) as any[];
    return rows.map((row) => this.rowToChangeSet(row));
  }

  /**
   * Private helper: convert DB row to ChangeSet object.
   */
  private rowToChangeSet(row: any): ChangeSet {
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      analysis_id: row.analysis_id,
      section_type: row.section_type,
      location: row.location,
      original_text: row.original_text,
      proposed_text: row.proposed_text,
      reasoning: row.reasoning,
      business_impact: JSON.parse(row.business_impact),
      confidence: row.confidence,
      status: row.status,
      created_at: row.created_at,
      decided_at: row.decided_at || undefined,
      decision_note: row.decision_note || undefined,
    };
  }
}

export function createChangeSetService(db: Database): ChangeSetService {
  return new ChangeSetService(db);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/server/services/change-set.service.ts
git commit -m "feat: add change set service for managing proposed changes"
```

---

### Task 4: Create Prompt Builder Service

**Files:**
- Create: `src/server/services/prompt-builder.service.ts`

- [ ] **Step 1: Write prompt builder service**

Create `src/server/services/prompt-builder.service.ts`:

```typescript
import { readFileSync } from "fs";
import { resolve } from "path";
import { CareerDocument } from "../../shared/types.js";

export interface PromptContext {
  careerDoc: CareerDocument;
  jobDescription: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  previousChanges?: Array<{
    location: string;
    original: string;
    proposed: string;
  }>;
  userTone?: "formal" | "casual" | "balanced";
  positioningAngle?: string;
  atsLevel?: "aggressive" | "balanced" | "minimal";
  companySpecificNotes?: string;
}

/**
 * Modular prompt builder.
 * Composes prompts from reusable sections and context.
 */
export class PromptBuilder {
  /**
   * Build a prompt for refining a specific section based on follow-up.
   * Used when user asks for a specific modification.
   */
  static buildRefinementPrompt(context: PromptContext): string {
    const sections = [
      this.buildSystemSection(),
      this.buildCareerDocContext(context.careerDoc),
      this.buildJobContext(context.jobDescription),
      this.buildConversationHistory(context.conversationHistory),
      this.buildUserPreferences(
        context.userTone,
        context.positioningAngle,
        context.atsLevel,
        context.companySpecificNotes
      ),
      this.buildRefinementInstructions(),
    ];

    return sections.filter((s) => s.length > 0).join("\n\n");
  }

  /**
   * Build a prompt for generating follow-up questions after initial analysis.
   */
  static buildFollowUpPrompt(context: {
    careerDoc: CareerDocument;
    jobDescription: string;
    previousAnalysis: any;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  }): string {
    const sections = [
      this.buildSystemSection(),
      this.buildCareerDocContext(context.careerDoc),
      this.buildJobContext(context.jobDescription),
      this.buildFollowUpInstructions(context.previousAnalysis),
      this.buildConversationHistory(context.conversationHistory),
    ];

    return sections.filter((s) => s.length > 0).join("\n\n");
  }

  private static buildSystemSection(): string {
    return `You are an expert recruiter helping refine a candidate's resume positioning for specific job opportunities.

Your role is to:
1. Propose concrete, evidence-backed changes to resume content
2. Ensure every claim maps directly to the Master Career Document
3. Optimize for both ATS matching and human readability
4. Maintain truthfulness above all else`;
  }

  private static buildCareerDocContext(careerDoc: CareerDocument): string {
    return `## Master Career Document (Source of Truth)

${JSON.stringify(careerDoc, null, 2)}

Every recommendation MUST cite this document. Use DIRECT for exact matches, TRANSFERABLE for related skills requiring adaptation, ADJACENT for adjacent skills, and GAP only when there's no evidence.`;
  }

  private static buildJobContext(jobDescription: string): string {
    return `## Job Description

${jobDescription}`;
  }

  private static buildConversationHistory(
    history?: Array<{ role: "user" | "assistant"; content: string }>
  ): string {
    if (!history || history.length === 0) return "";

    const formatted = history
      .map((msg) => `**${msg.role === "user" ? "User" : "Assistant"}:** ${msg.content}`)
      .join("\n");

    return `## Conversation History

${formatted}`;
  }

  private static buildUserPreferences(
    tone?: string,
    angle?: string,
    atsLevel?: string,
    companyNotes?: string
  ): string {
    const prefs = [];

    if (tone) prefs.push(`- **Tone:** ${tone}`);
    if (angle) prefs.push(`- **Positioning Angle:** ${angle}`);
    if (atsLevel) prefs.push(`- **ATS Optimization:** ${atsLevel}`);
    if (companyNotes) prefs.push(`- **Company Context:** ${companyNotes}`);

    if (prefs.length === 0) return "";

    return `## User Preferences\n\n${prefs.join("\n")}`;
  }

  private static buildRefinementInstructions(): string {
    return `## Task: Propose Refinements

Based on the above context, suggest 2-3 specific refinements to the resume content. For each:

1. **Location:** Where in the resume (e.g., "experience[0].description")
2. **Current Text:** Exact text from career document
3. **Proposed Text:** Your refined version
4. **Reasoning:** Why this change helps for THIS job
5. **Business Impact:** 2-3 bullet points (better ATS match, stronger leadership positioning, etc.)
6. **Confidence:** 0-1 score of how confident you are in this change

Format as JSON:
\`\`\`json
{
  "refinements": [
    {
      "location": "...",
      "current": "...",
      "proposed": "...",
      "reasoning": "...",
      "impact": ["...", "..."],
      "confidence": 0.85
    }
  ]
}
\`\`\`

RULES:
- NEVER invent skills or experience
- NEVER fabricate metrics
- Map every refinement to the Master Career Document
- Optimize for the specific job, not generic resumes`;
  }

  private static buildFollowUpInstructions(previousAnalysis: any): string {
    return `## Task: Generate Follow-Up Questions

Based on the initial analysis and conversation so far, suggest 3-4 follow-up refinement questions to help the user strengthen their candidacy for THIS job.

Format:
\`\`\`json
{
  "questions": [
    {
      "question": "Would emphasizing [specific skill] help for this role?",
      "suggestedReframings": [
        { "from": "...", "to": "..." }
      ]
    }
  ]
}
\`\`\`

RULES:
- Questions should be actionable and specific to THIS job
- Each suggestion must map to the Master Career Document
- Focus on positioning, not fabrication`;
  }
}

export function createPromptBuilder(): typeof PromptBuilder {
  return PromptBuilder;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/server/services/prompt-builder.service.ts
git commit -m "feat: add modular prompt builder service"
```

---

### Task 5: Create Conversation Service

**Files:**
- Create: `src/server/services/conversation.service.ts`

- [ ] **Step 1: Write conversation service**

Create `src/server/services/conversation.service.ts`:

```typescript
import { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import {
  Conversation,
  ConversationMemory,
  ConversationMessage,
} from "../../shared/types.js";
import { ChangeSetService } from "./change-set.service.js";
import { ClaudeService } from "./claude.service.js";
import { PromptBuilder, PromptContext } from "./prompt-builder.service.js";
import { CareerDocService } from "./career-doc.service.js";
import { AnalysisService } from "./analysis.service.js";

export class ConversationService {
  private changeSetService: ChangeSetService;

  constructor(
    private db: Database,
    private claudeService: ClaudeService,
    private careerDocService: CareerDocService,
    private analysisService: AnalysisService
  ) {
    this.changeSetService = new ChangeSetService(db);
  }

  /**
   * Start a new conversation for a job analysis.
   */
  async startConversation(input: {
    jobId: string;
    analysisId: string;
  }): Promise<Conversation> {
    const conversationId = uuidv4();
    const emptyMemory: ConversationMemory = {
      accepted_changes: [],
      rejected_changes: [],
    };

    this.db.prepare(`
      INSERT INTO conversations (id, job_id, analysis_id, status, memory)
      VALUES (?, ?, ?, 'active', ?)
    `).run(conversationId, input.jobId, input.analysisId, JSON.stringify(emptyMemory));

    return this.getConversation(conversationId)!;
  }

  /**
   * Get a conversation by ID.
   */
  getConversation(conversationId: string): Conversation | null {
    const stmt = this.db.prepare(`
      SELECT * FROM conversations WHERE id = ?
    `);
    const row = stmt.get(conversationId) as any;
    if (!row) return null;

    return {
      id: row.id,
      job_id: row.job_id,
      analysis_id: row.analysis_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      status: row.status,
      memory: JSON.parse(row.memory),
    };
  }

  /**
   * Get conversation by job ID (should be unique).
   */
  getConversationByJobId(jobId: string): Conversation | null {
    const stmt = this.db.prepare(`
      SELECT * FROM conversations WHERE job_id = ? ORDER BY created_at DESC LIMIT 1
    `);
    const row = stmt.get(jobId) as any;
    if (!row) return null;

    return {
      id: row.id,
      job_id: row.job_id,
      analysis_id: row.analysis_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      status: row.status,
      memory: JSON.parse(row.memory),
    };
  }

  /**
   * Add a user message to the conversation.
   */
  addUserMessage(conversationId: string, content: string): ConversationMessage {
    return this.addMessage(conversationId, "user", content, "chat");
  }

  /**
   * Add an assistant message to the conversation.
   */
  addAssistantMessage(
    conversationId: string,
    content: string,
    messageType: "chat" | "question" | "suggestion" | "confirmation" = "chat"
  ): ConversationMessage {
    return this.addMessage(conversationId, "assistant", content, messageType);
  }

  /**
   * Get all messages in a conversation.
   */
  getConversationMessages(conversationId: string): ConversationMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM conversation_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `);
    const rows = stmt.all(conversationId) as any[];
    return rows.map((row) => ({
      id: row.id,
      conversation_id: row.conversation_id,
      role: row.role,
      content: row.content,
      created_at: row.created_at,
      message_type: row.message_type,
    }));
  }

  /**
   * Update conversation memory (accepted/rejected changes, preferences).
   */
  updateMemory(
    conversationId: string,
    memory: Partial<ConversationMemory>
  ): ConversationMemory {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const updated: ConversationMemory = {
      ...conversation.memory,
      ...memory,
    };

    this.db.prepare(`
      UPDATE conversations SET memory = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(updated), conversationId);

    return updated;
  }

  /**
   * Accept a proposed change and update conversation memory.
   */
  acceptChange(conversationId: string, changeSetId: string, jobId: string): void {
    this.changeSetService.acceptChangeSet(changeSetId, jobId);

    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    this.updateMemory(conversationId, {
      accepted_changes: [...conversation.memory.accepted_changes, changeSetId],
    });
  }

  /**
   * Reject a proposed change and update conversation memory.
   */
  rejectChange(conversationId: string, changeSetId: string, note?: string): void {
    this.changeSetService.rejectChangeSet(changeSetId, note);

    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    this.updateMemory(conversationId, {
      rejected_changes: [...conversation.memory.rejected_changes, changeSetId],
    });
  }

  /**
   * Modify a change (user tweaks proposed text).
   */
  modifyChange(conversationId: string, changeSetId: string, modifiedText: string): string {
    const newChangeSet = this.changeSetService.modifyChangeSet(
      changeSetId,
      modifiedText,
      "User modified"
    );

    // Don't auto-accept modified changes; let user confirm
    return newChangeSet.id;
  }

  /**
   * Private helper to add a message.
   */
  private addMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    messageType: "chat" | "question" | "suggestion" | "confirmation"
  ): ConversationMessage {
    const messageId = uuidv4();

    this.db.prepare(`
      INSERT INTO conversation_messages (
        id, conversation_id, role, content, message_type, created_at
      )
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(messageId, conversationId, role, content, messageType);

    return {
      id: messageId,
      conversation_id: conversationId,
      role,
      content,
      created_at: new Date().toISOString(),
      message_type: messageType,
    };
  }
}

export function createConversationService(
  db: Database,
  claudeService: ClaudeService,
  careerDocService: CareerDocService,
  analysisService: AnalysisService
): ConversationService {
  return new ConversationService(db, claudeService, careerDocService, analysisService);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/server/services/conversation.service.ts
git commit -m "feat: add conversation service for managing refinement workflows"
```

---

### Task 6: Create Analytics Service

**Files:**
- Create: `src/server/services/analytics.service.ts`

- [ ] **Step 1: Write analytics service**

Create `src/server/services/analytics.service.ts`:

```typescript
import { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { AnalyticsEvent } from "../../shared/types.js";

export type EventType =
  | "analysis_started"
  | "analysis_completed"
  | "follow_up_asked"
  | "recommendation_accepted"
  | "recommendation_rejected"
  | "conversation_modified"
  | "resume_updated"
  | "memory_recorded";

export class AnalyticsService {
  constructor(private db: Database) {}

  /**
   * Log an analytics event.
   */
  logEvent(input: {
    jobId: string;
    eventType: EventType;
    conversationId?: string;
    details?: Record<string, any>;
  }): AnalyticsEvent {
    const id = uuidv4();

    this.db.prepare(`
      INSERT INTO analytics_events (
        id, job_id, conversation_id, event_type, timestamp, details
      )
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `).run(
      id,
      input.jobId,
      input.conversationId || null,
      input.eventType,
      input.details ? JSON.stringify(input.details) : null
    );

    return {
      id,
      job_id: input.jobId,
      conversation_id: input.conversationId,
      event_type: input.eventType,
      timestamp: new Date().toISOString(),
      details: input.details,
    };
  }

  /**
   * Get events for a job.
   */
  getJobEvents(jobId: string): AnalyticsEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM analytics_events
      WHERE job_id = ?
      ORDER BY timestamp ASC
    `);
    const rows = stmt.all(jobId) as any[];
    return rows.map((row) => ({
      id: row.id,
      job_id: row.job_id,
      conversation_id: row.conversation_id,
      event_type: row.event_type,
      timestamp: row.timestamp,
      details: row.details ? JSON.parse(row.details) : undefined,
    }));
  }

  /**
   * Get events for a conversation.
   */
  getConversationEvents(conversationId: string): AnalyticsEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM analytics_events
      WHERE conversation_id = ?
      ORDER BY timestamp ASC
    `);
    const rows = stmt.all(conversationId) as any[];
    return rows.map((row) => ({
      id: row.id,
      job_id: row.job_id,
      conversation_id: row.conversation_id,
      event_type: row.event_type,
      timestamp: row.timestamp,
      details: row.details ? JSON.parse(row.details) : undefined,
    }));
  }

  /**
   * Get summary stats for a time period.
   */
  getSummaryStats(input?: { startDate?: string; endDate?: string }): {
    totalAnalysesStarted: number;
    totalAnalysesCompleted: number;
    totalRecommendationsAccepted: number;
    totalRecommendationsRejected: number;
    totalResumesUpdated: number;
  } {
    let query = `
      SELECT 
        SUM(CASE WHEN event_type = 'analysis_started' THEN 1 ELSE 0 END) as analyses_started,
        SUM(CASE WHEN event_type = 'analysis_completed' THEN 1 ELSE 0 END) as analyses_completed,
        SUM(CASE WHEN event_type = 'recommendation_accepted' THEN 1 ELSE 0 END) as recommendations_accepted,
        SUM(CASE WHEN event_type = 'recommendation_rejected' THEN 1 ELSE 0 END) as recommendations_rejected,
        SUM(CASE WHEN event_type = 'resume_updated' THEN 1 ELSE 0 END) as resumes_updated
      FROM analytics_events
    `;

    const where = [];
    const params = [];

    if (input?.startDate) {
      where.push("timestamp >= ?");
      params.push(input.startDate);
    }
    if (input?.endDate) {
      where.push("timestamp <= ?");
      params.push(input.endDate);
    }

    if (where.length > 0) {
      query += " WHERE " + where.join(" AND ");
    }

    const stmt = this.db.prepare(query);
    const result = stmt.get(...params) as any;

    return {
      totalAnalysesStarted: result.analyses_started || 0,
      totalAnalysesCompleted: result.analyses_completed || 0,
      totalRecommendationsAccepted: result.recommendations_accepted || 0,
      totalRecommendationsRejected: result.recommendations_rejected || 0,
      totalResumesUpdated: result.resumes_updated || 0,
    };
  }
}

export function createAnalyticsService(db: Database): AnalyticsService {
  return new AnalyticsService(db);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/server/services/analytics.service.ts
git commit -m "feat: add analytics service for event tracking"
```

---

### Task 7: Create Conversation Routes

**Files:**
- Create: `src/server/routes/conversation.ts`

- [ ] **Step 1: Write conversation routes**

Create `src/server/routes/conversation.ts`:

```typescript
import { Router, Request, Response } from "express";
import { getDatabase } from "../db/database.js";
import { createConversationService } from "../services/conversation.service.js";
import { createChangeSetService } from "../services/change-set.service.js";
import { createAnalyticsService } from "../services/analytics.service.js";
import { initializeClaudeService } from "../services/claude.service.js";
import { createCareerDocService } from "../services/career-doc.service.js";
import { createSettingsService } from "../services/settings.service.js";
import { AnalysisService } from "../services/analysis.service.js";
import { PromptBuilder } from "../services/prompt-builder.service.js";

const router = Router();

/**
 * POST /api/conversations/start
 * Start a new conversation for a job analysis.
 */
router.post("/conversations/start", (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { jobId, analysisId } = req.body;

    if (!jobId || !analysisId) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "jobId and analysisId are required",
      });
    }

    const conversationService = createConversationService(
      db,
      initializeClaudeService(),
      createCareerDocService(db),
      new AnalysisService(db, initializeClaudeService())
    );

    const conversation = conversationService.startConversation({ jobId, analysisId });

    const analyticsService = createAnalyticsService(db);
    analyticsService.logEvent({
      jobId,
      eventType: "analysis_started",
      conversationId: conversation.id,
    });

    res.status(201).json(conversation);
  } catch (err: any) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: err.message,
    });
  }
});

/**
 * GET /api/conversations/:id
 * Get a conversation with all its messages and change sets.
 */
router.get("/conversations/:id", (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const conversationService = createConversationService(
      db,
      initializeClaudeService(),
      createCareerDocService(db),
      new AnalysisService(db, initializeClaudeService())
    );

    const conversation = conversationService.getConversation(id);
    if (!conversation) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Conversation ${id} not found`,
      });
    }

    const messages = conversationService.getConversationMessages(id);
    const changeSetService = createChangeSetService(db);
    const pendingChanges = changeSetService.getPendingChanges(id);

    res.json({
      conversation,
      messages,
      pendingChanges,
    });
  } catch (err: any) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: err.message,
    });
  }
});

/**
 * POST /api/conversations/:id/message
 * Add a user or assistant message to the conversation.
 */
router.post("/conversations/:id/message", (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { content, role = "user", messageType = "chat" } = req.body;

    if (!content) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "content is required",
      });
    }

    const conversationService = createConversationService(
      db,
      initializeClaudeService(),
      createCareerDocService(db),
      new AnalysisService(db, initializeClaudeService())
    );

    const conversation = conversationService.getConversation(id);
    if (!conversation) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: `Conversation ${id} not found`,
      });
    }

    const message =
      role === "user"
        ? conversationService.addUserMessage(id, content)
        : conversationService.addAssistantMessage(id, content, messageType);

    res.status(201).json(message);
  } catch (err: any) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: err.message,
    });
  }
});

/**
 * POST /api/conversations/:id/accept-change
 * Accept a proposed change set.
 */
router.post("/conversations/:id/accept-change", (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { changeSetId, jobId } = req.body;

    if (!changeSetId || !jobId) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "changeSetId and jobId are required",
      });
    }

    const conversationService = createConversationService(
      db,
      initializeClaudeService(),
      createCareerDocService(db),
      new AnalysisService(db, initializeClaudeService())
    );

    conversationService.acceptChange(id, changeSetId, jobId);

    const analyticsService = createAnalyticsService(db);
    analyticsService.logEvent({
      jobId,
      eventType: "recommendation_accepted",
      conversationId: id,
      details: { changeSetId },
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: err.message,
    });
  }
});

/**
 * POST /api/conversations/:id/reject-change
 * Reject a proposed change set.
 */
router.post("/conversations/:id/reject-change", (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { changeSetId, note } = req.body;

    if (!changeSetId) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "changeSetId is required",
      });
    }

    const conversationService = createConversationService(
      db,
      initializeClaudeService(),
      createCareerDocService(db),
      new AnalysisService(db, initializeClaudeService())
    );

    conversationService.rejectChange(id, changeSetId, note);

    const conversation = conversationService.getConversation(id);
    const analyticsService = createAnalyticsService(db);
    analyticsService.logEvent({
      jobId: conversation!.job_id,
      eventType: "recommendation_rejected",
      conversationId: id,
      details: { changeSetId, note },
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: err.message,
    });
  }
});

/**
 * POST /api/conversations/:id/modify-change
 * Modify a proposed change (user tweaks text).
 */
router.post("/conversations/:id/modify-change", (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { changeSetId, modifiedText } = req.body;

    if (!changeSetId || !modifiedText) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "changeSetId and modifiedText are required",
      });
    }

    const conversationService = createConversationService(
      db,
      initializeClaudeService(),
      createCareerDocService(db),
      new AnalysisService(db, initializeClaudeService())
    );

    const newChangeSetId = conversationService.modifyChange(id, changeSetId, modifiedText);

    const conversation = conversationService.getConversation(id);
    const analyticsService = createAnalyticsService(db);
    analyticsService.logEvent({
      jobId: conversation!.job_id,
      eventType: "conversation_modified",
      conversationId: id,
      details: { originalChangeSetId: changeSetId, newChangeSetId },
    });

    res.json({ success: true, newChangeSetId });
  } catch (err: any) {
    res.status(500).json({
      code: "SERVER_ERROR",
      message: err.message,
    });
  }
});

export default router;
```

- [ ] **Step 2: Register routes in server**

Open `src/server/index.ts` and add this import after the existing route imports:

```typescript
import conversationRouter from "./routes/conversation.js";
```

Then add this route registration after the existing routes (around line 46):

```typescript
app.use("/api", conversationRouter);
```

- [ ] **Step 3: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/server/routes/conversation.ts src/server/index.ts
git commit -m "feat: add conversation API endpoints"
```

---

### Task 8: Create useConversation Hook

**Files:**
- Create: `src/client/features/jobs/hooks/useConversation.ts`

- [ ] **Step 1: Write hook**

Create `src/client/features/jobs/hooks/useConversation.ts`:

```typescript
import { useState, useCallback, useEffect } from "react";
import {
  Conversation,
  ConversationMessage,
  ChangeSet,
} from "../../../shared/types.js";

interface UseConversationState {
  conversation: Conversation | null;
  messages: ConversationMessage[];
  pendingChanges: ChangeSet[];
  loading: boolean;
  error: string | null;
}

export function useConversation(conversationId: string | null) {
  const [state, setState] = useState<UseConversationState>({
    conversation: null,
    messages: [],
    pendingChanges: [],
    loading: false,
    error: null,
  });

  // Fetch conversation on ID change
  useEffect(() => {
    if (!conversationId) {
      setState((prev) => ({
        ...prev,
        conversation: null,
        messages: [],
        pendingChanges: [],
      }));
      return;
    }

    const fetchConversation = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const res = await fetch(`/api/conversations/${conversationId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch conversation: ${res.statusText}`);
        }
        const data = await res.json();
        setState({
          conversation: data.conversation,
          messages: data.messages,
          pendingChanges: data.pendingChanges,
          loading: false,
          error: null,
        });
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err.message,
        }));
      }
    };

    fetchConversation();
  }, [conversationId]);

  const addMessage = useCallback(
    async (content: string, role: "user" | "assistant" = "user") => {
      if (!conversationId) return;

      try {
        const res = await fetch(`/api/conversations/${conversationId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, role, messageType: "chat" }),
        });

        if (!res.ok) throw new Error("Failed to add message");
        const newMessage = await res.json();

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, newMessage],
        }));

        return newMessage;
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          error: err.message,
        }));
      }
    },
    [conversationId]
  );

  const acceptChange = useCallback(
    async (changeSetId: string, jobId: string) => {
      if (!conversationId) return;

      try {
        const res = await fetch(`/api/conversations/${conversationId}/accept-change`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ changeSetId, jobId }),
        });

        if (!res.ok) throw new Error("Failed to accept change");

        // Optimistically update local state
        setState((prev) => ({
          ...prev,
          pendingChanges: prev.pendingChanges.map((cs) =>
            cs.id === changeSetId ? { ...cs, status: "accepted" } : cs
          ),
        }));
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          error: err.message,
        }));
      }
    },
    [conversationId]
  );

  const rejectChange = useCallback(
    async (changeSetId: string, note?: string) => {
      if (!conversationId) return;

      try {
        const res = await fetch(`/api/conversations/${conversationId}/reject-change`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ changeSetId, note }),
        });

        if (!res.ok) throw new Error("Failed to reject change");

        // Optimistically update local state
        setState((prev) => ({
          ...prev,
          pendingChanges: prev.pendingChanges.map((cs) =>
            cs.id === changeSetId ? { ...cs, status: "rejected" } : cs
          ),
        }));
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          error: err.message,
        }));
      }
    },
    [conversationId]
  );

  const modifyChange = useCallback(
    async (changeSetId: string, modifiedText: string) => {
      if (!conversationId) return;

      try {
        const res = await fetch(`/api/conversations/${conversationId}/modify-change`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ changeSetId, modifiedText }),
        });

        if (!res.ok) throw new Error("Failed to modify change");
        const data = await res.json();

        // Refetch conversation to update with new change set
        const getRes = await fetch(`/api/conversations/${conversationId}`);
        if (getRes.ok) {
          const updated = await getRes.json();
          setState((prev) => ({
            ...prev,
            pendingChanges: updated.pendingChanges,
          }));
        }

        return data.newChangeSetId;
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          error: err.message,
        }));
      }
    },
    [conversationId]
  );

  return {
    ...state,
    addMessage,
    acceptChange,
    rejectChange,
    modifyChange,
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/client/features/jobs/hooks/useConversation.ts
git commit -m "feat: add useConversation hook for managing conversation state"
```

---

### Task 9: Create ConfirmationCard Component

**Files:**
- Create: `src/client/features/jobs/components/ConfirmationCard.tsx`

- [ ] **Step 1: Write component**

Create `src/client/features/jobs/components/ConfirmationCard.tsx`:

```typescript
import React, { useState } from "react";
import { ChangeSet } from "../../../shared/types.js";
import { DiffViewer } from "./DiffViewer.js";
import "../styles/confirmation-card.css";

interface ConfirmationCardProps {
  changeset: ChangeSet;
  onAccept: (changeSetId: string) => void;
  onReject: (changeSetId: string) => void;
  onModify: (changeSetId: string, modifiedText: string) => void;
  isLoading?: boolean;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  changeset,
  onAccept,
  onReject,
  onModify,
  isLoading = false,
}) => {
  const [showModifyForm, setShowModifyForm] = useState(false);
  const [modifiedText, setModifiedText] = useState(changeset.proposed_text);

  const handleModifySubmit = () => {
    onModify(changeset.id, modifiedText);
    setShowModifyForm(false);
  };

  const confidencePercentage = Math.round(changeset.confidence * 100);

  return (
    <div className="confirmation-card">
      <div className="card-header">
        <h3 className="card-title">
          {changeset.section_type === "bullet"
            ? "Bullet Point Refinement"
            : changeset.section_type === "paragraph"
              ? "Paragraph Refinement"
              : changeset.section_type === "sentence"
                ? "Sentence Refinement"
                : "Section Refinement"}
        </h3>
        <div className="confidence-badge">
          {confidencePercentage}% confident
        </div>
      </div>

      <div className="card-content">
        <div className="diff-section">
          <h4>Current vs. Proposed</h4>
          <DiffViewer
            original={changeset.original_text}
            proposed={changeset.proposed_text}
          />
        </div>

        <div className="reasoning-section">
          <h4>Why This Change?</h4>
          <p className="reasoning-text">{changeset.reasoning}</p>
        </div>

        <div className="impact-section">
          <h4>Business Impact</h4>
          <ul className="impact-list">
            {changeset.business_impact.map((impact, idx) => (
              <li key={idx}>{impact}</li>
            ))}
          </ul>
        </div>

        {showModifyForm && (
          <div className="modify-form">
            <label htmlFor={`modify-textarea-${changeset.id}`}>
              Refine the proposed text:
            </label>
            <textarea
              id={`modify-textarea-${changeset.id}`}
              value={modifiedText}
              onChange={(e) => setModifiedText(e.target.value)}
              className="modify-textarea"
              placeholder="Edit the proposed text here..."
            />
            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={handleModifySubmit}
                disabled={isLoading || !modifiedText.trim()}
              >
                Apply Modification
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowModifyForm(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card-actions">
        {!showModifyForm ? (
          <>
            <button
              className="btn btn-accept"
              onClick={() => onAccept(changeset.id)}
              disabled={isLoading}
            >
              Accept
            </button>
            <button
              className="btn btn-modify"
              onClick={() => setShowModifyForm(true)}
              disabled={isLoading}
            >
              Modify
            </button>
            <button
              className="btn btn-reject"
              onClick={() => onReject(changeset.id)}
              disabled={isLoading}
            >
              Reject
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create styling**

Create `src/client/features/jobs/styles/confirmation-card.css`:

```css
.confirmation-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.confidence-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  background: #dbeafe;
  color: #0369a1;
  font-size: 12px;
  font-weight: 500;
}

.card-content {
  margin-bottom: 16px;
}

.diff-section,
.reasoning-section,
.impact-section {
  margin-bottom: 16px;
}

.diff-section h4,
.reasoning-section h4,
.impact-section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.reasoning-text {
  margin: 0;
  padding: 8px;
  background: #f9fafb;
  border-left: 3px solid #3b82f6;
  border-radius: 4px;
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
}

.impact-list {
  margin: 0;
  padding-left: 20px;
  list-style: disc;
}

.impact-list li {
  margin-bottom: 6px;
  font-size: 14px;
  color: #374151;
}

.modify-form {
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 12px;
  margin: 16px 0;
}

.modify-form label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.modify-textarea {
  width: 100%;
  min-height: 100px;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace;
  font-size: 13px;
  resize: vertical;
  margin-bottom: 10px;
}

.form-actions {
  display: flex;
  gap: 8px;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.btn {
  padding: 8px 14px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #d1d5db;
}

.btn-accept {
  background: #10b981;
  color: white;
  flex: 1;
}

.btn-accept:hover:not(:disabled) {
  background: #059669;
}

.btn-modify {
  background: #f59e0b;
  color: white;
  flex: 1;
}

.btn-modify:hover:not(:disabled) {
  background: #d97706;
}

.btn-reject {
  background: #ef4444;
  color: white;
  flex: 1;
}

.btn-reject:hover:not(:disabled) {
  background: #dc2626;
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/client/features/jobs/components/ConfirmationCard.tsx src/client/features/jobs/styles/confirmation-card.css
git commit -m "feat: add ConfirmationCard component for reviewing proposed changes"
```

---

### Task 10: Create DiffViewer Component

**Files:**
- Create: `src/client/features/jobs/components/DiffViewer.tsx`

- [ ] **Step 1: Install diff library**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
npm install diff-match-patch
npm install --save-dev @types/diff-match-patch
```

- [ ] **Step 2: Write component**

Create `src/client/features/jobs/components/DiffViewer.tsx`:

```typescript
import React, { useMemo } from "react";
import DiffMatchPatch from "diff-match-patch";
import "../styles/diff-viewer.css";

interface DiffViewerProps {
  original: string;
  proposed: string;
}

interface DiffSegment {
  type: "add" | "remove" | "equal";
  text: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ original, proposed }) => {
  const diffs = useMemo(() => {
    const dmp = new DiffMatchPatch.diff_match_patch();
    const rawDiffs = dmp.diff_main(original, proposed);
    dmp.diff_cleanupSemantic(rawDiffs);

    return rawDiffs.map(([operation, text]): DiffSegment => {
      if (operation === -1) return { type: "remove", text };
      if (operation === 1) return { type: "add", text };
      return { type: "equal", text };
    });
  }, [original, proposed]);

  return (
    <div className="diff-viewer">
      <div className="diff-content">
        {diffs.map((segment, idx) => {
          if (segment.type === "equal") {
            return (
              <span key={idx} className="diff-equal">
                {segment.text}
              </span>
            );
          } else if (segment.type === "add") {
            return (
              <span key={idx} className="diff-add">
                {segment.text}
              </span>
            );
          } else {
            return (
              <span key={idx} className="diff-remove">
                {segment.text}
              </span>
            );
          }
        })}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Create styling**

Create `src/client/features/jobs/styles/diff-viewer.css`:

```css
.diff-viewer {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
  font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #374151;
}

.diff-content {
  word-wrap: break-word;
  white-space: pre-wrap;
}

.diff-equal {
  color: #374151;
  background: transparent;
}

.diff-add {
  background: #dcfce7;
  color: #166534;
  text-decoration: underline;
  text-decoration-color: #22c55e;
  text-underline-offset: 2px;
}

.diff-remove {
  background: #fee2e2;
  color: #991b1b;
  text-decoration: line-through;
  text-decoration-color: #ef4444;
  text-decoration-thickness: 1px;
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/client/features/jobs/components/DiffViewer.tsx src/client/features/jobs/styles/diff-viewer.css package.json package-lock.json
git commit -m "feat: add DiffViewer component for inline change visualization"
```

---

### Task 11: Create ConversationPanel Component

**Files:**
- Create: `src/client/features/jobs/components/ConversationPanel.tsx`

- [ ] **Step 1: Write component**

Create `src/client/features/jobs/components/ConversationPanel.tsx`:

```typescript
import React, { useState, useRef, useEffect } from "react";
import { useConversation } from "../hooks/useConversation.js";
import { ConfirmationCard } from "./ConfirmationCard.js";
import "../styles/conversation-panel.css";

interface ConversationPanelProps {
  jobId: string;
  conversationId: string | null;
  onStartConversation?: (conversationId: string) => void;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  jobId,
  conversationId,
  onStartConversation,
}) => {
  const { conversation, messages, pendingChanges, addMessage, acceptChange, rejectChange, modifyChange, loading, error } = useConversation(conversationId);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmitMessage = async () => {
    if (!inputValue.trim() || !conversationId) return;

    setIsSubmitting(true);
    const message = inputValue;
    setInputValue("");

    try {
      await addMessage(message, "user");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!conversationId) {
    return (
      <div className="conversation-panel empty-state">
        <p>Start an analysis to begin refining your resume.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="conversation-panel loading">
        <p>Loading conversation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conversation-panel error">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="conversation-panel">
      <div className="conversation-header">
        <h2>Resume Refinement Chat</h2>
        {conversation && (
          <div className="status-indicator">
            {pendingChanges.length > 0 && (
              <span className="pending-badge">{pendingChanges.length} pending</span>
            )}
          </div>
        )}
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet. Start by asking about this job or your background.</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.role}-message`}
              >
                <div className="message-role">
                  {message.role === "user" ? "You" : "AI Assistant"}
                </div>
                <div className="message-content">{message.content}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {pendingChanges.length > 0 && (
        <div className="pending-changes-section">
          <h3>Proposed Changes</h3>
          {pendingChanges
            .filter((cs) => cs.status === "pending")
            .map((changeset) => (
              <ConfirmationCard
                key={changeset.id}
                changeset={changeset}
                onAccept={() => acceptChange(changeset.id, jobId)}
                onReject={() => rejectChange(changeset.id)}
                onModify={(id, text) => modifyChange(id, text)}
                isLoading={isSubmitting}
              />
            ))}
        </div>
      )}

      <div className="input-section">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmitMessage();
            }
          }}
          placeholder="Ask about this role or your background..."
          className="message-input"
          disabled={isSubmitting}
        />
        <button
          onClick={handleSubmitMessage}
          disabled={!inputValue.trim() || isSubmitting}
          className="send-button"
        >
          {isSubmitting ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create styling**

Create `src/client/features/jobs/styles/conversation-panel.css`:

```css
.conversation-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  border-left: 1px solid #e5e7eb;
}

.conversation-panel.empty-state,
.conversation-panel.loading,
.conversation-panel.error {
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.conversation-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.status-indicator {
  display: flex;
  gap: 8px;
}

.pending-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  background: #fef08a;
  color: #854d0e;
  font-size: 12px;
  font-weight: 500;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
  padding: 20px;
}

.message {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-message {
  align-items: flex-end;
}

.user-message .message-content {
  background: #3b82f6;
  color: white;
}

.assistant-message {
  align-items: flex-start;
}

.assistant-message .message-content {
  background: #f3f4f6;
  color: #111827;
}

.message-role {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  padding: 0 12px;
}

.message-content {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  max-width: 80%;
  word-wrap: break-word;
}

.pending-changes-section {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
  max-height: 40%;
  overflow-y: auto;
}

.pending-changes-section h3 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-section {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.message-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
}

.message-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.message-input:disabled {
  background: #f3f4f6;
  color: #9ca3af;
}

.send-button {
  padding: 10px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.send-button:hover:not(:disabled) {
  background: #2563eb;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/client/features/jobs/components/ConversationPanel.tsx src/client/features/jobs/styles/conversation-panel.css
git commit -m "feat: add ConversationPanel component for chat-based refinement"
```

---

### Task 12: Update StudioPanel to Integrate Conversation

**Files:**
- Modify: `src/client/features/jobs/components/StudioPanel.tsx`

- [ ] **Step 1: Read current file**

Open and read `src/client/features/jobs/components/StudioPanel.tsx`.

- [ ] **Step 2: Add conversation integration**

After the existing imports, add:

```typescript
import { ConversationPanel } from "./ConversationPanel.js";
```

In the component's JSX, after the existing panels, add a condition to show ConversationPanel when a conversation is active:

```typescript
{activeConversation && (
  <ConversationPanel
    jobId={currentJob.id}
    conversationId={activeConversation}
  />
)}
```

Add state for tracking active conversation:

```typescript
const [activeConversation, setActiveConversation] = useState<string | null>(null);
```

When analysis completes, start a conversation:

```typescript
// After successful analysis
const conversationRes = await fetch("/api/conversations/start", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jobId: currentJob.id,
    analysisId: result.id,
  }),
});
if (conversationRes.ok) {
  const conversation = await conversationRes.json();
  setActiveConversation(conversation.id);
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/client/features/jobs/components/StudioPanel.tsx
git commit -m "feat: integrate conversation panel into studio"
```

---

### Task 13: Write Unit Tests for Conversation Service

**Files:**
- Create: `src/server/services/__tests__/conversation.service.test.ts`

- [ ] **Step 1: Write tests**

Create `src/server/services/__tests__/conversation.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { ConversationService } from "../conversation.service.js";
import { ChangeSetService } from "../change-set.service.js";
import { initDatabase } from "../../db/database.js";
import { v4 as uuidv4 } from "uuid";

describe("ConversationService", () => {
  let db: Database.Database;
  let conversationService: ConversationService;
  let changeSetService: ChangeSetService;

  beforeEach(() => {
    db = new Database(":memory:");
    initDatabase({ dbPath: ":memory:" });

    // Create mock services
    const mockClaudeService = {
      analyzeJobWithJSON: async () => ({}),
    } as any;

    const mockCareerDocService = {
      getCareerDocument: () => ({}),
    } as any;

    const mockAnalysisService = {} as any;

    conversationService = new ConversationService(
      db,
      mockClaudeService,
      mockCareerDocService,
      mockAnalysisService
    );

    changeSetService = new ChangeSetService(db);
  });

  afterEach(() => {
    db.close();
  });

  it("should start a conversation", async () => {
    const jobId = uuidv4();
    const analysisId = uuidv4();

    // Setup job
    db.prepare("INSERT INTO jobs (id, title, company) VALUES (?, ?, ?)").run(
      jobId,
      "Test Job",
      "Test Company"
    );

    // Setup analysis
    db.prepare(
      "INSERT INTO analyses (id, job_id, fit_score, confidence_score) VALUES (?, ?, ?, ?)"
    ).run(analysisId, jobId, 75, 0.8);

    const conversation = await conversationService.startConversation({
      jobId,
      analysisId,
    });

    expect(conversation).toBeDefined();
    expect(conversation.job_id).toBe(jobId);
    expect(conversation.analysis_id).toBe(analysisId);
    expect(conversation.status).toBe("active");
  });

  it("should add user message", async () => {
    const jobId = uuidv4();
    const analysisId = uuidv4();

    db.prepare("INSERT INTO jobs (id, title, company) VALUES (?, ?, ?)").run(
      jobId,
      "Test Job",
      "Test Company"
    );

    db.prepare(
      "INSERT INTO analyses (id, job_id, fit_score, confidence_score) VALUES (?, ?, ?, ?)"
    ).run(analysisId, jobId, 75, 0.8);

    const conversation = await conversationService.startConversation({
      jobId,
      analysisId,
    });

    const message = conversationService.addUserMessage(
      conversation.id,
      "Can you emphasize my leadership?"
    );

    expect(message.role).toBe("user");
    expect(message.content).toBe("Can you emphasize my leadership?");
    expect(message.conversation_id).toBe(conversation.id);
  });

  it("should accept change", async () => {
    const jobId = uuidv4();
    const analysisId = uuidv4();

    db.prepare("INSERT INTO jobs (id, title, company) VALUES (?, ?, ?)").run(
      jobId,
      "Test Job",
      "Test Company"
    );

    db.prepare(
      "INSERT INTO analyses (id, job_id, fit_score, confidence_score) VALUES (?, ?, ?, ?)"
    ).run(analysisId, jobId, 75, 0.8);

    const conversation = await conversationService.startConversation({
      jobId,
      analysisId,
    });

    const changeset = changeSetService.createChangeSet({
      conversationId: conversation.id,
      analysisId,
      sectionType: "bullet",
      location: "experience[0]",
      originalText: "Collaborated with team",
      proposedText: "Led team initiatives",
      reasoning: "Stronger action verb",
      businessImpact: ["Better leadership positioning"],
      confidence: 0.9,
    });

    conversationService.acceptChange(conversation.id, changeset.id, jobId);

    const updated = conversationService.getConversation(conversation.id);
    expect(updated!.memory.accepted_changes).toContain(changeset.id);
  });
});
```

- [ ] **Step 2: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/server/services/__tests__/conversation.service.test.ts
git commit -m "test: add unit tests for conversation service"
```

---

### Task 14: Update Types for Resume Generation with Accepted Changes

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Extend Job type**

Add to the Job interface:

```typescript
  accepted_changes?: string[]; // change_set IDs that have been accepted
  conversation_id?: string; // current active conversation
```

- [ ] **Step 2: Commit**

```bash
cd /Users/cerebra/Documents/Claude/jobber-app
git add src/shared/types.ts
git commit -m "feat: extend Job type with conversation tracking"
```

---

## Spec Coverage Checklist

✅ **1. Conversation State Management** — Task 5 (ConversationService), Task 8 (useConversation hook), Database migrations (Task 2)
✅ **2. Follow-up Question Engine** — Task 4 (PromptBuilder with follow-up support), ready for integration in Phase 5B
✅ **3. Confirmation Cards** — Task 9 (ConfirmationCard component), Task 10 (DiffViewer)
✅ **4. Diff Viewer** — Task 10 (DiffViewer with diff-match-patch)
✅ **5. Conversation Memory** — Task 5 (ConversationService memory management), Task 2 (database tables)
✅ **6. Prompt Pipeline** — Task 4 (PromptBuilder service with modular sections)
✅ **7. Resume Preview Updates** — Task 12 (Studio integration), ready for Phase 5B
✅ **8. Backend API** — Task 7 (conversation routes: start, message, accept, reject, modify, GET)
✅ **9. Database** — Task 2 (migrations for conversations, messages, change_sets, accepted_changes, analytics_events)
✅ **10. Analytics Events** — Task 6 (AnalyticsService with event logging)

---

## Known Limitations & Next Steps

### Not Included (Phase 5B or 6)

1. **Resume Generation Integration** — AcceptedChanges → Resume Source update (Task would apply changesets to career doc for resume generation)
2. **Follow-up Question Engine in Chat** — PromptBuilder ready but not wired into chat flow
3. **Advanced Memory Features** — User preferences (tone, ATS level) recorded but not yet used in refinement prompts
4. **Optimistic UI Updates** — Partial implementation (useConversation hook), needs integration in StudioPanel

### Testing Still Needed

- Integration tests for conversation flow end-to-end
- Component tests for ConfirmationCard (React Testing Library)
- API tests for conversation routes (with real database)
- E2E tests for full refinement workflow in Cypress

### Design Decisions Made

- **No real-time streaming** — Conversations are request-response; Phase 6 could add WebSocket support
- **Change sets are immutable** — Modifications create new records (audit trail), don't overwrite
- **Optimistic updates** — useConversation hook does optimistic state updates; failures roll back in practice
- **Memory stored as JSON** — Simple, flexible; could migrate to normalized table in Phase 6

---

**Total Tasks:** 14  
**Estimated Implementation Time:** 4-6 hours (with TDD)  
**Complexity:** High (multi-service, database migrations, component interactions)

Plan complete and saved. Ready for execution.
