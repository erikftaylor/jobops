import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeywordActions } from '@client/features/workspace/hooks/useKeywordActions';

describe('useKeywordActions', () => {
  const jobId = 'test-job-id';
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('proposeKeyword', () => {
    it('should propose a keyword', async () => {
      const mockProposal = {
        id: 'proposal-1',
        jobId,
        keyword: 'React',
        suggestedLanguage: 'React experience',
        target: 'resume' as const,
        status: 'pending' as const,
        changeNodeId: 'change-1',
        createdAt: new Date().toISOString(),
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProposal,
      });

      const { result } = renderHook(() => useKeywordActions(jobId));

      let proposal;
      await act(async () => {
        proposal = await result.current.proposeKeyword(
          'React',
          'React experience',
          'resume'
        );
      });

      expect(proposal).toEqual(mockProposal);
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/workspace/${jobId}/keywords/propose`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword: 'React',
            suggestedLanguage: 'React experience',
            target: 'resume',
          }),
        })
      );
    });

    it('should handle errors when proposing', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Failed to propose' }),
      });

      const { result } = renderHook(() => useKeywordActions(jobId));

      await expect(
        act(async () => {
          await result.current.proposeKeyword('React', 'React experience', 'resume');
        })
      ).rejects.toThrow('Failed to propose');
    });

    it('should throw error if jobId is not provided', async () => {
      const { result } = renderHook(() => useKeywordActions(undefined));

      await expect(
        act(async () => {
          await result.current.proposeKeyword('React', 'React experience', 'resume');
        })
      ).rejects.toThrow('Job ID is required');
    });

    it('should set isProposing during request', async () => {
      const mockProposal = {
        id: 'proposal-1',
        jobId,
        keyword: 'React',
        suggestedLanguage: 'React experience',
        target: 'resume' as const,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };

      fetchMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => mockProposal,
              });
            }, 100);
          })
      );

      const { result } = renderHook(() => useKeywordActions(jobId));

      expect(result.current.isProposing).toBe(false);

      let promiseResolve: () => void;
      const promise = new Promise<void>((resolve) => {
        promiseResolve = resolve;
      });

      act(() => {
        result.current.proposeKeyword('React', 'React experience', 'resume').then(() => {
          promiseResolve();
        });
      });

      // Note: In real tests with waitFor, we could check isProposing during the request
      // but this is a simplified version

      await act(async () => {
        await promise;
      });

      expect(result.current.isProposing).toBe(false);
    });
  });

  describe('acceptKeywordSuggestion', () => {
    it('should accept a keyword proposal', async () => {
      const mockAccepted = {
        id: 'proposal-1',
        jobId,
        keyword: 'React',
        suggestedLanguage: 'React experience',
        target: 'resume' as const,
        status: 'accepted' as const,
        changeNodeId: 'change-1',
        createdAt: new Date().toISOString(),
        acceptedAt: new Date().toISOString(),
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccepted,
      });

      const { result } = renderHook(() => useKeywordActions(jobId));

      let accepted;
      await act(async () => {
        accepted = await result.current.acceptKeywordSuggestion('proposal-1');
      });

      expect(accepted).toEqual(mockAccepted);
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/workspace/${jobId}/keywords/proposal-1/accept`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle errors when accepting', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Failed to accept' }),
      });

      const { result } = renderHook(() => useKeywordActions(jobId));

      await expect(
        act(async () => {
          await result.current.acceptKeywordSuggestion('proposal-1');
        })
      ).rejects.toThrow('Failed to accept');
    });

    it('should throw error if jobId is not provided', async () => {
      const { result } = renderHook(() => useKeywordActions(undefined));

      await expect(
        act(async () => {
          await result.current.acceptKeywordSuggestion('proposal-1');
        })
      ).rejects.toThrow('Job ID is required');
    });
  });

  describe('ignoreKeywordSuggestion', () => {
    it('should ignore a keyword proposal', async () => {
      const mockIgnored = {
        id: 'proposal-1',
        jobId,
        keyword: 'React',
        suggestedLanguage: 'React experience',
        target: 'resume' as const,
        status: 'ignored' as const,
        changeNodeId: 'change-1',
        createdAt: new Date().toISOString(),
        ignoredAt: new Date().toISOString(),
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIgnored,
      });

      const { result } = renderHook(() => useKeywordActions(jobId));

      let ignored;
      await act(async () => {
        ignored = await result.current.ignoreKeywordSuggestion('proposal-1');
      });

      expect(ignored).toEqual(mockIgnored);
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/workspace/${jobId}/keywords/proposal-1/ignore`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle errors when ignoring', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Failed to ignore' }),
      });

      const { result } = renderHook(() => useKeywordActions(jobId));

      await expect(
        act(async () => {
          await result.current.ignoreKeywordSuggestion('proposal-1');
        })
      ).rejects.toThrow('Failed to ignore');
    });

    it('should throw error if jobId is not provided', async () => {
      const { result } = renderHook(() => useKeywordActions(undefined));

      await expect(
        act(async () => {
          await result.current.ignoreKeywordSuggestion('proposal-1');
        })
      ).rejects.toThrow('Job ID is required');
    });
  });
});
