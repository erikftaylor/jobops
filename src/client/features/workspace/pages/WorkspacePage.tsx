import { useEffect, useState } from 'react';
import { WorkspaceLayout } from '../components';
import type { Job } from '@shared/types';
import '../styles/workspace.css';

interface WorkspacePageProps {
  jobId: string | undefined;
  onBack?: () => void;
}

export function WorkspacePage({ jobId, onBack }: WorkspacePageProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId) {
        setError('No job ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to load job');
        }
        const data = await response.json();
        setJob(data);
      } catch (err) {
        setError((err as Error).message);
        setJob(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadJob();
  }, [jobId]);

  const handleBackClick = () => {
    onBack?.();
  };

  if (isLoading) {
    return (
      <div className="workspace-container">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '20px', color: '#666', marginBottom: '12px' }}>
            Loading workspace...
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            Preparing analysis for {jobId}
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="workspace-container">
        <button
          className="workspace-back-btn"
          onClick={handleBackClick}
          style={{ marginBottom: '24px' }}
        >
          ← Back to Jobs
        </button>
        <div style={{
          padding: '32px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#991b1b',
          textAlign: 'center'
        }}>
          <p style={{ marginBottom: '8px' }}>
            <strong>Error loading workspace</strong>
          </p>
          <p style={{ fontSize: '14px' }}>
            {error || 'Could not load the requested job'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceLayout
      jobId={jobId}
      job={job}
      onBackClick={handleBackClick}
    />
  );
}

export default WorkspacePage;
