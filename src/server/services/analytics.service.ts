import { getDatabase } from "../db/database.js";
import crypto from "crypto";

type EventType =
  | "analysis_started"
  | "analysis_completed"
  | "follow_up_asked"
  | "recommendation_accepted"
  | "recommendation_rejected"
  | "conversation_modified"
  | "resume_updated"
  | "memory_recorded";

interface AnalyticsEventRecord {
  id: string;
  job_id: string;
  conversation_id: string | null;
  event_type: EventType;
  timestamp: string;
  details: string | null;
}

interface LogEventInput {
  jobId: string;
  eventType: EventType;
  conversationId?: string;
  details?: Record<string, any>;
}

interface GetEventsInput {
  jobId?: string;
  conversationId?: string;
  eventType?: EventType;
  limit?: number;
  offset?: number;
}

interface SummaryStats {
  totalEvents: number;
  eventsByType: Record<EventType, number>;
  timeRange: {
    earliest: string | null;
    latest: string | null;
  };
  jobsWithEvents: number;
  conversationsWithEvents: number;
}

export class AnalyticsService {
  logEvent(input: LogEventInput): AnalyticsEventRecord {
    const db = getDatabase().getConnection();
    const id = crypto.randomBytes(8).toString("hex");
    const timestamp = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO analytics_events (id, job_id, conversation_id, event_type, timestamp, details)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const details = input.details ? JSON.stringify(input.details) : null;

    stmt.run(
      id,
      input.jobId,
      input.conversationId || null,
      input.eventType,
      timestamp,
      details
    );

    return this.getEvent(id)!;
  }

  private getEvent(eventId: string): AnalyticsEventRecord | null {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(`SELECT * FROM analytics_events WHERE id = ?`);
    const row = stmt.get(eventId) as any;

    if (!row) return null;

    return {
      ...row,
      details: row.details ? JSON.parse(row.details) : null,
    };
  }

  getJobEvents(jobId: string, options?: GetEventsInput): AnalyticsEventRecord[] {
    const db = getDatabase().getConnection();
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    let query = `SELECT * FROM analytics_events WHERE job_id = ?`;
    const params: any[] = [jobId];

    if (options?.eventType) {
      query += ` AND event_type = ?`;
      params.push(options.eventType);
    }

    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : null,
    }));
  }

  getConversationEvents(
    conversationId: string,
    options?: GetEventsInput
  ): AnalyticsEventRecord[] {
    const db = getDatabase().getConnection();
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    let query = `SELECT * FROM analytics_events WHERE conversation_id = ?`;
    const params: any[] = [conversationId];

    if (options?.eventType) {
      query += ` AND event_type = ?`;
      params.push(options.eventType);
    }

    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : null,
    }));
  }

  getSummaryStats(input?: GetEventsInput): SummaryStats {
    const db = getDatabase().getConnection();

    // Get total event count
    let countQuery = `SELECT COUNT(*) as count FROM analytics_events`;
    const countParams: any[] = [];

    if (input?.jobId) {
      countQuery += ` WHERE job_id = ?`;
      countParams.push(input.jobId);
    } else if (input?.conversationId) {
      countQuery += ` WHERE conversation_id = ?`;
      countParams.push(input.conversationId);
    }

    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...countParams) as any;
    const totalEvents = countResult.count;

    // Get events by type
    let typeQuery = `SELECT event_type, COUNT(*) as count FROM analytics_events`;
    const typeParams: any[] = [];

    if (input?.jobId) {
      typeQuery += ` WHERE job_id = ?`;
      typeParams.push(input.jobId);
    } else if (input?.conversationId) {
      typeQuery += ` WHERE conversation_id = ?`;
      typeParams.push(input.conversationId);
    }

    typeQuery += ` GROUP BY event_type`;

    const typeStmt = db.prepare(typeQuery);
    const typeRows = typeStmt.all(...typeParams) as any[];

    const eventsByType: Record<EventType, number> = {
      analysis_started: 0,
      analysis_completed: 0,
      follow_up_asked: 0,
      recommendation_accepted: 0,
      recommendation_rejected: 0,
      conversation_modified: 0,
      resume_updated: 0,
      memory_recorded: 0,
    };

    typeRows.forEach((row) => {
      eventsByType[row.event_type as EventType] = row.count;
    });

    // Get time range
    let timeQuery = `SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest FROM analytics_events`;
    const timeParams: any[] = [];

    if (input?.jobId) {
      timeQuery += ` WHERE job_id = ?`;
      timeParams.push(input.jobId);
    } else if (input?.conversationId) {
      timeQuery += ` WHERE conversation_id = ?`;
      timeParams.push(input.conversationId);
    }

    const timeStmt = db.prepare(timeQuery);
    const timeResult = timeStmt.get(...timeParams) as any;

    // Get distinct jobs with events
    const jobsQuery = `SELECT COUNT(DISTINCT job_id) as count FROM analytics_events`;
    const jobsStmt = db.prepare(jobsQuery);
    const jobsResult = jobsStmt.get() as any;

    // Get distinct conversations with events
    const conversationsQuery = `SELECT COUNT(DISTINCT conversation_id) as count FROM analytics_events WHERE conversation_id IS NOT NULL`;
    const conversationsStmt = db.prepare(conversationsQuery);
    const conversationsResult = conversationsStmt.get() as any;

    return {
      totalEvents,
      eventsByType,
      timeRange: {
        earliest: timeResult.earliest,
        latest: timeResult.latest,
      },
      jobsWithEvents: jobsResult.count,
      conversationsWithEvents: conversationsResult.count,
    };
  }
}

export function createAnalyticsService(): AnalyticsService {
  return new AnalyticsService();
}

export default {
  AnalyticsService,
  createAnalyticsService,
};
