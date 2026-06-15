import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { ResumeContent, CoverLetterContent } from "../schemas/artifact.schema.js";
import { PDFTemplateService } from "./pdf-template.service.js";

/**
 * Exports artifacts to PDF format
 * Uses template-based rendering to ensure ATS-safe structure
 */
export class PDFExportService {
  private templateService: PDFTemplateService;

  constructor() {
    this.templateService = new PDFTemplateService();
  }

  /**
   * Generate PDF from resume artifact
   * Returns Promise that resolves with PDF bytes
   */
  async generateResumePDF(resumeContent: ResumeContent["resume"]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Validate HTML can be generated (architecture requirement)
        const html = this.templateService.renderResumeToHTML(resumeContent);
        if (!html || html.length === 0) {
          throw new Error("Failed to render resume HTML template");
        }

        // Create PDF document with ATS-safe settings
        const pdf = new PDFDocument({
          margin: 36, // 0.5 inch margins (72 points per inch)
          size: "Letter",
          bufferPages: true,
        });

        const stream = pdf.pipe(new PassThrough());
        const chunks: Buffer[] = [];

        stream.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        stream.on("end", () => {
          resolve(Buffer.concat(chunks));
        });

        stream.on("error", (err: Error) => {
          reject(err);
        });

        // Render resume content with ATS-safe typography
        this.renderResumeToPDF(pdf, resumeContent);

        pdf.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate PDF from cover letter artifact
   * Returns Promise that resolves with PDF bytes
   */
  async generateCoverLetterPDF(
    coverLetterContent: CoverLetterContent["coverLetter"]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const pdf = new PDFDocument({
          margin: 36,
          size: "Letter",
          bufferPages: true,
        });

        const stream = pdf.pipe(new PassThrough());
        const chunks: Buffer[] = [];

        stream.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        stream.on("end", () => {
          resolve(Buffer.concat(chunks));
        });

        stream.on("error", (err: Error) => {
          reject(err);
        });

        this.renderCoverLetterToPDF(pdf, coverLetterContent);

        pdf.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Render resume content to PDF with ATS-safe formatting
   */
  private renderResumeToPDF(pdf: PDFKit.PDFDocument, resume: ResumeContent["resume"]): void {
    const FONT_SIZE_HEADING = 12;
    const FONT_SIZE_SUBHEADING = 11;
    const FONT_SIZE_BODY = 10;

    // Professional Summary
    if (resume.professionalSummary) {
      this.addSection(pdf, "PROFESSIONAL SUMMARY", FONT_SIZE_HEADING);
      pdf.fontSize(FONT_SIZE_BODY).text(resume.professionalSummary, { width: 540 });
      pdf.moveDown(0.3);
    }

    // Core Skills
    if (resume.coreSkills && resume.coreSkills.length > 0) {
      this.addSection(pdf, "CORE SKILLS", FONT_SIZE_HEADING);
      const skillsText = resume.coreSkills.join(" • ");
      pdf.fontSize(FONT_SIZE_BODY).text(skillsText, { width: 540 });
      pdf.moveDown(0.3);
    }

    // Experience
    if (resume.experience && resume.experience.length > 0) {
      this.addSection(pdf, "EXPERIENCE", FONT_SIZE_HEADING);

      resume.experience.forEach((job, index) => {
        // Job title and company
        const jobHeader = `${job.title} at ${job.company}`;
        pdf.fontSize(FONT_SIZE_SUBHEADING).font("Helvetica-Bold").text(jobHeader);

        // Dates
        if (job.dates) {
          pdf.fontSize(FONT_SIZE_BODY).font("Helvetica").text(job.dates);
        }

        // Description
        if (job.description) {
          pdf.fontSize(FONT_SIZE_BODY).text(job.description, { width: 540 });
        }

        // Bullets
        if (job.bullets && job.bullets.length > 0) {
          pdf.fontSize(FONT_SIZE_BODY);
          job.bullets.forEach((bullet) => {
            pdf.text(`• ${bullet}`, { width: 520, indent: 10 });
          });
        }

        // Space between jobs (except last)
        if (index < resume.experience.length - 1) {
          pdf.moveDown(0.2);
        }
      });

      pdf.moveDown(0.3);
    }

    // Education
    if (resume.education && resume.education.length > 0) {
      this.addSection(pdf, "EDUCATION", FONT_SIZE_HEADING);

      resume.education.forEach((edu) => {
        const educationLine = `${edu.degree} from ${edu.school}`;
        pdf.fontSize(FONT_SIZE_SUBHEADING).font("Helvetica-Bold").text(educationLine);

        if (edu.year) {
          pdf.fontSize(FONT_SIZE_BODY).font("Helvetica").text(edu.year);
        }

        pdf.moveDown(0.15);
      });
    }
  }

  /**
   * Render cover letter content to PDF with professional formatting
   */
  private renderCoverLetterToPDF(
    pdf: PDFKit.PDFDocument,
    coverLetter: CoverLetterContent["coverLetter"]
  ): void {
    const FONT_SIZE_BODY = 11;

    // Greeting
    pdf.fontSize(FONT_SIZE_BODY).font("Helvetica").text(coverLetter.greeting);
    pdf.moveDown(0.2);

    // Opening
    pdf.fontSize(FONT_SIZE_BODY).text(coverLetter.opening);
    pdf.moveDown(0.3);

    // Body paragraphs
    coverLetter.bodyParagraphs.forEach((paragraph) => {
      pdf.fontSize(FONT_SIZE_BODY).text(paragraph);
      pdf.moveDown(0.3);
    });

    // Closing
    pdf.fontSize(FONT_SIZE_BODY).text(coverLetter.closing);
    pdf.moveDown(0.3);

    // Signature
    pdf.fontSize(FONT_SIZE_BODY).text(coverLetter.signature);
  }

  /**
   * Add section heading with ATS-safe formatting
   */
  private addSection(pdf: PDFKit.PDFDocument, title: string, fontSize: number): void {
    pdf.fontSize(fontSize).font("Helvetica-Bold").text(title);
    pdf.moveTo(36, pdf.y).lineTo(540, pdf.y).stroke("#000000");
    pdf.moveDown(0.15);
    pdf.font("Helvetica");
  }
}

export function createPDFExportService(): PDFExportService {
  return new PDFExportService();
}
