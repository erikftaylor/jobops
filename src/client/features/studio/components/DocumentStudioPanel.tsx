import { useState } from "react";
import { Job } from "@shared/types";
import { GenerateButton, ResumePreviewModal } from "../../artifacts/index";
import { useArtifacts } from "../../artifacts/hooks/useArtifacts";
import "../styles/document-studio-panel.css";

type JobState = "draft" | "analyzed" | "refining" | "approved" | "generated" | "applied" | "closed";

interface DocumentStudioPanelProps {
  selectedJob?: Job;
  onStateChange: (newState: JobState) => Promise<void>;
  onMarkApplied: () => Promise<void>;
  onOpenWorkspace?: () => void;
}

export default function DocumentStudioPanel({
  selectedJob,
  onStateChange,
  onMarkApplied,
  onOpenWorkspace,
}: DocumentStudioPanelProps) {
  const { artifact: resumeArtifact, error: resumeError, copyToClipboard, downloadPDF } = useArtifacts();
  const [showResumePreview, setShowResumePreview] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  if (!selectedJob) {
    return (
      <div className="document-studio-panel empty">
        <div className="panel-header">
          <h2>Document Studio</h2>
          <p className="panel-subtitle">Your tailored materials</p>
        </div>
        <div className="empty-state">
          <p>Select a job to generate your tailored resume and cover letter.</p>
        </div>
      </div>
    );
  }

  const currentState = (selectedJob.state || "draft") as JobState;
  const canGenerate =
    currentState === "analyzed" ||
    currentState === "refining" ||
    currentState === "approved" ||
    currentState === "generated";

  const handleCopyText = async () => {
    if (resumeArtifact) {
      await copyToClipboard(resumeArtifact.renderedText);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleDownloadPDF = async () => {
    if (resumeArtifact) {
      setExportingPDF(true);
      try {
        await downloadPDF(selectedJob.id, resumeArtifact.id);
      } finally {
        setExportingPDF(false);
      }
    }
  };

  return (
    <div className="document-studio-panel">
      <div className="panel-header">
        <h2>Document Studio</h2>
        <p className="panel-subtitle">Tailored to this job</p>
      </div>

      <div className="studio-content">
        {/* Resume Card */}
        <div className="document-card resume-card">
          <h3>Resume</h3>
          <p className="card-description">
            Tailored to emphasize your best fit for this role
          </p>

          <div className="card-actions">
            {canGenerate && (
              <GenerateButton
                jobId={selectedJob.id}
                onArtifactCreated={() => {
                  if (currentState !== "generated") {
                    onStateChange("generated");
                  }
                }}
              />
            )}
            {!canGenerate && (
              <div className="button-disabled">
                <p>Analyze the job first to generate a tailored resume</p>
              </div>
            )}
          </div>

          {resumeError && (
            <div className="error-message">{resumeError}</div>
          )}

          {resumeArtifact && (
            <div className="card-actions-additional">
              <button
                className="action-link"
                onClick={() => setShowResumePreview(true)}
              >
                Preview Resume
              </button>
              <button
                className="action-link"
                onClick={handleCopyText}
              >
                {copyFeedback ? "✓ Copied!" : "Copy Text"}
              </button>
              <button
                className="action-link"
                onClick={handleDownloadPDF}
                disabled={exportingPDF}
              >
                {exportingPDF ? "Downloading..." : "Download PDF"}
              </button>
            </div>
          )}
        </div>

        {/* Cover Letter Card */}
        <div className="document-card cover-letter-card">
          <h3>Cover Letter</h3>
          <p className="card-description">
            A thoughtful letter addressing this specific role
          </p>

          <div className="card-actions">
            <button className="cta-button disabled" disabled>
              Generate Letter
            </button>
            <p className="coming-soon">Coming in Phase 3</p>
          </div>
        </div>

        {/* Workspace Link */}
        {currentState !== "draft" && (
          <div className="workspace-link-section">
            <button
              className="workspace-link"
              onClick={onOpenWorkspace}
              title="Advanced features and analytics"
            >
              Advanced Features →
            </button>
          </div>
        )}

        {/* Close the Loop */}
        <div className="close-loop-section">
          <h3>Mark Applied</h3>
          <p className="section-description">
            When you've submitted your application, mark it as applied to track
            your outreach.
          </p>
          <button
            className={`cta-button ${currentState === "applied" ? "success" : "primary"}`}
            onClick={onMarkApplied}
            disabled={currentState === "applied"}
          >
            {currentState === "applied" ? "✓ Marked as Applied" : "Mark as Applied"}
          </button>
        </div>
      </div>

      {/* Resume Preview Modal */}
      {resumeArtifact && (
        <ResumePreviewModal
          isOpen={showResumePreview}
          artifact={resumeArtifact}
          jobId={selectedJob.id}
          onClose={() => setShowResumePreview(false)}
          onCopy={handleCopyText}
          onDownload={handleDownloadPDF}
        />
      )}
    </div>
  );
}
