# Generated Artifacts

This directory contains generated PDFs and HTML sources for resumes and cover letters.

## Structure

```
output/
├── resumes/           # Generated resume PDFs
├── resume_sources/    # HTML source before PDF
├── cover_letters/     # Generated cover letter PDFs
└── letter_sources/    # HTML source before PDF
```

## File Naming

Files follow the pattern: `job-{job_id}-{document_type}-v{version}.{ext}`

Examples:
- `job-abc123-resume-v1.pdf` — First resume PDF for job abc123
- `job-abc123-resume-v1.html` — HTML source used to generate PDF
- `job-abc123-letter-v1.pdf` — First cover letter PDF

## Storage

- PDFs are stored for download and printing
- HTML sources are kept for reference and re-generation
- Files are linked in the database via `artifacts` table

## Cleanup

Old artifacts can be manually deleted. The database retains metadata for reference.

**Note:** This directory is not committed to version control (see `.gitignore`).
