import { useState, useCallback, useEffect } from "react";
import type { KeywordAnalysis } from "@shared/types";

export function useKeywordAnalysis(jobId: string | undefined) {
  const [analysis, setAnalysis] = useState<KeywordAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalysis = useCallback(async () => {
    if (!jobId) {
      setAnalysis(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspace/${jobId}/keywords`);
      if (!response.ok) {
        throw new Error("Failed to load keyword analysis");
      }
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError((err as Error).message);
      // Set mock data for development
      setAnalysis({
        missingKeywords: [
          {
            keyword: "Kubernetes",
            importance: "critical",
            status: "missing",
            frequency: { inJob: 5, inResume: 0 },
            suggestedPlacement: "skills",
            suggestedLanguage: "Container orchestration and microservices management with Kubernetes"
          },
          {
            keyword: "TypeScript",
            importance: "high",
            status: "weak",
            frequency: { inJob: 8, inResume: 1 },
            suggestedPlacement: "skills,experience",
            suggestedLanguage: "Expert in TypeScript development for scalable web applications"
          },
          {
            keyword: "CI/CD",
            importance: "high",
            status: "missing",
            frequency: { inJob: 4, inResume: 0 },
            suggestedPlacement: "experience",
            suggestedLanguage: "Implemented CI/CD pipelines using industry-standard tools"
          }
        ],
        totalKeywordsInJob: 45,
        matchedCount: 28,
        matchPercentage: 62,
        summary: "You're missing 17 key terms. Focus on critical ones first."
      });
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  return {
    analysis,
    isLoading,
    error,
    reload: loadAnalysis,
  };
}
