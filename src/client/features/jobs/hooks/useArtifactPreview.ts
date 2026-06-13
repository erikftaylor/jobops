import { useState, useCallback } from "react";
import { Artifact } from "@shared/types";

interface ArtifactGenerationInput {
  templateType: "resume" | "cover_letter" | "linkedin";
  variant?: string;
  positioningAngle?: string;
  tone?: "formal" | "casual" | "balanced";
}

interface GeneratedArtifact {
  id: string;
  content: string;
  type: "resume" | "cover_letter" | "linkedin";
  createdAt: string;
}

interface UseArtifactPreviewState {
  artifacts: Artifact[];
  generating: boolean;
  error: string | null;
}

interface UseArtifactPreviewResponse {
  artifacts: Artifact[];
  generating: boolean;
  error: string | null;
  generateArtifact: (input: ArtifactGenerationInput) => Promise<GeneratedArtifact>;
  fetchArtifacts: () => Promise<void>;
}

export function useArtifactPreview(jobId: string | null): UseArtifactPreviewResponse {
  const [state, setState] = useState<UseArtifactPreviewState>({
    artifacts: [],
    generating: false,
    error: null,
  });

  // Generate an artifact using the provided input
  const generateArtifact = useCallback(
    async (input: ArtifactGenerationInput): Promise<GeneratedArtifact> => {
      if (!jobId) {
        throw new Error("No job ID provided");
      }

      setState((prev) => ({
        ...prev,
        generating: true,
        error: null,
      }));

      try {
        const response = await fetch("/api/artifacts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            templateType: input.templateType,
            variant: input.variant,
            positioningAngle: input.positioningAngle,
            tone: input.tone,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to generate artifact");
        }

        const generatedArtifact = await response.json();

        setState((prev) => ({
          ...prev,
          generating: false,
        }));

        return generatedArtifact;
      } catch (err) {
        const errorMessage = (err as Error).message;
        setState((prev) => ({
          ...prev,
          generating: false,
          error: errorMessage,
        }));
        throw err;
      }
    },
    [jobId]
  );

  // Fetch all artifacts for the job
  const fetchArtifacts = useCallback(async () => {
    if (!jobId) {
      setState({
        artifacts: [],
        generating: false,
        error: "No job ID provided",
      });
      return;
    }

    setState((prev) => ({
      ...prev,
      generating: true,
      error: null,
    }));

    try {
      const response = await fetch(`/api/jobs/${jobId}/artifacts`);
      if (!response.ok) {
        throw new Error("Failed to fetch artifacts");
      }

      const data = await response.json();

      setState({
        artifacts: data.artifacts || [],
        generating: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = (err as Error).message;
      setState((prev) => ({
        ...prev,
        generating: false,
        error: errorMessage,
      }));
    }
  }, [jobId]);

  return {
    artifacts: state.artifacts,
    generating: state.generating,
    error: state.error,
    generateArtifact,
    fetchArtifacts,
  };
}
