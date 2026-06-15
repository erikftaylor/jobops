import { useCallback, useState } from "react";

export interface JobArtifact {
  id: string;
  jobId: string;
  artifactType: "resume" | "cover_letter";
  version: number;
  positioning?: string;
  title?: string;
  careerDocVersionId: string;
  promptVersion: number;
  model: string;
  jsonContent: any;
  renderedText: string;
  status: "draft" | "ready" | "error" | "archived";
  isPreferred: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseArtifactsReturn {
  artifact: JobArtifact | null;
  isGenerating: boolean;
  error: string | null;
  generateResume: (jobId: string) => Promise<void>;
  generateCoverLetter: (jobId: string) => Promise<void>;
  getArtifact: (jobId: string, artifactId: string) => Promise<JobArtifact | null>;
  downloadPDF: (jobId: string, artifactId: string) => Promise<void>;
  copyToClipboard: (text: string) => Promise<void>;
}

export function useArtifacts(): UseArtifactsReturn {
  const [artifact, setArtifact] = useState<JobArtifact | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateArtifact = useCallback(async (jobId: string, artifactType: "resume" | "cover_letter" = "resume") => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/jobs/${jobId}/artifacts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifactType }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || `Failed to generate ${artifactType}`);
      }

      const data = await response.json();
      setArtifact(data.data);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error(`${artifactType} generation error:`, err);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateResume = useCallback((jobId: string) => generateArtifact(jobId, "resume"), [generateArtifact]);
  const generateCoverLetter = useCallback((jobId: string) => generateArtifact(jobId, "cover_letter"), [generateArtifact]);

  const getArtifact = useCallback(
    async (jobId: string, artifactId: string): Promise<JobArtifact | null> => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/artifacts/${artifactId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch artifact");
        }
        const data = await response.json();
        setArtifact(data.data);
        return data.data as JobArtifact;
      } catch (err: any) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Get artifact error:", err);
        return null;
      }
    },
    []
  );

  const downloadPDF = useCallback(async (jobId: string, artifactId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/artifacts/${artifactId}/pdf`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume_v${artifact?.version || 1}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("PDF download error:", err);
    }
  }, [artifact?.version]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Failed to copy";
      setError(message);
      console.error("Copy error:", err);
    }
  }, []);

  return {
    artifact,
    isGenerating,
    error,
    generateResume,
    generateCoverLetter,
    getArtifact,
    downloadPDF,
    copyToClipboard,
  };
}
