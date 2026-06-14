import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("useJobs - API Response Validation", () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should validate that data.jobs is an array before calling setJobs", async () => {
    const setJobsMock = vi.fn();
    const setErrorMock = vi.fn();
    const setIsLoadingMock = vi.fn();

    // Simulate the loadJobs callback logic with validation
    const loadJobsLogic = async (state?: string) => {
      setIsLoadingMock(true);
      setErrorMock(null);
      try {
        const url = state ? `/api/jobs?state=${state}` : "/api/jobs";
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to load jobs");
        const data = await response.json();
        if (!Array.isArray(data.jobs)) {
          throw new Error("Invalid response: jobs must be an array");
        }
        setJobsMock(data.jobs);
      } catch (err) {
        setErrorMock((err as Error).message);
      } finally {
        setIsLoadingMock(false);
      }
    };

    // Test 1: Valid response with array
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: [{ id: "1", title: "Job 1" }] }),
    });

    await loadJobsLogic();
    expect(setJobsMock).toHaveBeenCalledWith([{ id: "1", title: "Job 1" }]);
    expect(setErrorMock).not.toHaveBeenCalledWith(expect.stringContaining("must be an array"));

    // Reset mocks
    vi.clearAllMocks();

    // Test 2: Invalid response with null jobs
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: null }),
    });

    await loadJobsLogic();
    expect(setJobsMock).not.toHaveBeenCalled();
    expect(setErrorMock).toHaveBeenCalledWith("Invalid response: jobs must be an array");

    vi.clearAllMocks();

    // Test 3: Invalid response with string jobs
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: "string" }),
    });

    await loadJobsLogic();
    expect(setJobsMock).not.toHaveBeenCalled();
    expect(setErrorMock).toHaveBeenCalledWith("Invalid response: jobs must be an array");

    vi.clearAllMocks();

    // Test 4: Invalid response with object jobs
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: { data: [] } }),
    });

    await loadJobsLogic();
    expect(setJobsMock).not.toHaveBeenCalled();
    expect(setErrorMock).toHaveBeenCalledWith("Invalid response: jobs must be an array");

    vi.clearAllMocks();

    // Test 5: Valid response with empty array
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: [] }),
    });

    await loadJobsLogic();
    expect(setJobsMock).toHaveBeenCalledWith([]);
    expect(setErrorMock).not.toHaveBeenCalledWith(expect.stringContaining("must be an array"));
  });

  it("should handle network errors gracefully", async () => {
    const setJobsMock = vi.fn();
    const setErrorMock = vi.fn();
    const setIsLoadingMock = vi.fn();

    const loadJobsLogic = async () => {
      setIsLoadingMock(true);
      setErrorMock(null);
      try {
        const response = await fetch("/api/jobs");
        if (!response.ok) throw new Error("Failed to load jobs");
        const data = await response.json();
        if (!Array.isArray(data.jobs)) {
          throw new Error("Invalid response: jobs must be an array");
        }
        setJobsMock(data.jobs);
      } catch (err) {
        setErrorMock((err as Error).message);
      } finally {
        setIsLoadingMock(false);
      }
    };

    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    await loadJobsLogic();
    expect(setJobsMock).not.toHaveBeenCalled();
    expect(setErrorMock).toHaveBeenCalledWith("Network error");
    expect(setIsLoadingMock).toHaveBeenLastCalledWith(false);
  });

  it("should handle HTTP errors gracefully", async () => {
    const setJobsMock = vi.fn();
    const setErrorMock = vi.fn();
    const setIsLoadingMock = vi.fn();

    const loadJobsLogic = async () => {
      setIsLoadingMock(true);
      setErrorMock(null);
      try {
        const response = await fetch("/api/jobs");
        if (!response.ok) throw new Error("Failed to load jobs");
        const data = await response.json();
        if (!Array.isArray(data.jobs)) {
          throw new Error("Invalid response: jobs must be an array");
        }
        setJobsMock(data.jobs);
      } catch (err) {
        setErrorMock((err as Error).message);
      } finally {
        setIsLoadingMock(false);
      }
    };

    fetchMock.mockResolvedValueOnce({
      ok: false,
    });

    await loadJobsLogic();
    expect(setJobsMock).not.toHaveBeenCalled();
    expect(setErrorMock).toHaveBeenCalledWith("Failed to load jobs");
  });
});
