import React, { useEffect, useState } from "react";
import { useArtifacts, JobArtifact } from "../hooks/useArtifacts.js";

interface ResumePreviewModalProps {
  isOpen: boolean;
  artifact: JobArtifact | null;
  jobId: string;
  onClose: () => void;
  onCopy?: () => void;
  onDownload?: () => void;
}

export const ResumePreviewModal: React.FC<ResumePreviewModalProps> = ({
  isOpen,
  artifact,
  jobId,
  onClose,
  onCopy,
  onDownload,
}) => {
  const { downloadPDF, copyToClipboard } = useArtifacts();
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCopyFeedback(false);
    }
  }, [isOpen]);

  if (!isOpen || !artifact) return null;

  const handleCopy = async () => {
    await copyToClipboard(artifact.renderedText);
    setCopyFeedback(true);
    onCopy?.();
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleDownload = async () => {
    await downloadPDF(jobId, artifact.id);
    onDownload?.();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 id="modal-title" className="text-2xl font-semibold">
              Resume Preview
            </h2>
            <p className="text-sm text-gray-500 mt-1">Version {artifact.version}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
            {artifact.renderedText}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              copyFeedback
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            {copyFeedback ? "✓ Copied!" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors"
          >
            Download PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium hover:bg-gray-300 transition-colors ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
