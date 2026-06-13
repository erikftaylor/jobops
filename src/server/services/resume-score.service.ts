import type { CareerModel, ResumeScore, ScoreCategory } from '../../shared/types';

export class ResumeScoreService {
  calculateScore(careerModel: CareerModel, jobDescription: string): ResumeScore {
    const atsScore = this.scoreAtsKeywordMatch(careerModel, jobDescription);
    const roleScore = this.scoreRoleAlignment(careerModel, jobDescription);
    const seniorityScore = this.scoreSeniorityAlignment(careerModel, jobDescription);
    const metricsScore = this.scoreImpactMetrics(careerModel);
    const readabilityScore = this.scoreRecruiterReadability(careerModel);
    const formattingScore = this.scoreFormattingQuality(careerModel);

    const total = Math.round(
      (atsScore.score + roleScore.score + seniorityScore.score +
       metricsScore.score + readabilityScore.score + formattingScore.score) / 6
    );

    return {
      total,
      maxScore: 100,
      confidence: 0.85,
      categories: {
        atsKeywordMatch: atsScore,
        roleAlignment: roleScore,
        seniorityAlignment: seniorityScore,
        impactMetrics: metricsScore,
        recruiterReadability: readabilityScore,
        formattingQuality: formattingScore,
      },
      recommendations: this.generateRecommendations(atsScore, roleScore, seniorityScore, metricsScore),
      updatedAt: new Date().toISOString(),
    };
  }

  private scoreAtsKeywordMatch(careerModel: CareerModel, jobDescription: string): ScoreCategory {
    // Extract meaningful keywords - focus on important tech terms
    const skills = careerModel.sections.skills || [];
    const resumeText = this.resumeToText(careerModel).toLowerCase();

    // Match job description against resume skills directly
    const jobLower = jobDescription.toLowerCase();
    let keywordsMatched = 0;
    let totalKeywords = 0;

    // Count each skill that appears in the job description
    skills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      if (jobLower.includes(skillLower)) {
        keywordsMatched++;
      }
      totalKeywords++;
    });

    // Also check for keywords in job description that match skills
    const jobKeywords = jobLower
      .split(/[\s,\-\n.;:()]+/)
      .filter(w => w.length > 3)
      .filter(w => !['required', 'engineer', 'experience', 'needed', 'looking', 'expert', 'skills', 'with', 'have', 'must', 'nice', 'able', 'will', 'also', 'your', 'this', 'that'].includes(w));

    const uniqueJobKeywords = new Set(jobKeywords);
    let jobKeywordMatches = 0;

    uniqueJobKeywords.forEach(keyword => {
      if (resumeText.includes(keyword) || this.isKeywordVariantPresent(keyword, resumeText, skills)) {
        jobKeywordMatches++;
      }
    });

    // Weight both skill matches and keyword matches
    const skillMatchScore = totalKeywords > 0 ? (keywordsMatched / totalKeywords) * 100 : 0;
    const keywordMatchScore = uniqueJobKeywords.size > 0 ? (jobKeywordMatches / uniqueJobKeywords.size) * 100 : 0;

    // Average them for a blended score
    const score = Math.round((skillMatchScore + keywordMatchScore) / 2);

    return {
      name: 'ATS Keyword Match',
      score: Math.min(score, 100),
      maxScore: 100,
      explanation: `Skill match: ${keywordsMatched}/${totalKeywords}, Keyword match: ${jobKeywordMatches}/${uniqueJobKeywords.size}`,
    };
  }

  private isKeywordVariantPresent(keyword: string, resumeText: string, skills: string[]): boolean {
    const variants: { [key: string]: string[] } = {
      'node': ['node.js', 'nodejs', 'node'],
      'react': ['reactjs', 'react'],
      'typescript': ['typescript', 'ts'],
      'javascript': ['js', 'javascript'],
      'python': ['python'],
      'aws': ['amazon', 'aws'],
      'kubernetes': ['k8s', 'kubernetes'],
      'docker': ['docker'],
    };

    const alternatives = variants[keyword] || [];
    return alternatives.some(alt => resumeText.includes(alt.toLowerCase())) || skills.some(skill => skill.toLowerCase().includes(keyword));
  }

  private scoreRoleAlignment(careerModel: CareerModel, jobDescription: string): ScoreCategory {
    const jobTitleWords = jobDescription.split('\n')[0].toLowerCase().split(/\s+/).slice(0, 5);
    const currentTitle = careerModel.sections.experience?.[0]?.title?.toLowerCase() || '';

    const matches = jobTitleWords.filter(w => currentTitle.includes(w)).length;
    const score = jobTitleWords.length > 0 ? Math.round((matches / jobTitleWords.length) * 100) : 0;

    return {
      name: 'Role Alignment',
      score: Math.min(score, 100),
      maxScore: 100,
      explanation: `Current role "${currentTitle}" aligns ${matches}/${jobTitleWords.length} with target position`,
    };
  }

  private scoreSeniorityAlignment(careerModel: CareerModel, jobDescription: string): ScoreCategory {
    const experience = careerModel.sections.experience || [];
    const yearsOfExperience = experience.length * 3; // Simplified: ~3 years per role

    const seniorityLevel = yearsOfExperience > 10 ? 'Senior' : yearsOfExperience > 5 ? 'Mid' : 'Junior';
    const jobSeniority = jobDescription.toLowerCase().includes('senior') ? 'Senior' :
                        jobDescription.toLowerCase().includes('junior') ? 'Junior' : 'Mid';

    const match = seniorityLevel === jobSeniority ? 100 : seniorityLevel !== 'Junior' && jobSeniority !== 'Junior' ? 70 : 40;

    return {
      name: 'Seniority Alignment',
      score: match,
      maxScore: 100,
      explanation: `${seniorityLevel} level (${yearsOfExperience} years) vs ${jobSeniority} position requirement`,
    };
  }

  private scoreImpactMetrics(careerModel: CareerModel): ScoreCategory {
    const experience = careerModel.sections.experience || [];
    const totalMetrics = experience.reduce((sum, exp) => sum + (exp.metrics?.length || 0), 0);
    const avgMetricsPerRole = experience.length > 0 ? totalMetrics / experience.length : 0;

    const score = Math.round(Math.min(avgMetricsPerRole * 25, 100));

    return {
      name: 'Impact Metrics',
      score,
      maxScore: 100,
      explanation: `${totalMetrics} measurable outcomes across ${experience.length} roles (${avgMetricsPerRole.toFixed(1)} per role)`,
    };
  }

  private scoreRecruiterReadability(careerModel: CareerModel): ScoreCategory {
    const summary = careerModel.sections.summary || '';
    const hasSummary = summary.length > 50;
    const hasSkills = (careerModel.sections.skills || []).length >= 5;
    const hasMetrics = (careerModel.sections.experience || []).some(exp => (exp.metrics || []).length > 0);

    const checks = [hasSummary, hasSkills, hasMetrics].filter(Boolean).length;
    const score = (checks / 3) * 100;

    return {
      name: 'Recruiter Readability',
      score: Math.round(score),
      maxScore: 100,
      explanation: `${checks}/3 readability checks passed (summary, skills, metrics)`,
    };
  }

  private scoreFormattingQuality(careerModel: CareerModel): ScoreCategory {
    // Simplified: assume well-structured data = good formatting
    const hasAllSections = Boolean(
      careerModel.sections.summary &&
      careerModel.sections.experience &&
      careerModel.sections.skills &&
      careerModel.sections.education
    );

    return {
      name: 'Formatting Quality',
      score: hasAllSections ? 85 : 60,
      maxScore: 100,
      explanation: hasAllSections ? 'All major sections present' : 'Missing some sections',
    };
  }

  private generateRecommendations(
    atsScore: ScoreCategory,
    roleScore: ScoreCategory,
    seniorityScore: ScoreCategory,
    metricsScore: ScoreCategory
  ): string[] {
    const recommendations: string[] = [];

    if (atsScore.score < 70) {
      recommendations.push('Add missing job keywords to resume');
    }
    if (roleScore.score < 70) {
      recommendations.push('Strengthen alignment with target role title');
    }
    if (seniorityScore.score < 70) {
      recommendations.push('Consider adjusting positioning for this seniority level');
    }
    if (metricsScore.score < 70) {
      recommendations.push('Add quantified business impact to experience descriptions');
    }

    return recommendations;
  }

  private resumeToText(careerModel: CareerModel): string {
    const parts = [
      careerModel.fullName,
      careerModel.sections.summary,
      (careerModel.sections.experience || []).map(exp => `${exp.title} at ${exp.company} ${exp.description}`).join(' '),
      (careerModel.sections.skills || []).join(' '),
      (careerModel.sections.education || []).map(edu => `${edu.school} ${edu.degree}`).join(' '),
    ];
    return parts.filter(Boolean).join(' ');
  }
}
