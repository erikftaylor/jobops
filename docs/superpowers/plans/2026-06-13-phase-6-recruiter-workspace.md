# Phase 6: Recruiter Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Career Operating System into a visible recruiter-grade product by building a Recruiter Workspace that shows resume fit, missing keywords, risks, and actionable improvements.

**Architecture:** Five independent clusters: (1) Score Engine + APIs foundation, (2) Analysis Services (keywords, heatmap, fit), (3) Event Bus for state sync, (4) React Components (workspace layout, cards, panels), (5) Tests + Integration. Each cluster delivers working, testable software.

**Tech Stack:** TypeScript, Express, React 18, Zod, SQLite, existing: Claude API, Artifact Engine, Career Model Resolver, Conversation System.

---

## File Structure

### Backend Services
- `src/server/services/resume-score.service.ts` — Resume score calculation (0-100 with category breakdown)
- `src/server/services/keyword-analyzer.service.ts` — Missing/weak keyword extraction from job description
- `src/server/services/heatmap-analyzer.service.ts` — Recruiter visibility scoring by section
- `src/server/services/fit-analyzer.service.ts` — Overall job fit analysis and risk detection
- `src/server/services/event-bus.service.ts` — Lightweight internal event bus for state sync

### Backend Routes
- `src/server/routes/workspace.ts` — Workspace endpoints (score, keywords, heatmap, fit)

### Database
- Add to `src/server/db/migrations/` — `004-workspace-tables.sql` (workspace_scores, workspace_keywords, workspace_analysis)

### Frontend Components
- `src/client/features/workspace/` — Workspace feature directory
  - `components/WorkspaceLayout.tsx` — Two-column root layout
  - `components/ResumeScore.tsx` — Score card with breakdown
  - `components/MissingKeywords.tsx` — Keywords panel with actions
  - `components/RecruiterHeatmap.tsx` — Visibility heatmap
  - `components/JobFitDashboard.tsx` — Overall fit analysis
  - `components/ArtifactComparison.tsx` — Side-by-side artifact versions
  - `components/RecruiterChat.tsx` — Guided recruiter questions
  - `pages/WorkspacePage.tsx` — Feature page

### Frontend Hooks & Stores
- `src/client/features/workspace/hooks/useWorkspaceScore.ts` — Fetch and refresh score
- `src/client/features/workspace/hooks/useKeywordAnalysis.ts` — Fetch and act on keywords
- `src/client/features/workspace/hooks/useWorkspaceAnalysis.ts` — Fetch fit/heatmap/analysis
- `src/client/features/workspace/store/workspace.store.ts` — Zustand store for workspace state

### Tests
- `tests/unit/server/services/resume-score.service.test.ts`
- `tests/unit/server/services/keyword-analyzer.service.test.ts`
- `tests/unit/server/services/heatmap-analyzer.service.test.ts`
- `tests/unit/server/services/fit-analyzer.service.test.ts`
- `tests/unit/server/services/event-bus.service.test.ts`
- `tests/unit/client/features/workspace/components/ResumeScore.test.tsx`
- `tests/unit/client/features/workspace/components/MissingKeywords.test.tsx`
- `tests/unit/client/features/workspace/hooks/useWorkspaceScore.test.ts`

---

## Cluster 1: Score Engine + APIs (Foundation)

### Task 1: Resume Score Service

**Files:**
- Create: `src/server/services/resume-score.service.ts`
- Modify: `src/shared/types.ts` (add ResumeScore, ScoreCategory types)
- Test: `tests/unit/server/services/resume-score.service.test.ts`

- [ ] **Step 1: Write failing test for ResumeScoreService**

```typescript
// tests/unit/server/services/resume-score.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ResumeScoreService } from '../../../src/server/services/resume-score.service';
import type { CareerModel } from '../../../src/shared/types';

describe('ResumeScoreService', () => {
  let service: ResumeScoreService;

  beforeEach(() => {
    service = new ResumeScoreService();
  });

  it('should calculate resume score with all categories', () => {
    const careerModel: CareerModel = {
      fullName: 'John Doe',
      sections: {
        summary: 'Experienced engineer with 10 years in full-stack development',
        experience: [
          {
            company: 'TechCorp',
            title: 'Senior Engineer',
            startDate: '2020',
            endDate: 'present',
            description: 'Led team of 5, built microservices in Node.js and Python',
            metrics: ['5x faster API', '99.9% uptime'],
          }
        ],
        skills: ['Node.js', 'React', 'Python', 'AWS'],
        education: [{ school: 'Stanford', degree: 'BS Computer Science', year: '2012' }],
      },
      metadata: { hash: 'abc123', source: 'master' },
    };

    const jobDescription = 'Looking for a Node.js engineer with React experience and AWS skills';

    const score = service.calculateScore(careerModel, jobDescription);
    
    expect(score).toBeDefined();
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.categories).toHaveProperty('atsKeywordMatch');
    expect(score.categories).toHaveProperty('roleAlignment');
    expect(score.categories).toHaveProperty('seniorityAlignment');
    expect(score.categories).toHaveProperty('impactMetrics');
    expect(score.categories).toHaveProperty('recruiterReadability');
    expect(score.categories).toHaveProperty('formattingQuality');
  });

  it('should detect strong keyword matches', () => {
    const careerModel: CareerModel = {
      fullName: 'Jane Smith',
      sections: {
        summary: 'Full-stack developer specializing in React and Node.js',
        experience: [
          {
            company: 'StartupXYZ',
            title: 'Lead Developer',
            startDate: '2019',
            endDate: 'present',
            description: 'Architected React app, built REST APIs in Node.js, deployed to AWS',
            metrics: ['10 million users', 'Zero-downtime deployment'],
          }
        ],
        skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'Docker'],
        education: [],
      },
      metadata: { hash: 'def456', source: 'master' },
    };

    const jobDescription = 'Senior Full Stack Engineer: React, Node.js, TypeScript, AWS required';
    const score = service.calculateScore(careerModel, jobDescription);

    expect(score.categories.atsKeywordMatch).toBeGreaterThan(80);
  });

  it('should penalize missing metrics', () => {
    const careerModel: CareerModel = {
      fullName: 'Bob Jones',
      sections: {
        summary: 'Software engineer',
        experience: [
          {
            company: 'SomeCorp',
            title: 'Engineer',
            startDate: '2015',
            endDate: 'present',
            description: 'Worked on projects',
            metrics: [],
          }
        ],
        skills: ['Java'],
        education: [],
      },
      metadata: { hash: 'ghi789', source: 'master' },
    };

    const jobDescription = 'Senior Engineer needed';
    const score = service.calculateScore(careerModel, jobDescription);

    expect(score.categories.impactMetrics).toBeLessThan(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/unit/server/services/resume-score.service.test.ts
```

Expected: FAIL — "ResumeScoreService is not defined"

- [ ] **Step 3: Add type definitions to shared/types.ts**

```typescript
// In src/shared/types.ts, add:

export interface ScoreCategory {
  name: string;
  score: number;
  maxScore: number;
  explanation: string;
}

export interface ResumeScore {
  total: number;
  maxScore: 100;
  confidence: number; // 0-1
  categories: {
    atsKeywordMatch: ScoreCategory;
    roleAlignment: ScoreCategory;
    seniorityAlignment: ScoreCategory;
    impactMetrics: ScoreCategory;
    recruiterReadability: ScoreCategory;
    formattingQuality: ScoreCategory;
  };
  recommendations: string[];
  updatedAt: string;
}
```

- [ ] **Step 4: Implement ResumeScoreService**

```typescript
// src/server/services/resume-score.service.ts
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
    const jobKeywords = new Set(
      jobDescription
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4)
    );

    const resumeText = this.resumeToText(careerModel).toLowerCase();
    const matches = Array.from(jobKeywords).filter(kw => resumeText.includes(kw)).length;
    const score = Math.round((matches / jobKeywords.size) * 100);

    return {
      name: 'ATS Keyword Match',
      score: Math.min(score, 100),
      maxScore: 100,
      explanation: `${matches} of ${jobKeywords.size} job keywords found in resume`,
    };
  }

  private scoreRoleAlignment(careerModel: CareerModel, jobDescription: string): ScoreCategory {
    const jobTitleWords = jobDescription.split('\n')[0].toLowerCase().split(/\s+/).slice(0, 5);
    const currentTitle = careerModel.sections.experience?.[0]?.title?.toLowerCase() || '';
    
    const matches = jobTitleWords.filter(w => currentTitle.includes(w)).length;
    const score = Math.round((matches / jobTitleWords.length) * 100);

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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test tests/unit/server/services/resume-score.service.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/server/services/resume-score.service.ts src/shared/types.ts tests/unit/server/services/resume-score.service.test.ts
git commit -m "feat: add resume score calculation service with 6 scoring categories

Implements 0-100 resume score with breakdown:
- ATS keyword match
- Role alignment
- Seniority alignment
- Impact metrics presence
- Recruiter readability
- Formatting quality

Includes category explanations and recommendations.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Workspace API Routes

**Files:**
- Create: `src/server/routes/workspace.ts`
- Modify: `src/server/index.ts` (mount routes)

- [ ] **Step 1: Create workspace routes**

```typescript
// src/server/routes/workspace.ts
import { Router, Request, Response } from 'express';
import { ResumeScoreService } from '../services/resume-score.service';
import { CareerModelService } from '../services/career-model.service';
import { JobService } from '../services/job.service';
import type { ResumeScore } from '../../shared/types';

const router = Router();
const scoreService = new ResumeScoreService();

// GET /api/workspace/:jobId - Get workspace overview
router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await JobService.getById(jobId);
    
    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    // Fetch resolved career model
    const careerModel = await CareerModelService.resolve();
    
    // Calculate score
    const score = scoreService.calculateScore(careerModel, job.description);

    return res.json({
      jobId,
      jobTitle: job.title,
      score,
      workspaceUrl: `/workspace/${jobId}`,
    });
  } catch (error) {
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to load workspace',
    });
  }
});

// GET /api/workspace/:jobId/score - Get resume score details
router.get('/:jobId/score', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await JobService.getById(jobId);
    
    if (!job) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: `Job with id '${jobId}' not found`,
      });
    }

    const careerModel = await CareerModelService.resolve();
    const score = scoreService.calculateScore(careerModel, job.description);

    return res.json(score);
  } catch (error) {
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to calculate score',
    });
  }
});

export default router;
```

- [ ] **Step 2: Mount routes in server index**

```typescript
// In src/server/index.ts, add:
import workspaceRouter from './routes/workspace';

// After other routes:
app.use('/api/workspace', workspaceRouter);
```

- [ ] **Step 3: Test routes manually**

```bash
npm run dev
# In another terminal:
curl http://localhost:3001/api/workspace/job-abc123/score
```

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/workspace.ts src/server/index.ts
git commit -m "feat: add workspace API routes for score retrieval

Added endpoints:
- GET /api/workspace/:jobId - Workspace overview
- GET /api/workspace/:jobId/score - Resume score details

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Cluster 2: Analysis Services (Keywords, Heatmap, Fit)

### Task 3: Keyword Analyzer Service

**Files:**
- Create: `src/server/services/keyword-analyzer.service.ts`
- Modify: `src/shared/types.ts` (add MissingKeyword type)
- Test: `tests/unit/server/services/keyword-analyzer.service.test.ts`

- [ ] **Step 1: Add type to shared/types.ts**

```typescript
// In src/shared/types.ts, add:

export interface MissingKeyword {
  keyword: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  status: 'missing' | 'weak';
  frequency: {
    inJob: number;
    inResume: number;
  };
  suggestedPlacement: string; // e.g., "skills", "summary", "experience"
  suggestedLanguage: string;
}

export interface KeywordAnalysis {
  missingKeywords: MissingKeyword[];
  totalKeywordsInJob: number;
  matchedCount: number;
  matchPercentage: number;
  summary: string;
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/unit/server/services/keyword-analyzer.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { KeywordAnalyzerService } from '../../../src/server/services/keyword-analyzer.service';

describe('KeywordAnalyzerService', () => {
  let service: KeywordAnalyzerService;

  beforeEach(() => {
    service = new KeywordAnalyzerService();
  });

  it('should identify missing critical keywords', () => {
    const jobDescription = 'We need a Kubernetes expert with Docker and Go experience';
    const resumeText = 'Senior engineer with Docker experience';

    const analysis = service.analyze(jobDescription, resumeText);

    expect(analysis.missingKeywords.length).toBeGreaterThan(0);
    expect(analysis.missingKeywords.some(kw => kw.keyword === 'kubernetes')).toBe(true);
  });

  it('should differentiate between missing and weak keywords', () => {
    const jobDescription = 'React, TypeScript, Node.js, Docker, Kubernetes required';
    const resumeText = 'React developer with some Node.js experience';

    const analysis = service.analyze(jobDescription, resumeText);

    const missing = analysis.missingKeywords.find(kw => kw.status === 'missing');
    const weak = analysis.missingKeywords.find(kw => kw.status === 'weak');

    expect(missing).toBeDefined();
    expect(weak).toBeDefined();
  });

  it('should assign importance levels correctly', () => {
    const jobDescription = 'Required: Kubernetes, Docker, Go. Nice to have: Rust, Elixir';
    const resumeText = 'Have Docker experience';

    const analysis = service.analyze(jobDescription, resumeText);

    const kubernetes = analysis.missingKeywords.find(kw => kw.keyword === 'kubernetes');
    expect(kubernetes?.importance).toBe('critical');
  });

  it('should suggest placement for keywords', () => {
    const jobDescription = 'Python, Django, PostgreSQL required';
    const resumeText = 'Full-stack engineer';

    const analysis = service.analyze(jobDescription, resumeText);

    const python = analysis.missingKeywords.find(kw => kw.keyword === 'python');
    expect(['skills', 'experience', 'summary']).toContain(python?.suggestedPlacement);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test tests/unit/server/services/keyword-analyzer.service.test.ts
```

- [ ] **Step 4: Implement KeywordAnalyzerService**

```typescript
// src/server/services/keyword-analyzer.service.ts
import type { MissingKeyword, KeywordAnalysis } from '../../shared/types';

export class KeywordAnalyzerService {
  private criticalIndicators = ['required', 'must have', 'essential'];
  private niceToHaveIndicators = ['nice to have', 'preferred', 'bonus'];

  analyze(jobDescription: string, resumeText: string): KeywordAnalysis {
    const jobKeywords = this.extractKeywords(jobDescription);
    const resumeKeywords = new Set(this.extractKeywords(resumeText).map(k => k.toLowerCase()));

    const missingKeywords: MissingKeyword[] = [];
    let matchedCount = 0;

    jobKeywords.forEach(keyword => {
      if (resumeKeywords.has(keyword.toLowerCase())) {
        matchedCount++;
      } else {
        const importance = this.determineImportance(keyword, jobDescription);
        const status = this.determineStatus(keyword, resumeText);
        
        missingKeywords.push({
          keyword,
          importance,
          status,
          frequency: {
            inJob: (jobDescription.match(new RegExp(keyword, 'gi')) || []).length,
            inResume: (resumeText.match(new RegExp(keyword, 'gi')) || []).length,
          },
          suggestedPlacement: this.suggestPlacement(keyword),
          suggestedLanguage: this.generateSuggestedLanguage(keyword),
        });
      }
    });

    return {
      missingKeywords: missingKeywords.sort((a, b) => {
        const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return importanceOrder[a.importance] - importanceOrder[b.importance];
      }),
      totalKeywordsInJob: jobKeywords.length,
      matchedCount,
      matchPercentage: Math.round((matchedCount / jobKeywords.length) * 100),
      summary: `${matchedCount}/${jobKeywords.length} keywords found. ${missingKeywords.length} missing.`,
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test tests/unit/server/services/keyword-analyzer.service.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/server/services/keyword-analyzer.service.ts src/shared/types.ts tests/unit/server/services/keyword-analyzer.service.test.ts
git commit -m "feat: add keyword analyzer service for job matching

Extracts missing and weak keywords from job descriptions.
Assigns importance levels (critical/high/medium/low).
Suggests placement (skills/summary/experience).
Provides natural language suggestions for each keyword.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Heatmap Analyzer Service

**Files:**
- Create: `src/server/services/heatmap-analyzer.service.ts`
- Modify: `src/shared/types.ts` (add HeatmapSection type)
- Test: `tests/unit/server/services/heatmap-analyzer.service.test.ts`

- [ ] **Step 1: Add type to shared/types.ts**

```typescript
// In src/shared/types.ts, add:

export interface HeatmapSection {
  sectionName: string;
  visibilityScore: number; // 0-100
  recruiterConfidence: string; // 'high' | 'medium' | 'low'
  riskLevel: string; // 'low' | 'medium' | 'high'
  keyObservations: string[];
  recommendedImprovement: string;
  isVisible: boolean;
}

export interface RecruiterHeatmap {
  overallVisibility: number;
  sections: HeatmapSection[];
  sixSecondSkim: string[];
  skippedSections: string[];
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/unit/server/services/heatmap-analyzer.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { HeatmapAnalyzerService } from '../../../src/server/services/heatmap-analyzer.service';
import type { CareerModel } from '../../../src/shared/types';

describe('HeatmapAnalyzerService', () => {
  let service: HeatmapAnalyzerService;

  beforeEach(() => {
    service = new HeatmapAnalyzerService();
  });

  it('should generate heatmap for well-formed career model', () => {
    const careerModel: CareerModel = {
      fullName: 'John Doe',
      sections: {
        summary: 'Experienced engineer with 10 years in full-stack',
        experience: [
          {
            company: 'TechCorp',
            title: 'Senior Engineer',
            startDate: '2020',
            endDate: 'present',
            description: 'Led team of 5',
            metrics: ['50% faster', '99.9% uptime'],
          }
        ],
        skills: ['Node.js', 'React', 'Python', 'AWS'],
        education: [{ school: 'Stanford', degree: 'BS', year: '2012' }],
      },
      metadata: { hash: 'abc123', source: 'master' },
    };

    const heatmap = service.analyze(careerModel);

    expect(heatmap.sections).toBeDefined();
    expect(heatmap.sections.length).toBeGreaterThan(0);
    expect(heatmap.sixSecondSkim).toBeDefined();
    expect(heatmap.overallVisibility).toBeGreaterThanOrEqual(0);
  });

  it('should identify visible sections in six-second skim', () => {
    const careerModel: CareerModel = {
      fullName: 'Jane Smith',
      sections: {
        summary: 'Award-winning product engineer',
        experience: [
          {
            company: 'FamousStartup',
            title: 'Lead Engineer',
            startDate: '2021',
            endDate: 'present',
            description: 'Built product from zero to $10M ARR',
            metrics: ['10 million users'],
          }
        ],
        skills: ['React', 'Python', 'AWS'],
        education: [],
      },
      metadata: { hash: 'def456', source: 'master' },
    };

    const heatmap = service.analyze(careerModel);
    const summarySection = heatmap.sections.find(s => s.sectionName === 'Summary');

    expect(summarySection?.isVisible).toBe(true);
    expect(heatmap.sixSecondSkim).toContain(expect.stringContaining('Summary'));
  });

  it('should flag missing skills section as risk', () => {
    const careerModel: CareerModel = {
      fullName: 'Bob Jones',
      sections: {
        summary: 'Engineer',
        experience: [],
        skills: [],
        education: [],
      },
      metadata: { hash: 'ghi789', source: 'master' },
    };

    const heatmap = service.analyze(careerModel);
    const skillsSection = heatmap.sections.find(s => s.sectionName === 'Skills');

    expect(skillsSection?.riskLevel).toBe('high');
    expect(heatmap.skippedSections).toContain('Skills');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test tests/unit/server/services/heatmap-analyzer.service.test.ts
```

- [ ] **Step 4: Implement HeatmapAnalyzerService**

```typescript
// src/server/services/heatmap-analyzer.service.ts
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
      (visibleSections.reduce((sum, s) => sum + s.visibilityScore, 0) / sections.length)
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
    const isVisible = summary.length > 50;
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
    const hasMet rics = currentRole?.metrics && currentRole.metrics.length > 0;

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
```

- [ ] **Step 5: Run tests**

```bash
npm test tests/unit/server/services/heatmap-analyzer.service.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/server/services/heatmap-analyzer.service.ts src/shared/types.ts tests/unit/server/services/heatmap-analyzer.service.test.ts
git commit -m "feat: add recruiter heatmap analyzer

Analyzes visibility and recruiter confidence for 7 sections:
Summary, Skills, Current Role, Recent Experience, Metrics, Tools, Education

Generates six-second skim showing what catches attention first.
Identifies risk areas and suggests improvements for each section.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Job Fit Analyzer Service

**Files:**
- Create: `src/server/services/fit-analyzer.service.ts`
- Modify: `src/shared/types.ts` (add JobFit type)
- Test: `tests/unit/server/services/fit-analyzer.service.test.ts`

- [ ] **Step 1: Add types**

```typescript
// In src/shared/types.ts, add:

export interface ExperienceGap {
  requirement: string;
  hasMatch: boolean;
  severity: 'critical' | 'moderate' | 'minor';
  suggestion: string;
}

export interface JobFitAnalysis {
  overallFit: number; // 0-100
  confidenceLevel: string; // 'high' | 'medium' | 'low'
  strongMatches: string[];
  weakMatches: string[];
  rejectionRisks: string[];
  interviewTalkingPoints: string[];
  experienceGaps: ExperienceGap[];
  recommendedPositioningAngle: string;
  likelihood: {
    phoneScreen: number;
    technicalInterview: number;
    offer: number;
  };
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/unit/server/services/fit-analyzer.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FitAnalyzerService } from '../../../src/server/services/fit-analyzer.service';
import type { CareerModel } from '../../../src/shared/types';

describe('FitAnalyzerService', () => {
  let service: FitAnalyzerService;

  beforeEach(() => {
    service = new FitAnalyzerService();
  });

  it('should calculate overall job fit', () => {
    const careerModel: CareerModel = {
      fullName: 'Alice Engineer',
      sections: {
        summary: 'Full-stack engineer with 8 years experience',
        experience: [
          {
            company: 'TechCorp',
            title: 'Senior Full-Stack Engineer',
            startDate: '2020',
            endDate: 'present',
            description: 'Built React and Node.js applications',
            metrics: ['10M users', '50% performance improvement'],
          }
        ],
        skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL'],
        education: [{ school: 'MIT', degree: 'BS Computer Science', year: '2016' }],
      },
      metadata: { hash: 'abc', source: 'master' },
    };

    const jobDescription = `
      Senior Full-Stack Engineer
      Requirements:
      - 5+ years full-stack experience
      - React and Node.js expertise
      - TypeScript knowledge
      - AWS experience
      - Team leadership experience
    `;

    const analysis = service.analyze(careerModel, jobDescription);

    expect(analysis.overallFit).toBeGreaterThanOrEqual(0);
    expect(analysis.overallFit).toBeLessThanOrEqual(100);
    expect(analysis.strongMatches.length).toBeGreaterThan(0);
  });

  it('should identify rejection risks', () => {
    const careerModel: CareerModel = {
      fullName: 'Junior Dev',
      sections: {
        summary: 'Junior developer with 1 year experience',
        experience: [
          {
            company: 'StartupXYZ',
            title: 'Junior Developer',
            startDate: '2025',
            endDate: 'present',
            description: 'Frontend work',
            metrics: [],
          }
        ],
        skills: ['HTML', 'CSS', 'JavaScript'],
        education: [],
      },
      metadata: { hash: 'def', source: 'master' },
    };

    const jobDescription = 'Senior Engineer needed: 10+ years required. React, Node, Kubernetes, AWS.';
    const analysis = service.analyze(careerModel, jobDescription);

    expect(analysis.rejectionRisks.length).toBeGreaterThan(0);
    expect(analysis.confidenceLevel).toBe('low');
  });

  it('should provide interview talking points', () => {
    const careerModel: CareerModel = {
      fullName: 'Bob Engineer',
      sections: {
        summary: 'Experienced engineer',
        experience: [
          {
            company: 'BigTech',
            title: 'Staff Engineer',
            startDate: '2018',
            endDate: 'present',
            description: 'Led team of 10, built microservices',
            metrics: ['99.99% uptime', '5x throughput improvement'],
          }
        ],
        skills: ['Go', 'Kubernetes', 'AWS'],
        education: [],
      },
      metadata: { hash: 'ghi', source: 'master' },
    };

    const jobDescription = 'Staff Engineer: Go, Kubernetes, AWS, microservices, team leadership';
    const analysis = service.analyze(careerModel, jobDescription);

    expect(analysis.interviewTalkingPoints.length).toBeGreaterThan(0);
    expect(analysis.interviewTalkingPoints[0]).toContain('Staff');
  });
});
```

- [ ] **Step 3: Implement FitAnalyzerService**

```typescript
// src/server/services/fit-analyzer.service.ts
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
```

- [ ] **Step 4: Run tests**

```bash
npm test tests/unit/server/services/fit-analyzer.service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/server/services/fit-analyzer.service.ts src/shared/types.ts tests/unit/server/services/fit-analyzer.service.test.ts
git commit -m "feat: add job fit analyzer service

Analyzes career model against job description:
- Overall fit percentage (0-100) with confidence
- Strong and weak matches
- Rejection risks
- Interview talking points
- Experience gaps
- Recommended positioning angle
- Likelihood scores (phone screen, technical, offer)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Cluster 3: Event Bus & State Management

### Task 6: Lightweight Event Bus

**Files:**
- Create: `src/server/services/event-bus.service.ts`
- Test: `tests/unit/server/services/event-bus.service.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/server/services/event-bus.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EventBusService } from '../../../src/server/services/event-bus.service';

describe('EventBusService', () => {
  let eventBus: EventBusService;

  beforeEach(() => {
    eventBus = new EventBusService();
  });

  it('should subscribe and emit events', () => {
    const events: any[] = [];
    eventBus.subscribe('change:accepted', (data) => {
      events.push(data);
    });

    eventBus.emit('change:accepted', { changeId: 'change-123', accepted: true });

    expect(events).toHaveLength(1);
    expect(events[0].changeId).toBe('change-123');
  });

  it('should support multiple subscribers', () => {
    const events1: any[] = [];
    const events2: any[] = [];

    eventBus.subscribe('score:updated', (data) => events1.push(data));
    eventBus.subscribe('score:updated', (data) => events2.push(data));

    eventBus.emit('score:updated', { score: 85 });

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
  });

  it('should allow unsubscribing', () => {
    const events: any[] = [];
    const unsubscribe = eventBus.subscribe('test:event', (data) => events.push(data));

    eventBus.emit('test:event', { value: 1 });
    unsubscribe();
    eventBus.emit('test:event', { value: 2 });

    expect(events).toHaveLength(1);
  });

  it('should handle async listeners', async () => {
    const results: any[] = [];
    eventBus.subscribe('async:event', async (data) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      results.push(data);
    });

    eventBus.emit('async:event', { async: true });
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(results).toHaveLength(1);
  });

  it('should clear all subscribers for an event', () => {
    const events: any[] = [];
    eventBus.subscribe('clear:test', (data) => events.push(data));
    eventBus.subscribe('clear:test', (data) => events.push(data));

    eventBus.emit('clear:test', {});
    expect(events).toHaveLength(2);

    eventBus.clear('clear:test');
    eventBus.emit('clear:test', {});
    expect(events).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test tests/unit/server/services/event-bus.service.test.ts
```

- [ ] **Step 3: Implement EventBusService**

```typescript
// src/server/services/event-bus.service.ts
type EventListener<T = any> = (data: T) => void | Promise<void>;
type Unsubscribe = () => void;

export class EventBusService {
  private listeners: Map<string, Set<EventListener>> = new Map();

  subscribe<T = any>(eventName: string, listener: EventListener<T>): Unsubscribe {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    this.listeners.get(eventName)!.add(listener);

    return () => {
      this.listeners.get(eventName)?.delete(listener);
    };
  }

  emit<T = any>(eventName: string, data: T): void {
    const listeners = this.listeners.get(eventName);
    if (!listeners) return;

    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    });
  }

  clear(eventName: string): void {
    this.listeners.delete(eventName);
  }

  clearAll(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const eventBus = new EventBusService();

// Event type definitions
export const WorkspaceEvents = {
  SCORE_CALCULATED: 'workspace:score:calculated',
  SCORE_UPDATED: 'workspace:score:updated',
  KEYWORDS_ANALYZED: 'workspace:keywords:analyzed',
  KEYWORDS_UPDATED: 'workspace:keywords:updated',
  CHANGE_ACCEPTED: 'workspace:change:accepted',
  CHANGE_REJECTED: 'workspace:change:rejected',
  ARTIFACT_GENERATED: 'workspace:artifact:generated',
} as const;
```

- [ ] **Step 4: Run tests**

```bash
npm test tests/unit/server/services/event-bus.service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/server/services/event-bus.service.ts tests/unit/server/services/event-bus.service.test.ts
git commit -m "feat: add lightweight event bus for state synchronization

Simple pub/sub event bus for workspace state updates.
Supports subscribe/unsubscribe, emit, and event clearing.
Defines WorkspaceEvents constants for standard events.

Events:
- score:calculated, score:updated
- keywords:analyzed, keywords:updated
- change:accepted, change:rejected
- artifact:generated

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Cluster 4: Frontend Components & Hooks (Part A — Hooks & Store)

### Task 7: Workspace Hooks and Store

**Files:**
- Create: `src/client/features/workspace/hooks/useWorkspaceScore.ts`
- Create: `src/client/features/workspace/hooks/useKeywordAnalysis.ts`
- Create: `src/client/features/workspace/store/workspace.store.ts`

- [ ] **Step 1: Create workspace store**

```typescript
// src/client/features/workspace/store/workspace.store.ts
import { create } from 'zustand';
import type { ResumeScore, KeywordAnalysis, RecruiterHeatmap, JobFitAnalysis } from '../../../shared/types';

interface WorkspaceState {
  jobId: string | null;
  score: ResumeScore | null;
  keywords: KeywordAnalysis | null;
  heatmap: RecruiterHeatmap | null;
  fit: JobFitAnalysis | null;
  isLoading: boolean;
  error: string | null;

  setJobId: (jobId: string) => void;
  setScore: (score: ResumeScore) => void;
  setKeywords: (keywords: KeywordAnalysis) => void;
  setHeatmap: (heatmap: RecruiterHeatmap) => void;
  setFit: (fit: JobFitAnalysis) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  jobId: null,
  score: null,
  keywords: null,
  heatmap: null,
  fit: null,
  isLoading: false,
  error: null,

  setJobId: (jobId: string) => set({ jobId }),
  setScore: (score: ResumeScore) => set({ score }),
  setKeywords: (keywords: KeywordAnalysis) => set({ keywords }),
  setHeatmap: (heatmap: RecruiterHeatmap) => set({ heatmap }),
  setFit: (fit: JobFitAnalysis) => set({ fit }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  clear: () => set({
    jobId: null,
    score: null,
    keywords: null,
    heatmap: null,
    fit: null,
    isLoading: false,
    error: null,
  }),
}));
```

- [ ] **Step 2: Create useWorkspaceScore hook**

```typescript
// src/client/features/workspace/hooks/useWorkspaceScore.ts
import { useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspace.store';
import type { ResumeScore } from '../../../shared/types';

export function useWorkspaceScore(jobId: string | null) {
  const { score, isLoading, error, setScore, setLoading, setError } = useWorkspaceStore();

  useEffect(() => {
    if (!jobId) return;

    const fetchScore = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/workspace/${jobId}/score`);
        if (!response.ok) throw new Error('Failed to fetch score');
        const data: ResumeScore = await response.json();
        setScore(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
  }, [jobId, setScore, setLoading, setError]);

  const refresh = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/workspace/${jobId}/score`);
      if (!response.ok) throw new Error('Failed to refresh score');
      const data: ResumeScore = await response.json();
      setScore(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { score, isLoading, error, refresh };
}
```

- [ ] **Step 3: Create useKeywordAnalysis hook**

```typescript
// src/client/features/workspace/hooks/useKeywordAnalysis.ts
import { useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspace.store';
import type { KeywordAnalysis } from '../../../shared/types';

export function useKeywordAnalysis(jobId: string | null) {
  const { keywords, isLoading, error, setKeywords, setLoading, setError } = useWorkspaceStore();

  useEffect(() => {
    if (!jobId) return;

    const fetchKeywords = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/workspace/${jobId}/keywords`);
        if (!response.ok) throw new Error('Failed to fetch keywords');
        const data: KeywordAnalysis = await response.json();
        setKeywords(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchKeywords();
  }, [jobId, setKeywords, setLoading, setError]);

  const ignoreKeyword = (keyword: string) => {
    if (!keywords) return;
    // Implementation: call API to ignore keyword
  };

  const acceptSuggestion = (keyword: string) => {
    if (!keywords) return;
    // Implementation: call API to accept suggestion
  };

  return { keywords, isLoading, error, ignoreKeyword, acceptSuggestion };
}
```

- [ ] **Step 4: Verify hooks work with a simple test**

```bash
npm run type-check
```

- [ ] **Step 5: Commit**

```bash
git add src/client/features/workspace/store/workspace.store.ts src/client/features/workspace/hooks/useWorkspaceScore.ts src/client/features/workspace/hooks/useKeywordAnalysis.ts
git commit -m "feat: add workspace store and custom hooks

Created Zustand store for workspace state management:
- score, keywords, heatmap, fit analysis
- Loading and error states

Created custom hooks:
- useWorkspaceScore: fetch and refresh resume score
- useKeywordAnalysis: fetch and manage keyword suggestions

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

**Continue to [Schedule: Next Cluster](continuation-ready)**

Plan saved. Two execution approaches available:

**Cluster 1-3 Complete:** Score engine, analysis services, event bus. Ready for review.

**Next:** Cluster 4-5 (Frontend Components, Tests, Integration) 

Would you like to proceed with **subagent-driven execution** (fresh agent per task, review between) or **inline execution** (batch tasks in this session)?