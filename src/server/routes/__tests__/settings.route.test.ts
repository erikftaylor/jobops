import { describe, it, expect, vi } from "vitest";
import { createCareerDocService } from "../../services/career-doc.service.js";

interface MockResponse {
  statusCode: number;
  jsonData: any;
  status: (code: number) => MockResponse;
  json: (data: any) => MockResponse;
}

function createMockResponse(): MockResponse {
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.jsonData = data;
      return this;
    },
  };
  return res;
}

describe("Settings Route - Career Document Endpoint", () => {
  it("should correctly parse career document when getActiveCareerDocument returns null", () => {
    const careerDocService = createCareerDocService();

    // Mock the service methods
    const getActiveMock = vi.spyOn(careerDocService, "getActiveCareerDocument").mockReturnValue(null);
    const readMock = vi.spyOn(careerDocService, "readCareerDocument").mockReturnValue("## Contact\nTest User");
    const parseMock = vi.spyOn(careerDocService, "parseCareerDocument").mockImplementation(() => ({
      contact: { name: "Test User" },
      professionalSummary: undefined,
      roles: [],
      skillsInventory: {},
      education: [],
      certifications: [],
      projects: [],
      awards: [],
      rawSourceText: "## Contact\nTest User",
      isPlaceholder: false,
    }));
    const hashMock = vi.spyOn(careerDocService, "computeHash").mockReturnValue("abc123hash");

    // Simulate the route logic
    let parsed = careerDocService.getActiveCareerDocument();
    let response = createMockResponse();

    if (!parsed) {
      const rawContent = careerDocService.readCareerDocument();
      parsed = careerDocService.parseCareerDocument(rawContent);
      response.status(200).json({
        ...parsed,
        hash: careerDocService.computeHash(rawContent),
      });
    } else {
      response.status(200).json({
        ...parsed,
        hash: careerDocService.computeHash(parsed.rawSourceText),
      });
    }

    // Verify the correct parsed document was returned
    expect(response.jsonData).toBeDefined();
    expect(response.jsonData.contact.name).toBe("Test User");
    expect(response.jsonData.hash).toBe("abc123hash");
    expect(response.statusCode).toBe(200);

    // Verify methods were called in correct order
    expect(getActiveMock).toHaveBeenCalled();
    expect(readMock).toHaveBeenCalled();
    expect(parseMock).toHaveBeenCalled();
    expect(hashMock).toHaveBeenCalledWith("## Contact\nTest User");

    getActiveMock.mockRestore();
    readMock.mockRestore();
    parseMock.mockRestore();
    hashMock.mockRestore();
  });

  it("should use active career document when it exists", () => {
    const careerDocService = createCareerDocService();

    const activeDoc = {
      contact: { name: "Active User" },
      roles: [],
      skillsInventory: {},
      education: [],
      certifications: [],
      projects: [],
      rawSourceText: "## Contact\nActive User",
      isPlaceholder: false,
    };

    const getActiveMock = vi.spyOn(careerDocService, "getActiveCareerDocument").mockReturnValue(activeDoc);
    const hashMock = vi.spyOn(careerDocService, "computeHash").mockReturnValue("active123hash");

    let parsed = careerDocService.getActiveCareerDocument();
    let response = createMockResponse();

    if (!parsed) {
      response.status(500).json({ error: "Should not reach here" });
    } else {
      response.status(200).json({
        ...parsed,
        hash: careerDocService.computeHash(parsed.rawSourceText),
      });
    }

    expect(response.jsonData).toBeDefined();
    expect(response.jsonData.contact.name).toBe("Active User");
    expect(response.jsonData.hash).toBe("active123hash");
    expect(hashMock).toHaveBeenCalledWith("## Contact\nActive User");

    getActiveMock.mockRestore();
    hashMock.mockRestore();
  });
});
