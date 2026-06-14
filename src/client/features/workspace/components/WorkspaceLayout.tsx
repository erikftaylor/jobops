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
      {/* Header */}
      <div className="workspace-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          {onBackClick && (
            <button
              className="workspace-back-btn"
              onClick={onBackClick}
              aria-label="Back to jobs"
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
              <span>📍 {job.location || 'Location not specified'}</span>
              {job.salary_min && job.salary_max && (
                <span>
                  💰 {job.salary_min.toLocaleString()}-{job.salary_max.toLocaleString()} {job.currency}
                </span>
              )}
              {job.job_type && (
                <span>📋 {job.job_type.replace('_', ' ').replace('-', ' ').toUpperCase()}</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="workspace-layout">
        {/* Left Column (60%) */}
        <div className="workspace-left-column">
          <ResumeScore jobId={jobId} />
          <MissingKeywords jobId={jobId} />
          <RecruiterHeatmap jobId={jobId} />
          <JobFitDashboard jobId={jobId} />
        </div>

        {/* Right Column (40%) */}
        <div className="workspace-right-column">
          <ResumePreview jobId={jobId} />
          <RecruiterChat jobId={jobId} />
          <ArtifactComparison jobId={jobId} />
        </div>
      </div>
    </div>
  );
}
