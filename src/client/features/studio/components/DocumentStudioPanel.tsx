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
  const { artifact: currentArtifact, error, copyToClipboard, downloadPDF, generateCoverLetter } = useArtifacts();
  const [artifactType, setArtifactType] = useState<"resume" | "cover_letter">("resume");
  const [showPreview, setShowPreview] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [applyingStatus, setApplyingStatus] = useState(false);

  // Determine if current artifact matches selected type
  const displayedArtifact = currentArtifact?.artifactType === artifactType ? currentArtifact : null;

  const handleCopyText = async () => {
    if (displayedArtifact) {
      await copyToClipboard(displayedArtifact.renderedText);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleDownloadPDF = async () => {
    if (displayedArtifact && selectedJob) {
      setExportingPDF(true);
      try {
        await downloadPDF(selectedJob.id, displayedArtifact.id);
      } finally {
        setExportingPDF(false);
      }
    }
  };

  const handleMarkApplied = async () => {
    setApplyingStatus(true);
    try {
      if (selectedJob) {
        // Update job state to applied
        await onStateChange("applied");
        // Notify parent
        await onMarkApplied();
      }
    } catch (err) {
      console.error("Failed to mark applied:", err);
    } finally {
      setApplyingStatus(false);
    }
  };

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
                  setArtifactType("resume");
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

          {error && artifactType === "resume" && (
            <div className="error-message">{error}</div>
          )}

          {displayedArtifact && artifactType === "resume" && (
            <div className="card-actions-additional">
              <div className="artifact-info">
                <span className="version">Version {displayedArtifact.version}</span>
                <span className="date">{new Date(displayedArtifact.createdAt).toLocaleDateString()}</span>
              </div>
              <button
                className="action-link"
                onClick={() => setShowPreview(true)}
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
            {canGenerate && (
              <button
                className="cta-button primary"
                onClick={() => generateCoverLetter(selectedJob.id)}
              >
                Generate Cover Letter
              </button>
            )}
            {!canGenerate && (
              <div className="button-disabled">
                <p>Analyze the job first to generate a cover letter</p>
              </div>
            )}
          </div>

          {error && artifactType === "cover_letter" && (
            <div className="error-message">{error}</div>
          )}

          {displayedArtifact && artifactType === "cover_letter" && (
            <div className="card-actions-additional">
              <div className="artifact-info">
                <span className="version">Version {displayedArtifact.version}</span>
                <span className="date">{new Date(displayedArtifact.createdAt).toLocaleDateString()}</span>
              </div>
              <button
                className="action-link"
                onClick={() => setShowPreview(true)}
              >
                Preview Letter
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
            onClick={handleMarkApplied}
            disabled={currentState === "applied" || applyingStatus}
          >
            {applyingStatus
              ? "Marking as Applied..."
              : currentState === "applied"
                ? "✓ Marked as Applied"
                : "Mark as Applied"}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {displayedArtifact && (
        <ResumePreviewModal
          isOpen={showPreview}
          artifact={displayedArtifact}
          jobId={selectedJob.id}
          onClose={() => setShowPreview(false)}
          onCopy={handleCopyText}
          onDownload={handleDownloadPDF}
        />
      )}
    </div>
  );
}
