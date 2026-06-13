import type { MissingKeyword, KeywordAnalysis } from '../../shared/types';

export class KeywordAnalyzerService {
  private criticalIndicators = ['required', 'must have', 'essential'];
  private niceToHaveIndicators = ['nice to have', 'preferred', 'bonus'];

  analyze(jobDescription: string, resumeText: string): KeywordAnalysis {
    const jobKeywords = this.extractKeywords(jobDescription);
    const resumeKeywords = new Set(this.extractKeywords(resumeText).map(k => k.toLowerCase()));

    const missingKeywords: MissingKeyword[] = [];
    let matchedCount = 0;
    const uniqueJobKeywords = new Set(jobKeywords.map(k => k.toLowerCase()));

    uniqueJobKeywords.forEach(keyword => {
      const resumeFrequency = (resumeText.match(new RegExp(keyword, 'gi')) || []).length;
      const jobFrequency = (jobDescription.match(new RegExp(keyword, 'gi')) || []).length;

      // Only include if it's missing or weakly represented
      if (resumeFrequency === 0) {
        // Missing entirely
        const importance = this.determineImportance(keyword, jobDescription);
        missingKeywords.push({
          keyword,
          importance,
          status: 'missing',
          frequency: {
            inJob: jobFrequency,
            inResume: 0,
          },
          suggestedPlacement: this.suggestPlacement(keyword),
          suggestedLanguage: this.generateSuggestedLanguage(keyword),
        });
      } else if (resumeFrequency > 0 && resumeFrequency <= 1) {
        // Weak - mentioned but minimal presence (1 or fewer mentions)
        const importance = this.determineImportance(keyword, jobDescription);
        missingKeywords.push({
          keyword,
          importance,
          status: 'weak',
          frequency: {
            inJob: jobFrequency,
            inResume: resumeFrequency,
          },
          suggestedPlacement: this.suggestPlacement(keyword),
          suggestedLanguage: this.generateSuggestedLanguage(keyword),
        });
      } else {
        // Matched well
        matchedCount++;
      }
    });

    return {
      missingKeywords: missingKeywords.sort((a, b) => {
        const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
        if (importanceDiff !== 0) return importanceDiff;
        // Sort missing before weak
        return a.status === 'missing' ? -1 : 1;
      }),
      totalKeywordsInJob: uniqueJobKeywords.size,
      matchedCount,
      matchPercentage: uniqueJobKeywords.size > 0 ? Math.round((matchedCount / uniqueJobKeywords.size) * 100) : 0,
      summary: `${matchedCount}/${uniqueJobKeywords.size} keywords found. ${missingKeywords.length} missing or weak.`,
    };
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[\s,\-\n]+/)
      .filter(word => word.length > 3 && !this.isCommonWord(word))
      .slice(0, 50); // Limit to top 50
  }

  private isCommonWord(word: string): boolean {
    const common = ['the', 'and', 'for', 'with', 'that', 'from', 'your', 'this', 'team', 'will', 'able', 'role'];
    return common.includes(word);
  }

  private determineImportance(keyword: string, jobDescription: string): MissingKeyword['importance'] {
    const lowerJob = jobDescription.toLowerCase();
    const isCritical = this.criticalIndicators.some(ind => lowerJob.includes(ind)) &&
                       lowerJob.includes(keyword.toLowerCase());

    if (isCritical) return 'critical';
    if (jobDescription.split('\n')[0].includes(keyword)) return 'high';
    if (this.niceToHaveIndicators.some(ind => lowerJob.includes(ind))) return 'low';
    return 'medium';
  }

  private determineStatus(keyword: string, resumeText: string): 'missing' | 'weak' {
    const mentions = (resumeText.match(new RegExp(keyword, 'gi')) || []).length;
    return mentions === 0 ? 'missing' : 'weak';
  }

  private suggestPlacement(keyword: string): string {
    const techKeywords = ['react', 'python', 'java', 'kubernetes', 'docker', 'aws'];
    const softKeywords = ['leadership', 'communication', 'strategy'];

    if (techKeywords.some(t => keyword.toLowerCase().includes(t))) {
      return 'skills';
    }
    if (softKeywords.some(s => keyword.toLowerCase().includes(s))) {
      return 'summary';
    }
    return 'experience';
  }

  private generateSuggestedLanguage(keyword: string): string {
    const suggestions: { [key: string]: string } = {
      'kubernetes': 'Designed and deployed containerized applications using Kubernetes',
      'docker': 'Containerized applications using Docker and Docker Compose',
      'typescript': 'Built scalable applications using TypeScript for type safety',
      'react': 'Developed responsive user interfaces using React and modern hooks',
      'node.js': 'Built backend services and APIs using Node.js',
      'python': 'Developed backend services and data pipelines using Python',
      'aws': 'Architected cloud infrastructure on AWS (EC2, S3, Lambda)',
      'leadership': 'Led cross-functional teams and mentored junior engineers',
      'agile': 'Worked in Agile/Scrum environments with 2-week sprints',
    };

    return suggestions[keyword.toLowerCase()] ||
           `Added experience with ${keyword} to improve resume fit`;
  }
}
