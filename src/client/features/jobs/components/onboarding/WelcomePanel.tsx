import React from "react";
import CareerProfileCard from "./CareerProfileCard";
import { HealthCheckResponse } from "@shared/types";
import "./welcome-panel.css";

interface WelcomePanelProps {
  health: HealthCheckResponse | { status: "unhealthy"; error: string };
  onAddFirstJob: () => void;
  experienceCount?: number;
  skillCount?: number;
  educationCount?: number;
}

export default React.memo(function WelcomePanel({
  health,
  onAddFirstJob,
  experienceCount = 0,
  skillCount = 0,
  educationCount = 0,
}: WelcomePanelProps) {
  return (
    <div className="welcome-panel">
      {/* Hero Section */}
      <section className="welcome-hero">
        <h1>Welcome to JobOps</h1>
        <p className="tagline">
          AI-powered job opportunity analysis against your career profile.
        </p>
        <p className="description">
          JobOps analyzes job descriptions against your professional background,
          identifies skill gaps, and helps you optimize your resume for each opportunity.
        </p>
      </section>

      {/* Career Profile Status */}
      <section className="welcome-profile">
        <h2>Your Career Profile</h2>
        <CareerProfileCard
          health={health}
          experienceCount={experienceCount}
          skillCount={skillCount}
          educationCount={educationCount}
        />
      </section>

      {/* Three-Step Flow */}
      <section className="welcome-flow">
        <h2>How It Works</h2>
        <div className="flow-diagram">
          <div className="flow-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Career Profile</h3>
              <p>Your professional background stored in Master_Career_Document.md</p>
            </div>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Add Job</h3>
              <p>Paste a job description from any source</p>
            </div>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Analyze & Optimize</h3>
              <p>Get AI-powered insights and resume recommendations</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="welcome-cta">
        <button
          className="cta-button primary"
          onClick={onAddFirstJob}
          aria-label="Add your first job to get started"
        >
          <span className="button-text">Add Your First Job</span>
          <span className="button-icon">→</span>
        </button>
        <p className="cta-hint">
          Start analyzing opportunities to optimize your career strategy.
        </p>
      </section>

      {/* Features Highlight */}
      <section className="welcome-features">
        <h2>What You Can Do</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h4>Resume Scoring</h4>
            <p>Get scored across 6 categories: ATS match, role alignment, seniority, impact, readability, and format.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h4>Keyword Analysis</h4>
            <p>Discover missing keywords and get suggestions for placement in your resume.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h4>AI Chat</h4>
            <p>Ask questions about fit, weaknesses, interview prep, and improvement priorities.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">✨</div>
            <h4>Resume Variants</h4>
            <p>Generate multiple optimized resume versions and compare scores to find the best match.</p>
          </div>
        </div>
      </section>
    </div>
  );
});
