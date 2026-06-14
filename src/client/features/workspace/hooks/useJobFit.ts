import { useState, useCallback, useEffect } from "react";
import type { JobFitAnalysis } from "@shared/types";

export function useJobFit(jobId: string | undefined) {
  const [fit, setFit] = useState<JobFitAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFit = useCallback(async () => {
    if (!jobId) {
      setFit(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspace/${jobId}/fit`);
      if (!response.ok) {
        throw new Error("Failed to load job fit analysis");
      }
      const data = await response.json();
      setFit(data);
    } catch (err) {
      setError((err as Error).message);
      // Set mock data for development
      setFit({
        overallFit: 72,
        confidenceLevel: "high",
        strongMatches: [
          "5+ years of full-stack development experience",
          "Proven expertise with React and Node.js",
          "Strong understanding of cloud architecture",
          "Leadership experience managing technical teams"
        ],
        weakMatches: [
          "Limited Kubernetes experience (position requires 3+ years)",
          "No TypeScript in current resume (becoming industry standard)",
          "Missing DevOps pipeline experience"
        ],
        rejectionRisks: [
          "Could be screened out by keyword matching due to Kubernetes gap",
          "Seniority level might be questioned without proper positioning"
        ],
        interviewTalkingPoints: [
          "Highlight transferable infrastructure knowledge from previous AWS projects",
          "Emphasize ability to learn new technologies quickly",
          "Discuss relevant projects that demonstrate problem-solving",
          "Show leadership growth through mentoring examples"
        ],
        experienceGaps: [
          {
            requirement: "Kubernetes (3+ years)",
            hasMatch: false,
            severity: "critical",
            suggestion: "Emphasize transferable containerization knowledge"
          },
          {
            requirement: "TypeScript proficiency",
            hasMatch: false,
            severity: "moderate",
            suggestion: "Position JavaScript expertise as foundation"
          },
          {
            requirement: "CI/CD pipeline implementation",
            hasMatch: false,
            severity: "moderate",
            suggestion: "Highlight any deployment automation experience"
          }
        ],
        recommendedPositioningAngle: "Emphasize your full-stack expertise and ability to architect scalable systems. Position your cloud experience as the foundation for learning Kubernetes. Highlight your team leadership and mentoring abilities.",
        likelihood: {
          phoneScreen: 0.82,
          technicalInterview: 0.75,
          offer: 0.68
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadFit();
  }, [loadFit]);

  return {
    fit,
    isLoading,
    error,
    reload: loadFit,
  };
}
