import { ResumeScore } from './ResumeScore';
import { MissingKeywords } from './MissingKeywords';
import { RecruiterHeatmap } from './RecruiterHeatmap';
import { JobFitDashboard } from './JobFitDashboard';
import { ArtifactComparison } from './ArtifactComparison';
import { RecruiterChat } from './RecruiterChat';
import { ResumePreview } from './ResumePreview';
import type { Job } from '@shared/types';

interface WorkspaceLayoutProps {
  jobId: string | undefined;
  job?: Job | null;
  onBackClick?: () => void;
}

export function WorkspaceLayout({ jobId, job, onBackClick }: WorkspaceLayoutProps) {
  return (
    <div className="workspace-container">
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {/* Header */}
      <header className="workspace-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          {onBackClick && (
            <button
              className="workspace-back-btn"
              onClick={onBackClick}
              aria-label="Back to jobs list"
            >
              ← Back
            </button>
          )}
        </div>

        <h1>
          {job ? `${job.title} at ${job.company}` : 'Resume Analysis Workspace'}
        </h1>

        <div className="workspace-header-meta">
          {job && (
            <>
              <div>
                <span className="sr-only">Location:</span> {job.location || 'Location not specified'}
              </div>
              {job.salary_min && job.salary_max && (
                <div>
                  <span className="sr-only">Salary:</span> {job.salary_min.toLocaleString()}-{job.salary_max.toLocaleString()} {job.currency}
                </div>
              )}
              {job.job_type && (
                <div>
                  <span className="sr-only">Job Type:</span> {job.job_type.replace('_', ' ').replace('-', ' ').toUpperCase()}
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="workspace-layout">
        {/* Left Column (60%) */}
        <section className="workspace-left-column" aria-label="Resume analysis section">
          <ResumeScore jobId={jobId} />
          <MissingKeywords jobId={jobId} />
          <RecruiterHeatmap jobId={jobId} />
          <JobFitDashboard jobId={jobId} />
        </section>

        {/* Right Column (40%) */}
        <section className="workspace-right-column" aria-label="Resume preview and chat section">
          <ResumePreview jobId={jobId} />
          <RecruiterChat jobId={jobId} />
          <ArtifactComparison jobId={jobId} />
        </section>
      </main>
    </div>
  );
}
