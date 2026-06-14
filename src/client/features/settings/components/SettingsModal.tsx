import { useState } from "react";
import { useSettings } from "../hooks/useSettings";
import "../styles/settings-modal.css";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, careerDoc, angles, loading, error, updateSettings } =
    useSettings();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"thresholds" | "career" | "angles">(
    "thresholds"
  );

  if (!isOpen) return null;

  const handleEdit = () => {
    if (settings) {
      setFormData({
        autoProceedThreshold: settings.autoProceedThreshold,
        minimumFloorThreshold: settings.minimumFloorThreshold,
        modelName: settings.modelName,
        outputDirectory: settings.outputDirectory,
      });
      setEditing(true);
      setSubmitError(null);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({});
    setSubmitError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]:
        name === "modelName" || name === "outputDirectory"
          ? value
          : parseInt(value, 10),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitError(null);
      await updateSettings(formData);
      setEditing(false);
      setFormData({});
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="settings-modal-overlay">
        <div className="settings-modal">
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>Settings</h2>
          <button
            className="settings-close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {error && <div className="settings-error">{error}</div>}
        {submitError && <div className="settings-error">{submitError}</div>}

        <div className="settings-tabs">
          <button
            className={`tab ${activeTab === "thresholds" ? "active" : ""}`}
            onClick={() => setActiveTab("thresholds")}
          >
            Thresholds & Model
          </button>
          <button
            className={`tab ${activeTab === "career" ? "active" : ""}`}
            onClick={() => setActiveTab("career")}
          >
            Career Profile
          </button>
          <button
            className={`tab ${activeTab === "angles" ? "active" : ""}`}
            onClick={() => setActiveTab("angles")}
          >
            Positioning Angles
          </button>
        </div>

        <div className="settings-content">
          {activeTab === "thresholds" && settings && (
            <div className="settings-section">
              {!editing ? (
                <>
                  <div className="setting-item">
                    <label>Auto-Proceed Threshold</label>
                    <div className="setting-value">
                      {settings.autoProceedThreshold}%
                    </div>
                    <p className="setting-description">
                      Auto-apply if fit score exceeds this threshold
                    </p>
                  </div>

                  <div className="setting-item">
                    <label>Minimum Floor Threshold</label>
                    <div className="setting-value">
                      {settings.minimumFloorThreshold}%
                    </div>
                    <p className="setting-description">
                      Do not consider jobs below this fit threshold
                    </p>
                  </div>

                  <div className="setting-item">
                    <label>Model Name</label>
                    <div className="setting-value">{settings.modelName}</div>
                    <p className="setting-description">
                      Claude model used for job analysis
                    </p>
                  </div>

                  <div className="setting-item">
                    <label>Output Directory</label>
                    <div className="setting-value">
                      {settings.outputDirectory}
                    </div>
                    <p className="setting-description">
                      Where to save generated artifacts
                    </p>
                  </div>

                  <button className="settings-edit-btn" onClick={handleEdit}>
                    Edit Settings
                  </button>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="settings-form">
                  <div className="form-group">
                    <label htmlFor="autoProceedThreshold">
                      Auto-Proceed Threshold (0-100)
                    </label>
                    <input
                      type="number"
                      id="autoProceedThreshold"
                      name="autoProceedThreshold"
                      min="0"
                      max="100"
                      value={formData.autoProceedThreshold || ""}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="minimumFloorThreshold">
                      Minimum Floor Threshold (0-100)
                    </label>
                    <input
                      type="number"
                      id="minimumFloorThreshold"
                      name="minimumFloorThreshold"
                      min="0"
                      max="100"
                      value={formData.minimumFloorThreshold || ""}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="modelName">Model Name</label>
                    <select
                      id="modelName"
                      name="modelName"
                      value={formData.modelName || ""}
                      onChange={handleChange as any}
                    >
                      <option value="claude-opus-4-1">
                        Claude Opus 4.1
                      </option>
                      <option value="claude-opus-4">Claude Opus 4</option>
                      <option value="claude-sonnet-4-20250514">
                        Claude Sonnet 4
                      </option>
                      <option value="claude-haiku-3-5">Claude Haiku</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="outputDirectory">Output Directory</label>
                    <input
                      type="text"
                      id="outputDirectory"
                      name="outputDirectory"
                      value={formData.outputDirectory || ""}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="settings-save-btn"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="settings-cancel-btn"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "career" && careerDoc && (
            <div className="settings-section">
              <div className="career-doc-preview">
                <div className="preview-header">
                  <h3>Career Profile</h3>
                  <div className="preview-meta">
                    <span className="hash-label">Hash:</span>
                    <code className="hash-value">
                      {careerDoc.hash.substring(0, 16)}...
                    </code>
                  </div>
                </div>

                {careerDoc.isPlaceholder && (
                  <div className="placeholder-notice">
                    ⚠️ This is a placeholder document. Update{" "}
                    <code>data/Master_Career_Document.md</code> with your real
                    information for accurate job analysis.
                  </div>
                )}

                <div className="career-stats">
                  <div className="stat">
                    <span className="stat-label">Roles</span>
                    <span className="stat-value">{careerDoc.roles.length}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Skills</span>
                    <span className="stat-value">
                      {Object.values(careerDoc.skillsInventory)
                        .flat()
                        .filter((s: any) => s && !s.startsWith("[")).length}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Education</span>
                    <span className="stat-value">
                      {careerDoc.education.length}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Projects</span>
                    <span className="stat-value">
                      {careerDoc.projects.length}
                    </span>
                  </div>
                </div>

                {careerDoc.roles.length > 0 && (
                  <div className="career-detail">
                    <h4>Professional Experience</h4>
                    <ul>
                      {careerDoc.roles.map((role, i) => (
                        <li key={i}>
                          <strong>{role.title}</strong> at {role.company}
                          {role.startDate && (
                            <span className="date">
                              {" "}
                              ({role.startDate}–{role.endDate || "Present"})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="career-note">
                  💡 Edit this document directly at{" "}
                  <code>data/Master_Career_Document.md</code>. The app will
                  automatically detect changes and version them.
                </p>
              </div>
            </div>
          )}

          {activeTab === "angles" && angles.length > 0 && (
            <div className="settings-section">
              <div className="angles-preview">
                <h3>Positioning Angles</h3>
                <p className="angles-description">
                  These angles help frame your experience for different job
                  contexts.
                </p>

                <div className="angles-list">
                  {angles.map((angle) => (
                    <div key={angle.id} className="angle-card">
                      <h4>{angle.label}</h4>
                      <p className="angle-description">
                        {angle.description}
                      </p>
                      <div className="angle-lead">
                        <strong>Lead with:</strong>
                        <ul>
                          {angle.leadWith.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="settings-close-footer-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
