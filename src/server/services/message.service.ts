import { getDatabase } from "../db/database.js";
import { MessageType } from "../schemas/message.schema.js";
import crypto from "crypto";

interface MessageRecord {
  id: string;
  job_id: string;
  role: "user" | "assistant";
  content: string;
  message_type: MessageType;
  created_at: string;
}

export class MessageService {
  createMessage(
    jobId: string,
    role: "user" | "assistant",
    content: string,
    messageType: MessageType = "chat"
  ): MessageRecord {
    const db = getDatabase().getConnection();
    const id = crypto.randomBytes(8).toString("hex");
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO chat_messages (id, job_id, role, content, message_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    stmt.run(id, jobId, role, content, messageType, now);

    return this.getMessage(id)!;
  }

  getMessage(id: string): MessageRecord | null {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(`SELECT * FROM chat_messages WHERE id = ?`);
    const row = stmt.get(id) as any;
    return row || null;
  }

  getJobMessages(jobId: string): MessageRecord[] {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(
      `SELECT * FROM chat_messages WHERE job_id = ? ORDER BY created_at ASC`
    );
    return stmt.all(jobId) as MessageRecord[];
  }

  deleteMessage(id: string): boolean {
    const db = getDatabase().getConnection();
    const stmt = db.prepare(`DELETE FROM chat_messages WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

export function createMessageService(): MessageService {
  return new MessageService();
}
