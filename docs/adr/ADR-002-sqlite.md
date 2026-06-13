# ADR-002: SQLite for Persistent Storage

**Date:** 2026-06-12

**Status:** ACCEPTED

**Authors:** Principal Engineer

---

## Context

A local-first job tracking app needs persistent storage for:
- Job data (title, company, URL, status, etc.)
- Generated documents (resumes, cover letters)
- Analysis results (fit scores, gaps)
- Application outcomes (for funnel tracking)
- User settings and preferences

The data must be:
- Durable (survives app restart)
- Queryable (filtering, sorting jobs)
- Transactional (state consistency)
- Simple (no external server dependency)

Three storage options were evaluated:

1. **SQLite** — Local SQL database, single file
2. **PostgreSQL** — Server-based SQL, powerful but needs backend
3. **JSON/File-based** — Simple but hard to query and scale

---

## Decision

**We choose SQLite via better-sqlite3 library.**

```json
{
  "database": "sqlite3",
  "driver": "better-sqlite3",
  "location": "local filesystem",
  "sync_mode": "WAL (Write-Ahead Logging)",
  "backup_strategy": "file-level backups"
}
```

---

## Rationale

### Reliability
- ACID-compliant: transactions are atomic, consistent, isolated, durable
- WAL mode ensures data integrity and recovery on crash
- Mature, battle-tested library

### Simplicity
- Single file database (easy to backup, version control, share)
- No external server to deploy or maintain
- Synchronous operations acceptable for single-user desktop app
- Simple migrations (versioned SQL files)

### Query Power
- Full SQL support (complex filtering, aggregation, joins)
- Better than file-based storage (JSON) for performance
- Prepared statements prevent SQL injection

### Performance
- Fast for 100s-1000s of records (typical job tracking use case)
- Indexes optimize common queries
- No network latency (local file access is fast)

### Developer Experience
- Familiar SQL syntax
- Easy to test (in-memory database for tests)
- Good Node.js support via better-sqlite3
- No ORM complexity needed

---

## Consequences

### Benefits
✅ Type-safe queries (prepared statements)
✅ ACID guarantees (data consistency)
✅ Efficient indexing and querying
✅ Easy backups (copy single file)
✅ Familiar to developers
✅ Single file deployment (no schema files needed separately)

### Trade-offs

**1. Single-user only**
- Not suitable for multi-user team access
- Mitigation: If team feature needed, migrate to PostgreSQL post-launch
- Schema is migration-friendly (prepared in advance)

**2. Limited to single device**
- Database file is local; requires manual sync for multiple devices
- Mitigation: future cloud sync via Dropbox/Google Drive (ADR-001)

**3. Disk space limited by device storage**
- SQLite expects < 1TB per file (not a concern for this app)
- No automatic cleanup of old archived jobs
- Mitigation: archive feature to move old jobs out of active database

**4. Synchronous operations**
- All database calls are blocking
- Acceptable for single-user desktop app (queries are fast)
- Not suitable if we need to support 1000s of concurrent users
- Mitigation: not a real-time multi-user app

---

## Alternatives Considered

### Alternative 1: PostgreSQL (Rejected)
- Pros: Multi-user, distributed, scales to millions of records
- Cons: Requires backend server, authentication, infrastructure cost, overkill for single-user
- Decision: Rejected; too much infrastructure for local-first model

### Alternative 2: File-Based JSON (Rejected)
- Pros: Simple, human-readable, no database server
- Cons: Slow for searching/filtering, hard to query, no transactions, inconsistency risks
- Decision: Rejected; SQL queries necessary for funnel analysis and filtering

### Alternative 3: IndexedDB (Web-only, Rejected for Desktop)
- Would be good for web version (future)
- Not suitable for Electron desktop app (need persistent local file)

---

## Implementation Details

### Setup
```typescript
import Database from "better-sqlite3";

const db = new Database("/path/to/jobs.db", {
  fileMustExist: false,      // Create if not exists
  timeout: 5000,             // Wait 5s for locks
  verbose: process.env.DEBUG ? console.log : null,
});

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");
```

### Migrations
Migrations are SQL files in `/src/server/db/migrations/`:
```
001-initial.sql        # Create all tables
002-add-salary.sql     # Add salary columns
003-add-feedback.sql   # Add feedback column
```

Each migration:
- Is idempotent (can run multiple times)
- Has BEGIN/COMMIT for atomicity
- Includes rollback instructions
- Is tested before shipping

### Prepared Statements
All queries use prepared statements (prevents SQL injection):
```typescript
const stmt = db.prepare("SELECT * FROM jobs WHERE status = ?");
const job = stmt.get("applied");
```

### Transactions
Complex operations use explicit transactions:
```typescript
const transaction = db.transaction(() => {
  db.prepare("INSERT INTO jobs ...").run(...);
  db.prepare("INSERT INTO documents ...").run(...);
  db.prepare("UPDATE job_analyses ...").run(...);
});

transaction();  // All succeed or all fail
```

### Indexes
Common query patterns have indexes for fast lookup:
```sql
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_added_at ON jobs(added_at);
CREATE INDEX idx_documents_job_id ON documents(job_id);
```

---

## Testing Strategy

### Unit Tests
- Test prepared statements with various inputs
- Test transaction rollback on error
- Test schema constraints

### Integration Tests
- Full workflow: add job → analyze → generate resume → apply
- Verify data consistency across operations

### Property-Based Tests
- Generate 1000+ random jobs
- Verify queries return correct results
- Verify no data corruption

### Stress Tests
- Load 10,000 jobs; verify performance
- Measure query latency
- Verify backup/restore

---

## Monitoring and Maintenance

### In Production
- Monitor database file size (should be < 100MB)
- Check for database corruption (pragma integrity_check)
- Log slow queries (queries > 100ms)

### Future Optimizations
- If queries slow down, add indexes
- If file size grows, implement archive mechanism
- If multi-user needed, migration path to PostgreSQL

---

## Related Decisions

- ADR-001: Local-first architecture (SQLite aligns with this)
- ADR-003: Express server (integrates with SQLite via service layer)

---

## Verification Checklist

Before closing:
- [ ] better-sqlite3 installed and tested
- [ ] WAL mode enabled and verified
- [ ] All migrations are idempotent
- [ ] Prepared statements used for all queries
- [ ] Indexes defined for common query patterns
- [ ] Backup/restore tested
- [ ] Performance tested with 1000+ jobs
- [ ] Unit and integration tests written
