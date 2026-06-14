interface ResumePreviewProps {
  jobId?: string | undefined;
}

export function ResumePreview({ jobId }: ResumePreviewProps) {
  return (
    <div className="workspace-card">
      <h3 className="workspace-card-title">Resume Preview</h3>
      <p className="workspace-card-subtitle">Live preview of your resume</p>

      <div className="resume-preview-container">
        <div className="resume-preview-empty">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
            <p style={{ marginBottom: '8px', fontWeight: '500' }}>
              Resume preview loading...
            </p>
            <p style={{ fontSize: '12px', color: '#ccc' }}>
              {jobId
                ? 'Loading your resume preview'
                : 'Select a job to view preview'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
