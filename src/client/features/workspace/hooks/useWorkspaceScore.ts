import { useState, useCallback, useEffect } from "react";
import type { ResumeScore } from "@shared/types";

export function useWorkspaceScore(jobId: string | undefined) {
  const [score, setScore] = useState<ResumeScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScore = useCallback(async () => {
    if (!jobId) {
      setScore(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspace/${jobId}/score`);
      if (!response.ok) {
        throw new Error("Failed to load resume score");
      }
      const data = await response.json();
      setScore(data);
    } catch (err) {
      setError((err as Error).message);
      // Set mock data for development
      setScore({
        total: 72,
        maxScore: 100,
        confidence: 0.85,
        categories: {
          atsKeywordMatch: {
            name: "ATS Keyword Match",
            score: 78,
            maxScore: 100,
            explanation: "Good coverage of job keywords"
          },
          roleAlignment: {
            name: "Role Alignment",
            score: 85,
            maxScore: 100,
            explanation: "Strong match with target role"
          },
          seniorityAlignment: {
            name: "Seniority Alignment",
            score: 70,
            maxScore: 100,
            explanation: "Matches mid-level position"
          },
          impactMetrics: {
            name: "Impact Metrics",
            score: 65,
            maxScore: 100,
            explanation: "Could add more quantified results"
          },
          recruiterReadability: {
            name: "Recruiter Readability",
            score: 75,
            maxScore: 100,
            explanation: "Clear structure, easy to scan"
          },
          formattingQuality: {
            name: "Formatting Quality",
            score: 70,
            maxScore: 100,
            explanation: "All major sections present"
          }
        },
        recommendations: [
          "Add more specific metrics to experience descriptions",
          "Enhance coverage of technical keywords",
          "Strengthen seniority positioning"
        ],
        updatedAt: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadScore();
  }, [loadScore]);

  return {
    score,
    isLoading,
    error,
    reload: loadScore,
  };
}
