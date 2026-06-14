import { useMemo } from "react";
import { CareerModel, Experience } from "@shared/types";
import "../styles/preview-renderer.css";

interface PreviewRendererProps {
  careerModel: CareerModel | null;
  loading?: boolean;
  error?: string | null;
  positioningAngle?: string;
  yearsOfExperience?: number;
  changeCount?: number;
}

export default function PreviewRenderer({
  careerModel,
  loading = false,
  error = null,
  positioningAngle,
  yearsOfExperience,
  changeCount = 0,
}: PreviewRendererProps) {
  const parsedContent = useMemo(() => {
    if (!careerModel?.content) return null;

    try {
      return JSON.parse(careerModel.content);
    } catch {
      return null;
    }
  }, [careerModel?.content]);

  if (loading) {
    return (
      <div className="preview-renderer-container">
        <div className="preview-renderer-loading">
          <div className="preview-renderer-loading-spinner"></div>
          <p className="preview-renderer-loading-text">Loading career model...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="preview-renderer-container">
        <div className="preview-renderer-error">
          <div className="preview-renderer-error-box">
            <h4 className="preview-renderer-error-title">Error Loading Preview</h4>
            <p className="preview-renderer-error-message">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!careerModel || !parsedContent) {
    return (
      <div className="preview-renderer-container">
        <div className="preview-renderer-empty">
          <p>No career model available. Generate a preview to get started.</p>
        </div>
      </div>
    );
  }

  // Calculate total years of experience
  const totalYearsOfExperience = yearsOfExperience || calculateYearsOfExperience(parsedContent.experience);

  return (
    <div className="preview-renderer-container">
      <div className="preview-renderer-content">
        {/* Header */}
        <header className="preview-header">
          <h1 className="preview-header-title">{parsedContent.name || "Professional Profile"}</h1>
          {(positioningAngle || totalYearsOfExperience) && (
            <div className="preview-header-info">
              {positioningAngle && (
                <div className="preview-header-positioning">
                  <strong>Positioning:</strong> {positioningAngle}
                </div>
              )}
              {totalYearsOfExperience && (
                <div className="preview-header-experience">
                  <strong>Experience:</strong> {totalYearsOfExperience}+ years
                </div>
              )}
            </div>
          )}
        </header>

        {/* Summary Section */}
        {parsedContent.summary && (
          <section className="preview-section">
            <h2 className="preview-section-title">Professional Summary</h2>
            <p className="preview-summary">{parsedContent.summary}</p>
          </section>
        )}

        {/* Experience Section */}
        {parsedContent.experience && parsedContent.experience.length > 0 && (
          <section className="preview-section">
            <h2 className="preview-section-title">Experience</h2>
            <ul className="preview-experience-list">
              {parsedContent.experience.map((exp: Experience, idx: number) => (
                <li key={idx} className="preview-experience-item">
                  <div className="preview-experience-header">
                    <h3 className="preview-experience-title">{exp.title}</h3>
                    {exp.start_date && (
                      <span className="preview-experience-duration">
                        {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
                      </span>
                    )}
                  </div>
                  <p className="preview-experience-company">{exp.company}</p>
                  {exp.description && (
                    <p className="preview-experience-description">{exp.description}</p>
                  )}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul className="preview-experience-accomplishments">
                      {exp.achievements.map((achievement, aidx) => (
                        <li key={aidx} className="preview-experience-accomplishment">
                          {achievement}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Skills Section */}
        {parsedContent.skills && parsedContent.skills.length > 0 && (
          <section className="preview-section preview-skills">
            <h2 className="preview-section-title">Top Skills</h2>
            <ul className="preview-skills-list">
              {parsedContent.skills.slice(0, 15).map((skill: any, idx: number) => (
                <li key={idx} className="preview-skill-tag">
                  {skill.name}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Footer */}
        <footer className="preview-footer">
          <div className="preview-footer-hash">
            <strong>Hash:</strong> {(careerModel.hash || careerModel.metadata.hash).substring(0, 12)}...
          </div>
          {changeCount > 0 && (
            <div className="preview-footer-change-count">
              <strong>{changeCount}</strong> change{changeCount !== 1 ? "s" : ""} applied
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

function calculateYearsOfExperience(experiences: Experience[] | undefined): number {
  if (!experiences || experiences.length === 0) return 0;

  let totalMonths = 0;

  experiences.forEach((exp) => {
    if (!exp.start_date) return;

    const startDate = new Date(exp.start_date);
    const endDate = exp.is_current ? new Date() : exp.end_date ? new Date(exp.end_date) : null;

    if (!endDate) return;

    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
    totalMonths += Math.max(0, months);
  });

  return Math.round(totalMonths / 12);
}

function formatDateRange(startDate: string, endDate?: string, isCurrent?: boolean): string {
  const start = formatDate(startDate);
  if (isCurrent) {
    return `${start} - Present`;
  }
  if (endDate) {
    const end = formatDate(endDate);
    return `${start} - ${end}`;
  }
  return start;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
  } catch {
    return dateString;
  }
}
