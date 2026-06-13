import type { CareerModel, JobFitAnalysis, ExperienceGap } from '../../shared/types';

export class FitAnalyzerService {
  analyze(careerModel: CareerModel, jobDescription: string): JobFitAnalysis {
    const strongMatches = this.findStrongMatches(careerModel, jobDescription);
    const weakMatches = this.findWeakMatches(careerModel, jobDescription);
    const rejectionRisks = this.identifyRejectionRisks(careerModel, jobDescription);
    const experienceGaps = this.identifyExperienceGaps(careerModel, jobDescription);
    const overallFit = this.calculateOverallFit(strongMatches, weakMatches, experienceGaps);

    return {
      overallFit,
      confidenceLevel: overallFit >= 75 ? 'high' : overallFit >= 50 ? 'medium' : 'low',
      strongMatches,
      weakMatches,
      rejectionRisks,
      interviewTalkingPoints: this.generateTalkingPoints(careerModel, strongMatches),
      experienceGaps,
      recommendedPositioningAngle: this.getPositioningAngle(careerModel, jobDescription),
      likelihood: {
        phoneScreen: Math.min(overallFit * 0.9, 100),
        technicalInterview: Math.min(overallFit * 0.7, 100),
        offer: Math.min(overallFit * 0.4, 100),
      },
    };
  }

  private findStrongMatches(careerModel: CareerModel, jobDescription: string): string[] {
    const matches: string[] = [];
    const skills = careerModel.sections.skills || [];
    const jobLower = jobDescription.toLowerCase();

    skills.forEach(skill => {
      if (jobLower.includes(skill.toLowerCase())) {
        matches.push(`${skill} expertise`);
      }
    });

    const currentRole = careerModel.sections.experience?.[0];
    if (currentRole && jobLower.includes(currentRole.title.toLowerCase())) {
      matches.push(`${currentRole.title} experience`);
    }

    return matches.slice(0, 5);
  }

  private findWeakMatches(careerModel: CareerModel, jobDescription: string): string[] {
    const weak: string[] = [];
    const jobKeywords = jobDescription.split(/[\s,]+/).filter(w => w.length > 4);
    const resumeText = this.careerToText(careerModel);

    jobKeywords.forEach(keyword => {
      const count = (resumeText.match(new RegExp(keyword, 'gi')) || []).length;
      if (count > 0 && count < 2) {
        weak.push(`${keyword} mentioned but not emphasized`);
      }
    });

    return weak.slice(0, 3);
  }

  private identifyRejectionRisks(careerModel: CareerModel, jobDescription: string): string[] {
    const risks: string[] = [];

    const experienceYears = (careerModel.sections.experience || []).length * 3;
    if (jobDescription.includes('10+') && experienceYears < 10) {
      risks.push('Experience level below stated requirement');
    }

    const skillsCount = (careerModel.sections.skills || []).length;
    const requiredCount = (jobDescription.match(/required|must|essential/gi) || []).length;
    if (skillsCount < 5) {
      risks.push('Limited breadth of technical skills shown');
    }

    const metricsCount = (careerModel.sections.experience || [])
      .reduce((sum, exp) => sum + (exp.metrics?.length || 0), 0);
    if (metricsCount < 2) {
      risks.push('Lack of quantified business impact');
    }

    if (!jobDescription.toLowerCase().includes(careerModel.sections.summary?.toLowerCase() || '')) {
      risks.push('Summary does not address job requirements');
    }

    return risks;
  }

  private identifyExperienceGaps(careerModel: CareerModel, jobDescription: string): ExperienceGap[] {
    const gaps: ExperienceGap[] = [];
    const resumeText = this.careerToText(careerModel);

    const criticalRequirements = [
      { keyword: 'kubernetes', name: 'Kubernetes' },
      { keyword: 'microservices', name: 'Microservices Architecture' },
      { keyword: 'terraform', name: 'Terraform/IaC' },
      { keyword: 'leadership', name: 'Team Leadership' },
    ];

    criticalRequirements.forEach(req => {
      if (jobDescription.toLowerCase().includes(req.keyword)) {
        const hasMatch = resumeText.toLowerCase().includes(req.keyword);
        if (!hasMatch) {
          gaps.push({
            requirement: req.name,
            hasMatch: false,
            severity: 'critical',
            suggestion: `Consider gaining experience with ${req.name}`,
          });
        }
      }
    });

    return gaps;
  }

  private calculateOverallFit(strongMatches: string[], weakMatches: string[], gaps: ExperienceGap[]): number {
    const matchScore = Math.min(strongMatches.length * 15, 70);
    const weakPenalty = weakMatches.length * 5;
    const gapPenalty = gaps.filter(g => g.severity === 'critical').length * 20;

    return Math.max(0, Math.min(100, matchScore - weakPenalty - gapPenalty));
  }

  private generateTalkingPoints(careerModel: CareerModel, strongMatches: string[]): string[] {
    const points: string[] = [];
    const currentRole = careerModel.sections.experience?.[0];

    if (currentRole?.title.includes('Senior') || currentRole?.title.includes('Staff')) {
      points.push(`Current role as ${currentRole.title} demonstrates seniority level`);
    }

    const totalYears = (careerModel.sections.experience || []).length * 3;
    points.push(`${totalYears}+ years of relevant experience`);

    const metrics = (careerModel.sections.experience || [])
      .flatMap(exp => exp.metrics || [])
      .slice(0, 3);
    if (metrics.length > 0) {
      points.push(`Demonstrated impact: ${metrics.join(', ')}`);
    }

    points.push(...strongMatches.slice(0, 2));

    return points;
  }

  private getPositioningAngle(careerModel: CareerModel, jobDescription: string): string {
    const isSenior = (careerModel.sections.experience?.[0]?.title || '').includes('Senior');
    const hasMetrics = (careerModel.sections.experience || []).some(exp => (exp.metrics || []).length > 0);
    const skills = careerModel.sections.skills || [];

    if (isSenior && hasMetrics) {
      return 'Position as impact-driven senior engineer with track record of delivery';
    }
    if (skills.length > 8) {
      return 'Emphasize technical breadth and versatility';
    }
    return 'Lead with recent relevant projects and achievements';
  }

  private careerToText(careerModel: CareerModel): string {
    const parts = [
      careerModel.fullName,
      careerModel.sections.summary,
      (careerModel.sections.experience || [])
        .map(e => `${e.title} at ${e.company} ${e.description} ${(e.metrics || []).join(' ')}`)
        .join(' '),
      (careerModel.sections.skills || []).join(' '),
    ];
    return parts.filter(Boolean).join(' ');
  }
}
