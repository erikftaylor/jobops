import { useState } from "react";
import "../styles/new-job-form.css";

interface NewJobFormProps {
  onSubmit: (data: {
    jobDescription: string;
    company?: string;
    title?: string;
    url?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export default function NewJobForm({ onSubmit, isLoading }: NewJobFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!jobDescription.trim()) {
      setError("Job description is required");
      return;
    }

    try {
      await onSubmit({
        jobDescription,
        company: company || undefined,
        title: title || undefined,
        url: url || undefined,
      });

      // Clear form
      setJobDescription("");
      setCompany("");
      setTitle("");
      setUrl("");
      setExpanded(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!expanded) {
    return (
      <button
        className="new-job-button"
        onClick={() => setExpanded(true)}
        aria-label="Add new job"
      >
        + New Job
      </button>
    );
  }

  return (
    <form className="new-job-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h3>Add New Job</h3>
        <button
          type="button"
          className="close-button"
          onClick={() => setExpanded(false)}
          aria-label="Close form"
        >
          ✕
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="job-description">Job Description *</label>
        <textarea
          id="job-description"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste job posting here..."
          rows={6}
          required
          disabled={isLoading}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="company">Company</label>
          <input
            id="company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name (optional)"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="title">Job Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Job title (optional)"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="url">Job URL</label>
        <input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://... (optional)"
          disabled={isLoading}
        />
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => setExpanded(false)}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Job"}
        </button>
      </div>
    </form>
  );
}
