import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import WelcomePanel from "./WelcomePanel";
import { HealthCheckResponse } from "@shared/types";
import { describe, it, expect, vi } from "vitest";

const mockHealth: HealthCheckResponse = {
  status: "healthy",
  timestamp: new Date().toISOString(),
  database: {
    connected: true,
    path: "./data/jobops.db",
    size_bytes: 1024,
  },
  master_career_document: {
    found: true,
    loaded: true,
    hash: "abc123def456",
    loaded_at: new Date().toISOString(),
  },
  claude_api: {
    key_configured: true,
  },
};

describe("WelcomePanel", () => {
  it("renders hero section with welcome message", () => {
    const mockCallback = vi.fn();
    render(
      <WelcomePanel
        health={mockHealth}
        onAddFirstJob={mockCallback}
      />
    );

    expect(screen.getByText("Welcome to JobOps")).toBeInTheDocument();
    expect(
      screen.getByText(/AI-powered job opportunity analysis/)
    ).toBeInTheDocument();
  });

  it("renders career profile card", () => {
    const mockCallback = vi.fn();
    render(
      <WelcomePanel
        health={mockHealth}
        onAddFirstJob={mockCallback}
      />
    );

    // Check for the Career Profile section heading
    const headings = screen.getAllByText("Career Profile");
    expect(headings.length).toBeGreaterThan(0);
  });

  it("renders three-step flow diagram", () => {
    const mockCallback = vi.fn();
    render(
      <WelcomePanel
        health={mockHealth}
        onAddFirstJob={mockCallback}
      />
    );

    expect(screen.getByText("How It Works")).toBeInTheDocument();
    // Three-step items should be present
    expect(screen.getByText("Add Job")).toBeInTheDocument();
    expect(screen.getByText("Analyze & Optimize")).toBeInTheDocument();
  });

  it("renders CTA button with correct label", () => {
    const mockCallback = vi.fn();
    render(
      <WelcomePanel
        health={mockHealth}
        onAddFirstJob={mockCallback}
      />
    );

    const button = screen.getByText("Add Your First Job");
    expect(button).toBeInTheDocument();
  });

  it("calls onAddFirstJob when CTA button is clicked", () => {
    const mockCallback = vi.fn();

    render(
      <WelcomePanel
        health={mockHealth}
        onAddFirstJob={mockCallback}
      />
    );

    const button = screen.getByText("Add Your First Job");
    fireEvent.click(button);

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("renders feature highlights", () => {
    const mockCallback = vi.fn();
    render(
      <WelcomePanel
        health={mockHealth}
        onAddFirstJob={mockCallback}
      />
    );

    expect(screen.getByText("What You Can Do")).toBeInTheDocument();
    expect(screen.getByText("Resume Scoring")).toBeInTheDocument();
    expect(screen.getByText("Keyword Analysis")).toBeInTheDocument();
    expect(screen.getByText("AI Chat")).toBeInTheDocument();
    expect(screen.getByText("Resume Variants")).toBeInTheDocument();
  });

  it("handles unhealthy health status gracefully", () => {
    const mockCallback = vi.fn();
    const unhealthyStatus = {
      status: "unhealthy" as const,
      error: "Server unavailable",
    };

    render(
      <WelcomePanel
        health={unhealthyStatus}
        onAddFirstJob={mockCallback}
      />
    );

    // Should still render the component but with the CareerProfileCard showing error
    expect(screen.getByText("Welcome to JobOps")).toBeInTheDocument();
  });

  it("passes stat counts to CareerProfileCard", () => {
    const mockCallback = vi.fn();
    render(
      <WelcomePanel
        health={mockHealth}
        onAddFirstJob={mockCallback}
        experienceCount={5}
        skillCount={20}
        educationCount={3}
      />
    );

    // The stats should be rendered in the CareerProfileCard
    expect(screen.getAllByText("5")).toBeTruthy(); // experience count
    expect(screen.getAllByText("20")).toBeTruthy(); // skill count
    expect(screen.getAllByText("3")).toBeTruthy(); // education count
  });

  it("is memoized for performance", () => {
    // Component should be memoized to prevent unnecessary re-renders
    expect(WelcomePanel.$$typeof).toBeDefined();
  });
});
