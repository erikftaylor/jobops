import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CareerProfileCard from "./CareerProfileCard";
import { HealthCheckResponse } from "@shared/types";
import { describe, it, expect } from "vitest";

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

describe("CareerProfileCard", () => {
  it("renders card with title", () => {
    render(<CareerProfileCard health={mockHealth} />);
    expect(screen.getByText("Career Profile")).toBeInTheDocument();
  });

  it("shows loaded status when CV is loaded", () => {
    render(<CareerProfileCard health={mockHealth} />);
    expect(screen.getByText("Loaded")).toBeInTheDocument();
  });

  it("shows missing status when CV is not loaded", () => {
    const healthNotLoaded: HealthCheckResponse = {
      ...mockHealth,
      master_career_document: {
        found: false,
        loaded: false,
        hash: null,
        loaded_at: null,
      },
    };

    render(<CareerProfileCard health={healthNotLoaded} />);
    expect(screen.getByText("Not Found")).toBeInTheDocument();
    expect(screen.getByText(/Career Profile not found/)).toBeInTheDocument();
  });

  it("displays document source when loaded", () => {
    render(<CareerProfileCard health={mockHealth} />);
    expect(screen.getByText("Master_Career_Document.md")).toBeInTheDocument();
  });

  it("displays file path when not loaded", () => {
    const healthNotLoaded: HealthCheckResponse = {
      ...mockHealth,
      master_career_document: {
        found: false,
        loaded: false,
        hash: null,
        loaded_at: null,
      },
    };

    render(<CareerProfileCard health={healthNotLoaded} />);
    expect(
      screen.getByText(/data\/Master_Career_Document\.md/)
    ).toBeInTheDocument();
  });

  it("displays version hash when loaded", () => {
    render(<CareerProfileCard health={mockHealth} />);
    expect(screen.getByText("abc123de...")).toBeInTheDocument();
  });

  it("displays stats when loaded", () => {
    render(
      <CareerProfileCard
        health={mockHealth}
        experienceCount={5}
        skillCount={20}
        educationCount={3}
      />
    );

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("Education")).toBeInTheDocument();
  });

  it("shows default zero counts for stats", () => {
    render(<CareerProfileCard health={mockHealth} />);

    // Should show 0 for all stats since no counts provided
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThan(0);
  });

  it("handles unhealthy health status", () => {
    const unhealthyStatus = {
      status: "unhealthy" as const,
      error: "Server unavailable",
    };

    render(<CareerProfileCard health={unhealthyStatus} />);
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText(/Server unavailable/)).toBeInTheDocument();
  });

  it("formats dates nicely", () => {
    const today = new Date();
    const healthWithToday: HealthCheckResponse = {
      ...mockHealth,
      master_career_document: {
        ...mockHealth.master_career_document,
        loaded_at: today.toISOString(),
      },
    };

    render(<CareerProfileCard health={healthWithToday} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("is memoized for performance", () => {
    // Component should be memoized to prevent unnecessary re-renders
    expect(CareerProfileCard.$$typeof).toBeDefined();
  });
});
