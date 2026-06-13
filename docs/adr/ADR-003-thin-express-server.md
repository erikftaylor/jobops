# ADR-003: Thin Express Server with Service Layer

**Date:** 2026-06-12

**Status:** ACCEPTED

**Authors:** Principal Engineer

---

## Context

JobOps needs a server that:
- Handles HTTP requests from React frontend
- Manages Claude API integration (keeping keys secure)
- Orchestrates business logic (job analysis, document generation)
- Provides data persistence layer

The server architecture must support:
- Clear separation of concerns (routes, services, database)
- Testability (unit test services independently)
- Extensibility (add new features without touching existing code)
- Maintainability (easy for new developers to understand)

Three server patterns were considered:

1. **Thin routes + Service layer** — Express routes delegate to services
2. **Fat routes** — All logic in route handlers (quick but unmaintainable)
3. **Monolithic framework** — NestJS or similar (powerful but heavy)

---

## Decision

**We choose Thin Express Servers with explicit Service Layer:**

```
Request
  ↓
Express Route (validation only)
  ↓
Service Layer (business logic)
  ↓
Database Service (persistence)
  ↓
Response
```

Routes are thin (10-20 lines). Services contain business logic. Database layer abstracts SQL.

---

## Rationale

### Separation of Concerns
- **Routes** — HTTP details only (parsing input, setting headers)
- **Services** — Business logic (job analysis, document generation)
- **Database** — SQL queries and persistence

This makes each layer testable independently.

### Testability
Services can be unit tested without HTTP:
```typescript
describe("JobService", () => {
  it("should transition job from interested to applied", () => {
    const service = new JobService(mockDb);
    const result = service.updateStatus("job-1", "applied");
    expect(result.status).toBe("applied");
  });
});
```

No need to mock Express, request/response objects, or HTTP.

### Reusability
Services can be called from:
- HTTP routes
- Background jobs (future: retry failed analyses)
- Tests
- CLI tools (future: bulk import)

Business logic is decoupled from HTTP.

### Clarity for New Developers
Clear structure:
```
src/server/
├── routes/         # HTTP endpoints
├── services/       # Business logic
├── db/             # Persistence
└── middleware/     # Cross-cutting concerns
```

Easy to find where to add a feature.

### Iterative Development
Early phases focus on services (business logic).
Later phases add routes and polish HTTP handling.

---

## Structure

### Express Route Example
```typescript
// src/server/routes/jobs.ts
router.post("/jobs", (req, res) => {
  // Validate input
  const validated = jobSchema.parse(req.body);
  
  // Call service
  const job = jobService.createJob(validated);
  
  // Return response
  res.status(201).json(job);
});
```

Routes are ~10 lines. Details delegated to service.

### Service Example
```typescript
// src/server/services/job.service.ts
class JobService {
  constructor(private db: DatabaseService) {}
  
  createJob(input: CreateJobInput): Job {
    // Validate business rules
    if (!input.title) throw new ValidationError("Title required");
    
    // Persist
    const id = this.db.insertJob(input);
    
    // Return
    return this.db.getJob(id);
  }
  
  updateStatus(jobId: string, newStatus: JobStatus): Job {
    // Validate state transition
    const job = this.db.getJob(jobId);
    if (!isValidTransition(job.status, newStatus)) {
      throw new ValidationError(`Cannot transition from ${job.status} to ${newStatus}`);
    }
    
    // Update
    this.db.updateJob(jobId, { status: newStatus });
    
    // Return
    return this.db.getJob(jobId);
  }
}
```

Services contain all business logic. No HTTP details.

### Database Service Example
```typescript
// src/server/services/database.service.ts
class DatabaseService {
  private db: Database;
  
  // Prepared statements for each query
  private stmts = {
    insertJob: this.db.prepare("INSERT INTO jobs (...) VALUES (...)"),
    getJob: this.db.prepare("SELECT * FROM jobs WHERE id = ?"),
  };
  
  insertJob(input: CreateJobInput): string {
    const id = generateId();
    this.stmts.insertJob.run(id, input.title, input.company, ...);
    return id;
  }
  
  getJob(id: string): Job | null {
    return this.stmts.getJob.get(id) as Job | null;
  }
}
```

Database service abstracts SQL queries. All queries use prepared statements.

---

## Consequences

### Benefits
✅ Easy to test (services are pure functions)
✅ Easy to debug (clear control flow)
✅ Easy to extend (add new service for new feature)
✅ Easy for new developers to understand
✅ Business logic is reusable (not tied to HTTP)
✅ Database logic is isolated

### Trade-offs

**1. More boilerplate than "fat routes"**
- Every feature requires three files (route, service, db query)
- Mitigation: Use scaffolding scripts or templates
- Reality: This is still simpler than monolithic frameworks

**2. Requires discipline**
- Developer must put logic in right layer
- No enforcement from framework
- Mitigation: Code review checklist, clear naming conventions

**3. No automatic features**
- Express doesn't give us auth, validation, error handling
- Must implement manually
- Mitigation: Use middleware (express.json, validation, error handler)

---

## Middleware Strategy

Cross-cutting concerns (things that apply to all routes) live in middleware:

```typescript
app.use(express.json());                    // Parse JSON
app.use(requestLogger);                     // Log requests
app.use(validateRequest);                   // Validate against schema
app.use("/api", apiRoutes);                 // API routes
app.use(errorHandler);                      // Handle errors
```

Middleware is Express's strength. Use it for:
- JSON parsing
- Request logging
- Input validation
- Error handling
- CORS
- Rate limiting (future)

---

## Error Handling

Errors bubble up from service → route → middleware:

```typescript
// Service throws
throw new ValidationError("Title required");

// Route doesn't catch (lets it bubble)
const job = jobService.createJob(input);

// Middleware catches
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ code: "VALIDATION_ERROR", message: err.message });
  } else if (err instanceof NotFoundError) {
    res.status(404).json({ code: "NOT_FOUND", message: err.message });
  } else {
    res.status(500).json({ code: "SERVER_ERROR", message: "Internal server error" });
  }
});
```

Errors are consistent, loggable, and don't leak implementation details.

---

## Testing Strategy

### Unit Tests (Service Layer)
Services are tested without HTTP or database:

```typescript
describe("JobService.updateStatus", () => {
  it("should reject invalid transitions", () => {
    const mockDb = {
      getJob: () => ({ status: "rejected" }),
    };
    const service = new JobService(mockDb);
    
    expect(() => service.updateStatus("job-1", "applied"))
      .toThrow(ValidationError);
  });
});
```

### Integration Tests (Route + Service + DB)
End-to-end workflow:

```typescript
describe("POST /api/jobs", () => {
  it("should create and return job", async () => {
    const response = await request(app)
      .post("/api/jobs")
      .send({ title: "Designer", company: "Acme" });
    
    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
  });
});
```

### E2E Tests
Real app, real requests, real database:

```typescript
describe("Job Application Workflow", () => {
  it("should create, analyze, and apply to job", async () => {
    // 1. Create job
    const jobRes = await client.post("/api/jobs", {...});
    const jobId = jobRes.body.id;
    
    // 2. Analyze job
    const analysisRes = await client.post(`/api/jobs/${jobId}/analyze`);
    expect(analysisRes.body.fit_score).toBeDefined();
    
    // 3. Generate resume
    const resumeRes = await client.post(`/api/jobs/${jobId}/documents`, {
      type: "resume",
    });
    expect(resumeRes.status).toBe(200);
    
    // 4. Apply
    const applyRes = await client.patch(`/api/jobs/${jobId}`, {
      status: "applied",
    });
    expect(applyRes.body.status).toBe("applied");
  });
});
```

---

## Scalability Path

This architecture scales gracefully:

**Phase 1 (Current):** Express + SQLite locally

**Phase 2 (If multi-user needed):** 
- Same service layer
- Replace local SQLite with PostgreSQL
- Add authentication middleware
- Routes stay the same

The service layer is agnostic to storage backend.

---

## Alternatives Considered

### Alternative 1: NestJS (Rejected)
- Pros: Full-featured framework, type-safe, built-in validation
- Cons: Heavyweight, learning curve, unnecessary for single-user app
- Decision: Rejected; Express is simpler and sufficient

### Alternative 2: Fat Routes (Rejected)
- Pros: Quick to write, minimal boilerplate
- Cons: Hard to test, duplicate logic, unmaintainable
- Decision: Rejected; technical debt accumulates fast

### Alternative 3: MVC with Separate Models (Rejected)
- Pros: Some frameworks enforce this
- Cons: Model layer adds complexity, services are simpler
- Decision: Rejected; services are the right abstraction level

---

## Related Decisions

- ADR-002: SQLite (DatabaseService abstracts this)
- ADR-005: Prompt file strategy (AiService loads prompts)

---

## Verification Checklist

Before closing:
- [ ] Express app boots and serves requests
- [ ] All routes delegate to services (no business logic in routes)
- [ ] All database queries in DatabaseService
- [ ] Error middleware catches and formats all errors
- [ ] Services are testable (no HTTP dependencies)
- [ ] Unit tests for services pass
- [ ] Integration tests for key workflows pass
- [ ] Code review confirms architecture followed
