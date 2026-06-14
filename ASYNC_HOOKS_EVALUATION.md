# Async Hook Extraction Evaluation

## Summary
After reviewing `useJobs`, `useConversation`, and `useMessages`, I've decided **NOT to extract** a shared async hook pattern at this time.

## Analysis

### Hooks Reviewed
1. **useJobs** (106 lines)
   - State: `jobs[]`, `isLoading`, `error`
   - Pattern: try-catch-finally callbacks with loading/error management
   - Methods: loadJobs, createJob, updateJobState, getJob

2. **useMessages** (65 lines)
   - State: `messages[]`, `isLoading`, `error`
   - Pattern: try-catch-finally callbacks with loading/error management
   - Methods: loadMessages, sendMessage

3. **useConversation** (288 lines)
   - State: Combined object with conversation, messages, pendingChanges, loading, error
   - Pattern: Effect-based fetch + optimistic update callbacks
   - Methods: addMessage, acceptChange, rejectChange, modifyChange

### Duplicate Pattern Found
useJobs and useMessages share a similar try-catch-finally pattern with loading/error state management. However:

```typescript
// Pattern (roughly 10 lines):
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const callback = useCallback(async (...) => {
  setIsLoading(true);
  setError(null);
  try { /* business logic */ }
  catch (err) { setError((err as Error).message); }
  finally { setIsLoading(false); }
}, [dependencies]);
```

### Why NOT to Extract

1. **Minimal Duplication**: Only ~10 lines per hook, which is already clear and readable
2. **Different Architectures**: 
   - useJobs/useMessages use separate state variables
   - useConversation uses combined state (prevents extraction into shared pattern)
3. **Different Data Structures**: 
   - useJobs manages `Job[]`
   - useMessages manages `Message[]`
   - Would require heavy TypeScript generics or parameterization
4. **Unique Business Logic**: Each hook has specific methods and side effects that don't fit a generic pattern
5. **Indirection Cost**: Extraction would require:
   - Creating a generic async hook (adds cognitive load)
   - Understanding generic parameters and composition
   - Potentially losing readability in individual hooks

### Alternative Approaches Considered (Rejected)
- **Generic useAsync hook**: Requires complex TypeScript generics; makes individual usage less clear
- **Higher-order hook**: Adds unnecessary abstraction for such a simple pattern
- **Shared utility function**: Not applicable for hook patterns (hooks can't be called from non-hooks)

## Recommendation
**Leave as-is.** The pattern is already clear, duplication is minimal, and extraction would add complexity without significant benefit.

If in the future:
- More hooks adopt this pattern (3+ instances)
- Standardized error recovery logic is needed (retry, exponential backoff, etc.)
- Custom loading states become more complex

Then, revisit extraction as a `useAsync` or `useFetch` generic hook.
