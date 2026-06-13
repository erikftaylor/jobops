import { getDatabase } from "../db/database.js";
import { CreateJobInput, JobState, isValidTransition } from "../schemas/job.schema.js";
import crypto from "crypto";

interface JobRecord {
  id: string;
  title: string;
  company: string;
  description: string;
  state: JobState;
  url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export class JobService {
  // Extract company and title from job description using simple heuristics
  private extractCompanyTitle(description: string): { company?: string; title?: string } {
    const lines = description.split("\n").slice(0, 10); // Check first 10 lines
    let company: string | undefined;
    let title: string | undefined;

    for (const line of lines) {
      const trimmed = line.trim();
      // Look for company pattern: "Company: X" or "At X:"
      const companyMatch = trimmed.match(/(?:Company|Hiring|at):\s*(.+)/i);
      if (companyMatch) {
        company = companyMatch[1].split(/[,•]/)[0].trim();
      }

      // Look for title pattern: "Job Title:" or "Position:"
      const titleMatch = trimmed.match(/(?:Title|Position):\s*(.+)/i);
      if (titleMatch) {
        title = titleMatch[1].split(/[,•]/)[0].trim();
      }

      // If we found both, stop searching
      if (company && title) break;
    }

    return { company, title };
  }

  createJob(input: CreateJobInput): JobRecord {
    const db = getDatabase().getConnection();

    // Extract if not provided
    const extracted = this.extractCompanyTitle(input.jobDescription);
    const company = input.company || extracted.company || "Unknown Company";
    const title = input.title || extracted.title || "Unnamed Role";
    const id = crypto.randomBytes(8).toString("hex");
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO jobs (id, title, company, description, state, url, source, created_at, added_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      id,
      title,
      company,
      input.jobDescription,
      "draft",
      input.url || null,
      "manual",
      now,
      now,
      now
    );

    return this.getJob(id)!;
  }

  getJob(id: string): JobRecord | null {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(`SELECT * FROM jobs WHERE id = ?`);
    const row = stmt.get(id) as any;
    return row || null;
  }

  listJobs(state?: JobState): JobRecord[] {
    const db = getDatabase().getConnection();

    let stmt;
    if (state) {
      stmt = db.prepare(`SELECT * FROM jobs WHERE state = ? ORDER BY created_at DESC`);
      return stmt.all(state) as JobRecord[];
    } else {
      stmt = db.prepare(`SELECT * FROM jobs ORDER BY created_at DESC`);
      return stmt.all() as JobRecord[];
    }
  }

  updateJobState(id: string, newState: JobState, notes?: string): JobRecord {
    const job = this.getJob(id);
    if (!job) {
      throw new Error(`Job ${id} not found`);
    }

    if (!isValidTransition(job.state, newState)) {
      throw new Error(
        `Invalid state transition from ${job.state} to ${newState}`
      );
    }

    const db = getDatabase().getConnection();
    const now = new Date().toISOString();

    const stmt = db.prepare(`UPDATE jobs SET state = ?, updated_at = ?, notes = ? WHERE id = ?`);
    stmt.run(newState, now, notes || job.notes, id);

    return this.getJob(id)!;
  }

  updateJob(id: string, updates: Partial<JobRecord>): JobRecord {
    const job = this.getJob(id);
    if (!job) {
      throw new Error(`Job ${id} not found`);
    }

    const db = getDatabase().getConnection();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push("title = ?");
      values.push(updates.title);
    }
    if (updates.company !== undefined) {
      fields.push("company = ?");
      values.push(updates.company);
    }
    if (updates.url !== undefined) {
      fields.push("url = ?");
      values.push(updates.url);
    }
    if (updates.notes !== undefined) {
      fields.push("notes = ?");
      values.push(updates.notes);
    }

    if (fields.length === 0) return job;

    fields.push("updated_at = ?");
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`UPDATE jobs SET ${fields.join(", ")} WHERE id = ?`);
    stmt.run(...values);

    return this.getJob(id)!;
  }

  deleteJob(id: string): boolean {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(`DELETE FROM jobs WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

export function createJobService(): JobService {
  return new JobService();
}
