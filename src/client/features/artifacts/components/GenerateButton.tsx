import React, { useEffect } from "react";
import { useArtifacts, JobArtifact } from "../hooks/useArtifacts.js";

interface GenerateButtonProps {
  jobId: string;
  onArtifactCreated: (artifact: JobArtifact) => void;
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({ jobId, onArtifactCreated }) => {
  const { isGenerating, error, generateResume, artifact } = useArtifacts();

  useEffect(() => {
    if (artifact) {
      onArtifactCreated(artifact);
    }
  }, [artifact, onArtifactCreated]);

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => generateResume(jobId)}
        disabled={isGenerating}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          isGenerating
            ? "bg-gray-400 text-white cursor-not-allowed"
            : "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
        }`}
        aria-busy={isGenerating}
      >
        {isGenerating ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating Resume...
          </span>
        ) : (
          "Generate Tailored Resume"
        )}
      </button>
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  );
};
