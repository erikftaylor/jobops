import { useState, useCallback, useEffect } from "react";
import type { RecruiterHeatmap } from "@shared/types";

export function useHeatmap(jobId: string | undefined) {
  const [heatmap, setHeatmap] = useState<RecruiterHeatmap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHeatmap = useCallback(async () => {
    if (!jobId) {
      setHeatmap(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspace/${jobId}/heatmap`);
      if (!response.ok) {
        throw new Error("Failed to load recruiter heatmap");
      }
      const data = await response.json();
      setHeatmap(data);
    } catch (err) {
      setError((err as Error).message);
      // Set mock data for development
      setHeatmap({
        overallVisibility: 78,
        sections: [
          {
            sectionName: "Summary",
            visibilityScore: 95,
            recruiterConfidence: "high",
            riskLevel: "low",
            keyObservations: ["Clear and concise", "Immediately highlights value"],
            recommendedImprovement: "Add specific metrics or achievements",
            isVisible: true
          },
          {
            sectionName: "Experience",
            visibilityScore: 85,
            recruiterConfidence: "high",
            riskLevel: "low",
            keyObservations: ["Well-structured roles", "Shows progression"],
            recommendedImprovement: "Enhance with more measurable outcomes",
            isVisible: true
          },
          {
            sectionName: "Skills",
            visibilityScore: 70,
            recruiterConfidence: "medium",
            riskLevel: "medium",
            keyObservations: ["Missing technical depth", "Could organize by category"],
            recommendedImprovement: "Group by proficiency level and relevance",
            isVisible: true
          },
          {
            sectionName: "Education",
            visibilityScore: 65,
            recruiterConfidence: "medium",
            riskLevel: "medium",
            keyObservations: ["Basic information present", "No certifications listed"],
            recommendedImprovement: "Add relevant certifications or coursework",
            isVisible: true
          },
          {
            sectionName: "Projects",
            visibilityScore: 40,
            recruiterConfidence: "low",
            riskLevel: "high",
            keyObservations: ["Minimal presence", "Rarely visible in quick scan"],
            recommendedImprovement: "Add 2-3 relevant projects with impact metrics",
            isVisible: false
          },
          {
            sectionName: "Certifications",
            visibilityScore: 30,
            recruiterConfidence: "low",
            riskLevel: "high",
            keyObservations: ["Not clearly highlighted", "Missing industry certifications"],
            recommendedImprovement: "Highlight any relevant professional certifications",
            isVisible: false
          },
          {
            sectionName: "Awards",
            visibilityScore: 20,
            recruiterConfidence: "low",
            riskLevel: "high",
            keyObservations: ["Completely missing", "Could strengthen candidacy"],
            recommendedImprovement: "Add awards and recognitions if available",
            isVisible: false
          }
        ],
        sixSecondSkim: [
          "Current role/title (most visible)",
          "Company name and tenure",
          "Key skills (first glance)",
          "Education/institution name",
          "Geographic location"
        ],
        skippedSections: ["Projects", "Certifications", "Awards"]
      });
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadHeatmap();
  }, [loadHeatmap]);

  return {
    heatmap,
    isLoading,
    error,
    reload: loadHeatmap,
  };
}
