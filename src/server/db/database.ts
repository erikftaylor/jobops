import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { migrate005 } from "./migrations/005-conversation-tables.js";
import { migrate006 } from "./migrations/006-artifact-tables.js";
import { migrate007 } from "./migrations/007-keyword-proposals.js";
import { migrate008 } from "./migrations/008-workspace-persistence.js";
import { migrate009 } from "./migrations/009-job-artifacts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface DatabaseConfig {
  dbPath: string;
}

class DatabaseService {
  private db: Database.Database;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;

    // Ensure directory exists
    const dir = path.dirname(config.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(config.dbPath, {
      fileMustExist: false,
      timeout: 5000,
      verbose: process.env.DEBUG ? console.log : undefined,
    });

    // Enable WAL mode for better concurrency
    this.db.pragma("journal_mode = WAL");

    // Run migrations
    this.runMigrations();
  }

  private runMigrations() {
    const migrationsPath = path.join(__dirname, ".");
    const migrationFile = path.join(migrationsPath, "001-initial.sql");

    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }

    const sql = fs.readFileSync(migrationFile, "utf-8");
    this.db.exec(sql);

    // Run TypeScript migrations
    try {
      migrate005(this.db);
    } catch (err: any) {
      if (!err.message.includes("already exists")) {
        throw err;
      }
    }

    try {
      migrate006(this.db);
    } catch (err: any) {
      if (!err.message.includes("already exists")) {
        throw err;
      }
    }

    try {
      migrate007(this.db);
    } catch (err: any) {
      if (!err.message.includes("already exists")) {
        throw err;
      }
    }

    try {
      migrate008(this.db);
    } catch (err: any) {
      if (!err.message.includes("already exists")) {
        throw err;
      }
    }

    try {
      migrate009(this.db);
    } catch (err: any) {
      if (!err.message.includes("already exists")) {
        throw err;
      }
    }
  }

  public getConnection(): Database.Database {
    return this.db;
  }

  public close() {
    this.db.close();
  }

  public health(): {
    connected: boolean;
    path: string;
    size: number;
  } {
    try {
      const result = this.db.prepare("SELECT 1").get();
      const stats = fs.statSync(this.config.dbPath);

      return {
        connected: !!result,
        path: this.config.dbPath,
        size: stats.size,
      };
    } catch (err) {
      return {
        connected: false,
        path: this.config.dbPath,
        size: 0,
      };
    }
  }
}

let instance: DatabaseService | null = null;

export function initDatabase(config: DatabaseConfig) {
  instance = new DatabaseService(config);
  return instance;
}

export function getDatabase(): DatabaseService {
  if (!instance) {
    throw new Error("Database not initialized. Call initDatabase first.");
  }
  return instance;
}

export default DatabaseService;
