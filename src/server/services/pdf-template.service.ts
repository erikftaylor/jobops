import { ResumeContent } from "../schemas/artifact.schema.js";

/**
 * Renders artifact JSON to ATS-safe HTML template
 * Enforces: single column, standard headings, readable typography, no graphics/icons
 */
export class PDFTemplateService {
  /**
   * Render resume JSON to ATS-safe HTML
   */
  renderResumeToHTML(resume: ResumeContent["resume"]): string {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume</title>
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000;
      margin: 0.5in;
      max-width: 7.5in;
    }
    h1 {
      font-size: 14pt;
      font-weight: bold;
      margin: 0 0 0.2in 0;
    }
    h2 {
      font-size: 12pt;
      font-weight: bold;
      margin: 0.15in 0 0.1in 0;
      border-bottom: 1px solid #000;
      padding-bottom: 0.05in;
    }
    h3 {
      font-size: 11pt;
      font-weight: bold;
      margin: 0.1in 0 0 0;
    }
    p {
      margin: 0 0 0.05in 0;
    }
    ul {
      margin: 0.05in 0;
      padding-left: 0.3in;
    }
    li {
      margin: 0.03in 0;
    }
    .contact-info {
      text-align: center;
      font-size: 11pt;
      margin-bottom: 0.2in;
    }
    .section {
      margin-bottom: 0.15in;
    }
    .job-entry {
      margin-bottom: 0.1in;
    }
    .education-entry {
      margin-bottom: 0.08in;
    }
  </style>
</head>
<body>
${this.renderHeader()}
${this.renderSummary(resume)}
${this.renderSkills(resume)}
${this.renderExperience(resume)}
${this.renderEducation(resume)}
</body>
</html>`;

    return html;
  }

  private renderHeader(): string {
    // Extract name from first experience entry or use placeholder
    // In a full implementation, name would be in Artifact, not in resume
    const name = "Professional Resume";
    return `
<div class="contact-info">
  <h1>${this.escapeHTML(name)}</h1>
</div>`;
  }

  private renderSummary(resume: ResumeContent["resume"]): string {
    if (!resume.professionalSummary) return "";
    return `
<div class="section">
  <h2>PROFESSIONAL SUMMARY</h2>
  <p>${this.escapeHTML(resume.professionalSummary)}</p>
</div>`;
  }

  private renderSkills(resume: ResumeContent["resume"]): string {
    if (!resume.coreSkills || resume.coreSkills.length === 0) return "";
    return `
<div class="section">
  <h2>CORE SKILLS</h2>
  <p>${resume.coreSkills.map((s) => this.escapeHTML(s)).join(" • ")}</p>
</div>`;
  }

  private renderExperience(resume: ResumeContent["resume"]): string {
    if (!resume.experience || resume.experience.length === 0) return "";

    const experienceHTML = resume.experience
      .map((exp) => {
        let html = `<div class="job-entry">
      <h3>${this.escapeHTML(exp.title)} at ${this.escapeHTML(exp.company)}</h3>`;

        if (exp.dates) {
          html += `<p><strong>${this.escapeHTML(exp.dates)}</strong></p>`;
        }

        if (exp.description) {
          html += `<p>${this.escapeHTML(exp.description)}</p>`;
        }

        if (exp.bullets && exp.bullets.length > 0) {
          html += `<ul>`;
          exp.bullets.forEach((bullet) => {
            html += `<li>${this.escapeHTML(bullet)}</li>`;
          });
          html += `</ul>`;
        }

        html += `</div>`;
        return html;
      })
      .join("\n");

    return `
<div class="section">
  <h2>EXPERIENCE</h2>
  ${experienceHTML}
</div>`;
  }

  private renderEducation(resume: ResumeContent["resume"]): string {
    if (!resume.education || resume.education.length === 0) return "";

    const educationHTML = resume.education
      .map((edu) => {
        let html = `<div class="education-entry">
      <h3>${this.escapeHTML(edu.degree)} from ${this.escapeHTML(edu.school)}</h3>`;

        if (edu.year) {
          html += `<p>${this.escapeHTML(edu.year)}</p>`;
        }

        html += `</div>`;
        return html;
      })
      .join("\n");

    return `
<div class="section">
  <h2>EDUCATION</h2>
  ${educationHTML}
</div>`;
  }

  /**
   * Escape HTML special characters to prevent injection
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

export function createPDFTemplateService(): PDFTemplateService {
  return new PDFTemplateService();
}
