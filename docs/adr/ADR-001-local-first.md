# ADR-001: Local-First Architecture

**Date:** 2026-06-12

**Status:** ACCEPTED

**Authors:** Principal Engineer

---

## Context

JobOps needs a deployment model that:
- Protects user data (job applications are sensitive)
- Requires no infrastructure for users to operate
- Allows offline use (user might want to work on applications without network)
- Keeps operational costs low (no servers to maintain)

Three architectural approaches were considered:

1. **Cloud-first** — User data stored on servers, access via web app
2. **Local-first** — User data stored locally, no persistent cloud dependency
3. **Hybrid** — Local storage with optional cloud sync

---

## Decision

**We choose Local-First** with the following model:

- SQLite database stored on user's filesystem (Desktop: `~/Library/Application Support/jobber-app/`, Windows: `%APPDATA%\jobber-app\`)
- Express server runs locally (embedded in Electron or Node)
- Claude API calls made directly from server (not proxied through cloud)
- No user authentication required
- No persistent cloud backend for data storage
- Optional: future cloud sync via user's Dropbox/Google Drive

---

## Rationale

### Truth and Privacy
- User's job applications are personal career data
- Local storage ensures no data mining or secondary use
- Aligns with "Truth First" principle: we only work with data user explicitly manages

### Simplicity
- No backend server to maintain or pay for
- No authentication system to build
- No scaling concerns (single user per instance)
- No data migration if cloud provider changes

### Reliability
- Works offline (after initial setup)
- User is not locked into a service
- If JobOps shuts down, user's data still exists locally

### User Control
- User owns their data
- Can backup, export, version control their database
- Can migrate to other tools if needed

---

## Consequences

### Benefits
✅ User data is private and under user's control
✅ No authentication overhead
✅ Offline capable (if CV and job data cached locally)
✅ Minimal operational complexity
✅ Fast local queries (no network round-trip)

### Trade-offs and Constraints

**1. No real-time sync across devices**
- Mitigation: Optional cloud sync (Dropbox/Google Drive) in future phase
- User can manually backup or use Git

**2. Single-user only**
- If user wants to use on multiple devices, must manually sync
- If team wants shared job tracking, requires separate web app (post-launch feature)

**3. API calls still require internet**
- "Local-first" means data is local, not network access
- Claude API calls require internet connection
- Fallback: use cached analyses if API unavailable

**4. Desktop-first deployment**
- Web version would require a different architecture (backend DB)
- Can be added later, but initial launch is Electron app

---

## Alternatives Considered

### Alternative 1: Cloud-First (Rejected)
- Pros: Sync across devices, shared data, no desktop app needed
- Cons: Privacy concerns, infrastructure cost, requires user accounts, user lock-in
- Decision: Rejected due to privacy and data ownership concerns

### Alternative 2: Hybrid (Deferred to Phase 2)
- Pros: Best of both worlds
- Cons: Complexity of sync, conflict resolution, data consistency
- Decision: Acceptable for future (optional Dropbox sync), not required for launch

---

## Implementation Notes

### Database Location
```
macOS:      ~/Library/Application Support/jobber-app/jobs.db
Windows:    %APPDATA%\jobber-app\jobs.db
Linux:      ~/.local/share/jobber-app/jobs.db
```

### Backup Strategy
- Daily automatic backups to same directory (jobs.db.backup-YYYY-MM-DD)
- User can manually export as JSON
- Database is version-controlable (can commit to Git)

### Offline Capability
- Job list: cached locally (works offline)
- Job analysis: uses cached results, fresh unavailable if no internet
- Resume generation: requires Claude API (needs internet)
- Document view/edit: works offline (data is local)

### Future: Cloud Sync
If implemented, would:
- Use user's Dropbox/Google Drive API
- Sync jobs.db periodically
- Provide conflict resolution UI
- Allow setup in settings

---

## Related Decisions

- ADR-002: SQLite for local storage (follows from this decision)
- ADR-003: Thin Express server (supports local-first model)

---

## Verification Checklist

Before closing this ADR:
- [ ] Database location confirmed for all platforms
- [ ] Backup mechanism tested
- [ ] Offline fallback behavior documented
- [ ] User documentation explains data ownership and privacy
- [ ] Future sync architecture sketched out
