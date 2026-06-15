import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ApplicationStudioPage from "../ApplicationStudioPage";

// Mock the sub-components
vi.mock("../../components/CareerMemoryPanel", () => ({
  default: () => <div data-testid="career-memory-panel">Career Memory Panel</div>,
}));

vi.mock("../../components/JobInputPanel", () => ({
  default: () => <div data-testid="job-input-panel">Job Input Panel</div>,
}));

vi.mock("../../components/StrategyCoachPanel", () => ({
  default: () => <div data-testid="strategy-coach-panel">Strategy Coach Panel</div>,
}));

vi.mock("../../components/DocumentStudioPanel", () => ({
  default: () => <div data-testid="document-studio-panel">Document Studio Panel</div>,
}));

// Mock the hooks
vi.mock("../../../jobs/hooks/useJobs", () => ({
  useJobs: () => ({
    jobs: [],
    isLoading: false,
    createJob: vi.fn(),
    updateJobState: vi.fn(),
  }),
}));

vi.mock("../../../jobs/hooks/useMessages", () => ({
  useMessages: () => ({
    messages: [],
    isLoading: false,
    loadMessages: vi.fn(),
    sendMessage: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe("ApplicationStudioPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "healthy" }),
    });
  });

  it("renders the three-panel layout", () => {
    render(<ApplicationStudioPage />);

    expect(screen.getByTestId("career-memory-panel")).toBeInTheDocument();
    expect(screen.getByTestId("job-input-panel")).toBeInTheDocument();
    expect(screen.getByTestId("strategy-coach-panel")).toBeInTheDocument();
    expect(screen.getByTestId("document-studio-panel")).toBeInTheDocument();
  });

  it("displays Career Memory panel on the left", () => {
    const { container } = render(<ApplicationStudioPage />);
    const leftPanel = container.querySelector(".studio-left-panel");

    expect(leftPanel).toBeInTheDocument();
    expect(leftPanel).toContainElement(screen.getByTestId("career-memory-panel"));
  });

  it("displays Strategy Coach panel in the center", () => {
    const { container } = render(<ApplicationStudioPage />);
    const centerPanel = container.querySelector(".studio-center-panel");

    expect(centerPanel).toBeInTheDocument();
    expect(centerPanel).toContainElement(screen.getByTestId("strategy-coach-panel"));
  });

  it("displays Document Studio panel on the right", () => {
    const { container } = render(<ApplicationStudioPage />);
    const rightPanel = container.querySelector(".studio-right-panel");

    expect(rightPanel).toBeInTheDocument();
    expect(rightPanel).toContainElement(screen.getByTestId("document-studio-panel"));
  });

  it("uses application-studio-page CSS class", () => {
    const { container } = render(<ApplicationStudioPage />);
    const page = container.firstChild;

    expect(page).toHaveClass("application-studio-page");
  });

  it("fetches health status on mount", async () => {
    render(<ApplicationStudioPage />);

    expect(global.fetch).toHaveBeenCalledWith("/api/health");
  });
});
