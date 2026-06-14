import { useState } from 'react';
import type { RecruiterAnswer } from '@shared/types';

interface UseRecruiterChatOptions {
  jobId?: string;
}

export function useRecruiterChat(options: UseRecruiterChatOptions = {}) {
  const [answer, setAnswer] = useState<RecruiterAnswer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askQuestion = async (questionId: string): Promise<RecruiterAnswer | null> => {
    if (!options.jobId) {
      setError('Job ID is required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/workspace/${options.jobId}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId }),
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(
          errData.message ||
            `Failed to get answer (${response.status})`
        );
      }

      const result = await response.json();
      setAnswer(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to ask question:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    answer,
    isLoading,
    error,
    askQuestion,
  };
}
