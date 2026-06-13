import { useState } from "react";
import { ChangeSet } from "@shared/types";
import DiffViewer from "./DiffViewer";
import "../styles/confirmation-card.css";

interface ConfirmationCardProps {
  changeset: ChangeSet;
  onAccept: (changeSetId: string) => Promise<void>;
  onReject: (changeSetId: string, note?: string) => Promise<void>;
  onModify: (changeSetId: string, modifiedText: string) => Promise<void>;
  isLoading?: boolean;
}

export default function ConfirmationCard({
  changeset,
  onAccept,
  onReject,
  onModify,
  isLoading = false,
}: ConfirmationCardProps) {
  const [isModifying, setIsModifying] = useState(false);
  const [modifyText, setModifyText] = useState(changeset.proposed_text);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confidenceLevel = changeset.confidence > 0.75 ? "high" : changeset.confidence > 0.5 ? "medium" : "low";

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await onAccept(changeset.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject(changeset.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModifyClick = () => {
    setIsModifying(true);
    setModifyText(changeset.proposed_text);
  };

  const handleModifyApply = async () => {
    setIsSubmitting(true);
    try {
      await onModify(changeset.id, modifyText);
      setIsModifying(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModifyCancel = () => {
    setIsModifying(false);
    setModifyText(changeset.proposed_text);
  };

  const isDisabled = isLoading || isSubmitting;

  return (
    <div className={`confirmation-card ${isDisabled ? "is-loading" : ""}`}>
      {/* Header */}
      <div className="confirmation-card-header">
        <h3 className="confirmation-card-title">
          {changeset.section_type === "bullet"
            ? "Bullet Point"
            : changeset.section_type === "paragraph"
              ? "Paragraph"
              : changeset.section_type === "sentence"
                ? "Sentence"
                : "Section"}{" "}
          in {changeset.location}
        </h3>
        <div className={`confidence-badge ${confidenceLevel}`}>
          <span>{Math.round(changeset.confidence * 100)}% confident</span>
        </div>
      </div>

      {/* Diff Section */}
      <div className="confirmation-card-diff">
        <div className="diff-label">Proposed Change</div>
        <DiffViewer original={changeset.original_text} proposed={changeset.proposed_text} />
      </div>

      {/* Reasoning Section */}
      <div className="confirmation-card-reasoning">
        <label className="reasoning-label">Why this change?</label>
        <p className="reasoning-text">{changeset.reasoning}</p>
      </div>

      {/* Business Impact Section */}
      {changeset.business_impact && changeset.business_impact.length > 0 && (
        <div className="confirmation-card-impact">
          <label className="impact-label">Business Impact</label>
          <ul className="impact-list">
            {changeset.business_impact.map((impact, idx) => (
              <li key={idx} className="impact-item">
                {impact}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modify Form Section */}
      {isModifying && (
        <div className="confirmation-card-modify">
          <label className="modify-label">Customize the change</label>
          <form className="modify-form">
            <textarea
              className="modify-textarea"
              value={modifyText}
              onChange={(e) => setModifyText(e.target.value)}
              placeholder="Enter your custom text..."
              disabled={isDisabled}
            />
            <div className="modify-form-actions">
              <button
                type="button"
                className="modify-apply-btn"
                onClick={handleModifyApply}
                disabled={isDisabled || !modifyText.trim()}
              >
                {isSubmitting ? "Applying..." : "Apply"}
              </button>
              <button
                type="button"
                className="modify-cancel-btn"
                onClick={handleModifyCancel}
                disabled={isDisabled}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Action Buttons */}
      {!isModifying && (
        <div className="confirmation-card-actions">
          <button
            className="action-accept-btn"
            onClick={handleAccept}
            disabled={isDisabled}
            aria-label={`Accept change for ${changeset.location}`}
          >
            {isSubmitting ? "Accepting..." : "Accept"}
          </button>
          <button
            className="action-modify-btn"
            onClick={handleModifyClick}
            disabled={isDisabled}
            aria-label={`Modify change for ${changeset.location}`}
          >
            Modify
          </button>
          <button
            className="action-reject-btn"
            onClick={handleReject}
            disabled={isDisabled}
            aria-label={`Reject change for ${changeset.location}`}
          >
            {isSubmitting ? "Rejecting..." : "Reject"}
          </button>
        </div>
      )}
    </div>
  );
}
