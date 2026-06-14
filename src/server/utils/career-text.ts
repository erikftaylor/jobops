import type { CareerModel } from "../../shared/types.js";

export interface CareerTextOptions {
  includeEducation?: boolean;
  includeMetrics?: boolean;
  useCompanyFormat?: boolean;
}

/**
 * Convert CareerModel to plain text for analysis and matching.
 * Consolidates similar implementations from fit-analyzer, resume-score, and workspace-recalculation.
 */
export function careerModelToText(
  careerModel: CareerModel,
  options: CareerTextOptions = {}
): string {
  const {
    includeEducation = false,
    includeMetrics = false,
    useCompanyFormat = true,
  } = options;

  const parts: string[] = [];

  // Add basic info
  if (careerModel.fullName) {
    parts.push(careerModel.fullName);
  }

  if (careerModel.sections.summary) {
    parts.push(careerModel.sections.summary);
  }

  // Add experience
  if (careerModel.sections.experience?.length) {
    const experienceText = careerModel.sections.experience
      .map((e) => {
        let expText = e.title;
        if (useCompanyFormat && e.company) {
          expText += ` at ${e.company}`;
        }
        if (e.description) {
          expText += ` ${e.description}`;
        }
        if (includeMetrics && e.metrics?.length) {
          expText += ` ${e.metrics.join(" ")}`;
        }
        return expText;
      })
      .join(" ");
    parts.push(experienceText);
  }

  // Add skills
  if (careerModel.sections.skills?.length) {
    parts.push(careerModel.sections.skills.join(" "));
  }

  // Add education (optional)
  if (includeEducation && careerModel.sections.education?.length) {
    const educationText = careerModel.sections.education
      .map((edu) => {
        const eduParts = [];
        if (edu.school) eduParts.push(edu.school);
        if (edu.degree) eduParts.push(edu.degree);
        return eduParts.join(" ");
      })
      .join(" ");
    if (educationText) {
      parts.push(educationText);
    }
  }

  return parts.filter(Boolean).join(" ");
}
