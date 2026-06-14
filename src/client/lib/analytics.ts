/**
 * Analytics utility for tracking user interactions
 * Logs events to console in development, can be extended for real analytics service
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

class Analytics {
  private isEnabled = true;

  track(event: AnalyticsEvent): void {
    if (!this.isEnabled) return;

    const eventLog: AnalyticsEvent = {
      timestamp: Date.now(),
      ...event,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event.name, event.properties || {});
    }

    // TODO: Send to analytics service (Mixpanel, Segment, Google Analytics, etc.)
    // In production, would send:
    // - event.name (event type)
    // - event.properties (event metadata)
    // - timestamp
    // - user ID (from auth/session)
    // - session ID
  }

  disable(): void {
    this.isEnabled = false;
  }

  enable(): void {
    this.isEnabled = true;
  }
}

export const analytics = new Analytics();

// Event types and helpers for type safety
export const AnalyticsEvents = {
  // Workspace
  workspaceOpened: (jobId: string, jobTitle?: string) =>
    analytics.track({
      name: 'workspace_opened',
      properties: { jobId, jobTitle },
    }),

  // Resume Score
  resumeScored: (score: number, categories?: Record<string, number>) =>
    analytics.track({
      name: 'resume_scored',
      properties: { score, categories },
    }),

  // Keywords
  keywordProposed: (keyword: string, importance: string) =>
    analytics.track({
      name: 'keyword_proposed',
      properties: { keyword, importance },
    }),

  keywordAccepted: (keyword: string) =>
    analytics.track({
      name: 'keyword_accepted',
      properties: { keyword },
    }),

  keywordIgnored: (keyword: string) =>
    analytics.track({
      name: 'keyword_ignored',
      properties: { keyword },
    }),

  // Recruiter Chat
  recruiterQuestionClicked: (questionId: string, questionText?: string) =>
    analytics.track({
      name: 'recruiter_question_clicked',
      properties: { questionId, questionText },
    }),

  recruiterQuestionAnswered: (questionId: string, confidence?: number) =>
    analytics.track({
      name: 'recruiter_question_answered',
      properties: { questionId, confidence },
    }),

  recruiterQuestionError: (questionId: string, errorMessage?: string) =>
    analytics.track({
      name: 'recruiter_question_error',
      properties: { questionId, errorMessage },
    }),

  // Artifacts
  artifactSwitched: (variantType: string) =>
    analytics.track({
      name: 'artifact_switched',
      properties: { variantType },
    }),

  artifactGenerated: (variantType: string, score?: number) =>
    analytics.track({
      name: 'artifact_generated',
      properties: { variantType, score },
    }),

  // Score Recalculation
  scoreRecalculated: (oldScore: number, newScore: number) =>
    analytics.track({
      name: 'score_recalculated',
      properties: { oldScore, newScore, delta: newScore - oldScore },
    }),

  // Application Flow
  applicationStarted: (jobTitle?: string) =>
    analytics.track({
      name: 'application_started',
      properties: { jobTitle },
    }),

  applicationCompleted: (jobTitle?: string, finalScore?: number) =>
    analytics.track({
      name: 'application_completed',
      properties: { jobTitle, finalScore },
    }),

  resumeExported: (format?: string, variantType?: string) =>
    analytics.track({
      name: 'resume_exported',
      properties: { format, variantType },
    }),
};
