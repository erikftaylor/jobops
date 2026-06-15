import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CareerMemoryPanel from "../CareerMemoryPanel";

describe("CareerMemoryPanel", () => {
  it("renders the Career Memory panel", () => {
    render(<CareerMemoryPanel health={null} />);

    expect(screen.getByText("Career Memory")).toBeInTheDocument();
    expect(screen.getByText("Your professional foundation")).toBeInTheDocument();
  });

  it("shows empty state when career memory is not loaded", () => {
    const health = {
      status: "healthy",
      master_career_document: { loaded: false },
    };

    const { container } = render(<CareerMemoryPanel health={health as any} />);

    const emptyCard = container.querySelector(".career-memory-card.empty");
    expect(emptyCard).toBeInTheDocument();
    expect(screen.getByText("Create Career Memory")).toBeInTheDocument();
  });

  it("shows loaded state when career memory is available", () => {
    const health = {
      status: "healthy",
      master_career_document: {
        loaded: true,
        content_hash: "abc123def456",
        sections: ["experience", "skills"],
      },
    };

    render(<CareerMemoryPanel health={health as any} />);

    expect(screen.getByText("✓ Loaded")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("View Career Memory")).toBeInTheDocument();
  });

  it("displays version hash when available", () => {
    const health = {
      status: "healthy",
      master_career_document: {
        loaded: true,
        content_hash: "abc123def456xyz789",
        sections: [],
      },
    };

    render(<CareerMemoryPanel health={health as any} />);

    const hashElement = screen.getByTitle("abc123def456xyz789");
    expect(hashElement).toHaveTextContent("abc123de...");
  });

  it("displays section count when available", () => {
    const health = {
      status: "healthy",
      master_career_document: {
        loaded: true,
        content_hash: "abc123",
        sections: ["experience", "skills", "education"],
      },
    };

    render(<CareerMemoryPanel health={health as any} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders help section with details", () => {
    render(<CareerMemoryPanel health={null} />);

    const summary = screen.getByText("What is Career Memory?");
    expect(summary).toBeInTheDocument();
  });
});
