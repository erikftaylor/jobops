import type { CareerModel, RecruiterHeatmap, HeatmapSection } from '../../shared/types';

export class HeatmapAnalyzerService {
  analyze(careerModel: CareerModel): RecruiterHeatmap {
    const sections: HeatmapSection[] = [
      this.analyzeSummary(careerModel),
      this.analyzeSkills(careerModel),
      this.analyzeCurrentRole(careerModel),
      this.analyzeRecentExperience(careerModel),
      this.analyzeMetrics(careerModel),
      this.analyzeTools(careerModel),
      this.analyzeEducation(careerModel),
    ];

    const visibleSections = sections.filter(s => s.isVisible);
    const skippedSections = sections.filter(s => !s.isVisible).map(s => s.sectionName);
    const overallVisibility = Math.round(
      sections.length > 0 ? (visibleSections.reduce((sum, s) => sum + s.visibilityScore, 0) / sections.length) : 0
    );

    return {
      overallVisibility,
      sections,
      sixSecondSkim: this.generateSixSecondSkim(sections),
      skippedSections,
    };
  }

  private analyzeSummary(careerModel: CareerModel): HeatmapSection {
    const summary = careerModel.sections.summary || '';
    const isVisible = summary.length > 20;
    const visibilityScore = isVisible ? 95 : 20;

    return {
      sectionName: 'Summary',
      visibilityScore,
      recruiterConfidence: isVisible ? 'high' : 'low',
      riskLevel: isVisible ? 'low' : 'high',
      keyObservations: [
        isVisible ? 'Professional summary present and compelling' : 'Summary missing or too brief',
      ],
      recommendedImprovement: isVisible ? 'Highlight key achievements' : 'Add 2-3 sentence professional summary',
      isVisible,
    };
  }

  private analyzeSkills(careerModel: CareerModel): HeatmapSection {
    const skills = careerModel.sections.skills || [];
    const skillCount = skills.length;
    const isVisible = skillCount >= 5;
    const visibilityScore = Math.min(skillCount * 15, 100);

    return {
      sectionName: 'Skills',
      visibilityScore,
      recruiterConfidence: isVisible ? 'high' : 'medium',
      riskLevel: isVisible ? 'low' : 'high',
      keyObservations: [
        `${skillCount} skills listed`,
        isVisible ? 'Good variety of technical skills' : 'Too few skills listed',
      ],
      recommendedImprovement: isVisible ? 'Group by category (Languages, Frameworks, Tools)' : 'Expand to 8-10 key skills',
      isVisible,
    };
  }

  private analyzeCurrentRole(careerModel: CareerModel): HeatmapSection {
    const currentRole = careerModel.sections.experience?.[0];
    const isVisible = Boolean(currentRole && currentRole.title);
    const hasMetrics = currentRole?.metrics && currentRole.metrics.length > 0;

    return {
      sectionName: 'Current Role',
      visibilityScore: isVisible ? (hasMetrics ? 90 : 75) : 20,
      recruiterConfidence: isVisible ? 'high' : 'low',
      riskLevel: isVisible ? 'low' : 'high',
      keyObservations: [
        isVisible ? `${currentRole?.title} at ${currentRole?.company}` : 'No current role shown',
        hasMetrics ? 'Impact metrics present' : 'Missing quantified impact',
      ],
      recommendedImprovement: hasMetrics ? 'Ensure metrics are clear and specific' : 'Add 2-3 quantified business impacts',
      isVisible,
    };
  }

  private analyzeRecentExperience(careerModel: CareerModel): HeatmapSection {
    const experience = careerModel.sections.experience || [];
    const isVisible = experience.length >= 2;

    return {
      sectionName: 'Recent Experience',
      visibilityScore: isVisible ? 85 : 40,
      recruiterConfidence: isVisible ? 'high' : 'medium',
      riskLevel: isVisible ? 'low' : 'medium',
      keyObservations: [
        `${experience.length} previous roles listed`,
        isVisible ? 'Clear career progression shown' : 'Limited career history',
      ],
      recommendedImprovement: isVisible ? 'Highlight growth and progression' : 'Add more role descriptions',
      isVisible,
    };
  }

  private analyzeMetrics(careerModel: CareerModel): HeatmapSection {
    const experience = careerModel.sections.experience || [];
    const totalMetrics = experience.reduce((sum, exp) => sum + (exp.metrics?.length || 0), 0);
    const isVisible = totalMetrics >= 3;

    return {
      sectionName: 'Metrics',
      visibilityScore: isVisible ? 90 : 50,
      recruiterConfidence: isVisible ? 'high' : 'low',
      riskLevel: isVisible ? 'low' : 'high',
      keyObservations: [
        `${totalMetrics} measurable outcomes`,
        isVisible ? 'Strong quantified impact' : 'Limited quantification of impact',
      ],
      recommendedImprovement: isVisible ? 'Verify all metrics are specific and believable' : 'Add metrics (revenue, users, efficiency gains)',
      isVisible,
    };
  }

  private analyzeTools(careerModel: CareerModel): HeatmapSection {
    const skills = careerModel.sections.skills || [];
    const hasTools = skills.some(s => ['docker', 'kubernetes', 'aws', 'gcp', 'react', 'node'].some(t => s.toLowerCase().includes(t)));

    return {
      sectionName: 'Tools & Technologies',
      visibilityScore: hasTools ? 80 : 50,
      recruiterConfidence: hasTools ? 'high' : 'medium',
      riskLevel: hasTools ? 'low' : 'medium',
      keyObservations: [
        hasTools ? 'Modern tools and frameworks listed' : 'Limited technical tools mentioned',
      ],
      recommendedImprovement: hasTools ? 'Keep skills updated with latest technologies' : 'Add modern tools and frameworks',
      isVisible: hasTools,
    };
  }

  private analyzeEducation(careerModel: CareerModel): HeatmapSection {
    const education = careerModel.sections.education || [];
    const isVisible = education.length > 0;

    return {
      sectionName: 'Education',
      visibilityScore: isVisible ? 70 : 30,
      recruiterConfidence: isVisible ? 'medium' : 'low',
      riskLevel: isVisible ? 'low' : 'low',
      keyObservations: [
        isVisible ? `${education[0]?.school || 'University'} - ${education[0]?.degree || 'Degree'} ` : 'No education listed',
      ],
      recommendedImprovement: isVisible ? 'Highlight relevant certifications' : 'Add education if strong credential',
      isVisible,
    };
  }

  private generateSixSecondSkim(sections: HeatmapSection[]): string[] {
    return sections
      .filter(s => s.visibilityScore >= 75)
      .slice(0, 5)
      .map(s => `${s.sectionName} (${s.visibilityScore})`);
  }
}
