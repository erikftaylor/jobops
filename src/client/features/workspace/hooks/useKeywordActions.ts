import { useState } from 'react';

export interface KeywordActionResult {
  id: string;
  jobId: string;
  keyword: string;
  suggestedLanguage: string;
  target: 'resume' | 'cover_letter' | 'both';
  status: 'pending' | 'accepted' | 'ignored';
  changeNodeId?: string;
  createdAt: string;
  acceptedAt?: string;
  ignoredAt?: string;
}

interface UseKeywordActionsReturn {
  proposeKeyword: (keyword: string, suggestedLanguage: string, target: 'resume' | 'cover_letter' | 'both') => Promise<KeywordActionResult>;
  acceptKeywordSuggestion: (proposalId: string) => Promise<KeywordActionResult>;
  ignoreKeywordSuggestion: (proposalId: string) => Promise<KeywordActionResult>;
  isProposing: boolean;
}

export function useKeywordActions(jobId: string | undefined): UseKeywordActionsReturn {
  const [isProposing, setIsProposing] = useState(false);

  const proposeKeyword = async (
    keyword: string,
    suggestedLanguage: string,
    target: 'resume' | 'cover_letter' | 'both'
  ): Promise<KeywordActionResult> => {
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    setIsProposing(true);
    try {
      const response = await fetch(`/api/workspace/${jobId}/keywords/propose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          suggestedLanguage,
          target,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to propose keyword');
      }

      return await response.json();
    } finally {
      setIsProposing(false);
    }
  };

  const acceptKeywordSuggestion = async (proposalId: string): Promise<KeywordActionResult> => {
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    setIsProposing(true);
    try {
      const response = await fetch(`/api/workspace/${jobId}/keywords/${proposalId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept keyword');
      }

      return await response.json();
    } finally {
      setIsProposing(false);
    }
  };

  const ignoreKeywordSuggestion = async (proposalId: string): Promise<KeywordActionResult> => {
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    setIsProposing(true);
    try {
      const response = await fetch(`/api/workspace/${jobId}/keywords/${proposalId}/ignore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to ignore keyword');
      }

      return await response.json();
    } finally {
      setIsProposing(false);
    }
  };

  return {
    proposeKeyword,
    acceptKeywordSuggestion,
    ignoreKeywordSuggestion,
    isProposing,
  };
}
