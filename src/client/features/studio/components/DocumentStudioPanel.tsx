import { useState, useEffect } from "react";
import { Job } from "@shared/types";
import { GenerateButton, ResumePreviewModal } from "../../artifacts/index";
import { useArtifacts } from "../../artifacts/hooks/useArtifacts";
import "../styles/document-studio-panel.css";

type JobState = "draft" | "analyzed" | "refining" | "approved" | "generated" | "applied" | "closed";

interface DocumentStudioPanelProps {
  selectedJob?: Job;
  onStateChange: (newState: JobState) => Promise<void>;
  onMarkApplied: (payload: {
    resumeArtifactId?: string;
    coverLetterArtifactId?: string;
    sourceUrl?: string;
    notes?: string;
  }) => Promise<void>;
  onOpenWorkspace?: () => void;
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function DocumentStudioPanel({
  selectedJob,
  onStateChange,
  onMarkApplied,
}: DocumentStudioPanelProps) {
  const { artifact: currentArtifact, error, copyToClipboard, downloadPDF, generateCoverLetter } = useArtifacts();
  const [activeTab, setActiveTab] = useState<"resume" | "cover_letter">("resume");
  const [showPreview, setShowPreview] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [applyingStatus, setApplyingStatus] = useState(false);
  const [resumeArtifactId, setResumeArtifactId] = useState<string | undefined>();
  const [coverLetterArtifactId, setCoverLetterArtifactId] = useState<string | undefined>();
  const [appliedDate, setAppliedDate] = useState<Date | null>(null);

  const displayedArtifact = currentArtifact?.artifactType === activeTab ? currentArtifact : null;

  useEffect(() => {
    if (currentArtifact) {
      if (currentArtifact.artifactType === "resume") {
        setResumeArtifactId(currentArtifact.id);
      } else if (currentArtifact.artifactType === "cover_letter") {
        setCoverLetterArtifactId(currentArtifact.id);
      }
    }
  }, [currentArtifact]);

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
        await onMarkApplied({
          resumeArtifactId,
          coverLetterArtifactId,
        });
        // Set applied date after successful marking
        setAppliedDate(new Date());
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
        <h2 className="studio-section-title">Tailored Materials</h2>
        <p className="studio-section-description">
          Select a job to generate your tailored resume and cover letter.
        </p>
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
      <h2 className="studio-section-title">Tailored Materials</h2>

      {/* Tab Selector */}
      <div className="document-tabs">
        <button
          className={`tab-button ${activeTab === "resume" ? "active" : ""}`}
          onClick={() => setActiveTab("resume")}
        >
          Resume
        </button>
        <button
          className={`tab-button ${activeTab === "cover_letter" ? "active" : ""}`}
          onClick={() => setActiveTab("cover_letter")}
        >
          Cover Letter
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {!displayedArtifact ? (
          <div className="artifact-empty">
            {canGenerate ? (
              <>
                {activeTab === "resume" ? (
                  <GenerateButton
                    jobId={selectedJob.id}
                    onArtifactCreated={(artifact: any) => {
                      setResumeArtifactId(artifact.id);
                      if (currentState !== "generated") {
                        onStateChange("generated");
                      }
                    }}
                  />
                ) : (
                  <button
                    className="cta-button primary"
                    onClick={async () => {
                      try {
                        await generateCoverLetter(selectedJob.id);
                      } catch (err) {
                        console.error("Cover letter generation failed:", err);
                      }
                    }}
                  >
                    Generate Cover Letter
                  </button>
                )}
              </>
            ) : (
              <p className="generate-prompt">Analyze the job first to generate materials</p>
            )}
            {error && <div className="error-message">{error}</div>}
          </div>
        ) : (
          <div className="artifact-ready">
            <p className="artifact-status">
              Ready — {formatTimeAgo(displayedArtifact.createdAt)}
            </p>

            <div className="artifact-actions">
              <button
                className="action-button"
                onClick={() => setShowPreview(true)}
              >
                Preview
              </button>
              <button
                className="action-button"
                onClick={handleCopyText}
              >
                {copyFeedback ? "✓ Copied" : "Copy"}
              </button>
              <button
                className="action-button"
                onClick={handleDownloadPDF}
                disabled={exportingPDF}
              >
                {exportingPDF ? "Downloading..." : "Download PDF"}
              </button>
            </div>

            <button
              className="action-link"
              onClick={() => {
                setResumeArtifactId(undefined);
                setCoverLetterArtifactId(undefined);
              }}
            >
              Regenerate
            </button>
          </div>
        )}
      </div>

      {/* Application Recording Section */}
      <div className="application-recording-section">
        <h3 className="recording-title">
          {currentState === "applied" ? "✓ Recorded" : "Application"}
        </h3>

        {currentState === "applied" ? (
          <div className="recording-success">
            <p className="success-message">Application complete.</p>
            {appliedDate && (
              <p className="success-date">
                Applied{" "}
                {appliedDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            <div className="success-details">
              {resumeArtifactId && <div className="detail">Resume saved</div>}
              {coverLetterArtifactId && <div className="detail">Cover letter saved</div>}
            </div>
          </div>
        ) : (
          <div className="recording-ready">
            <p className="ready-message">Ready once submitted.</p>
            <div className="material-checklist">
              <div className={`material-item ${resumeArtifactId ? "ready" : "pending"}`}>
                <span className="material-status">
                  {resumeArtifactId ? "✓" : "○"}
                </span>
                <span>Resume</span>
              </div>
              <div className={`material-item ${coverLetterArtifactId ? "ready" : "pending"}`}>
                <span className="material-status">
                  {coverLetterArtifactId ? "✓" : "○"}
                </span>
                <span>Cover Letter</span>
              </div>
            </div>
            <button
              className="cta-button primary"
              onClick={handleMarkApplied}
              disabled={applyingStatus || (!resumeArtifactId && !coverLetterArtifactId)}
              aria-label="Record application after you submit it"
            >
              {applyingStatus ? "Recording..." : "Record Application"}
            </button>
          </div>
        )}
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
