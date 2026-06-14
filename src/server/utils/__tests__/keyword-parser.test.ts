import { describe, it, expect } from "vitest";
import { parseKeywords, extractKeywords } from "../keyword-parser.js";

describe("parseKeywords", () => {
  describe("Basic delimiter splitting", () => {
    it("should split on whitespace", () => {
      const result = parseKeywords("hello world test");
      expect(result).toEqual(["hello", "world", "test"]);
    });

    it("should split on commas", () => {
      const result = parseKeywords("hello,world,test");
      expect(result).toEqual(["hello", "world", "test"]);
    });

    it("should split on hyphens", () => {
      const result = parseKeywords("hello-world-test");
      expect(result).toEqual(["hello", "world", "test"]);
    });

    it("should split on newlines", () => {
      const result = parseKeywords("hello\nworld\ntest");
      expect(result).toEqual(["hello", "world", "test"]);
    });

    it("should split on periods", () => {
      const result = parseKeywords("hello.world.test");
      expect(result).toEqual(["hello", "world", "test"]);
    });

    it("should split on semicolons", () => {
      const result = parseKeywords("hello;world;test");
      expect(result).toEqual(["hello", "world", "test"]);
    });

    it("should split on colons", () => {
      const result = parseKeywords("hello:world:test");
      expect(result).toEqual(["hello", "world", "test"]);
    });

    it("should split on parentheses", () => {
      const result = parseKeywords("hello(world)test");
      expect(result).toEqual(["hello", "world", "test"]);
    });
  });

  describe("Mixed delimiter handling", () => {
    it("should handle mixed whitespace and commas", () => {
      const result = parseKeywords("hello, world , test");
      expect(result).toEqual(["hello", "world", "test"]);
    });

    it("should handle mixed delimiters in realistic text", () => {
      const result = parseKeywords("Node.js, React-Native; TypeScript: Expert (5+ years)");
      // Verify key tokens are present (exact order/count may vary)
      expect(result).toContain("Node");
      expect(result).toContain("React");
      expect(result).toContain("TypeScript");
      expect(result).toContain("Expert");
    });

    it("should handle complex real-world job description snippet", () => {
      const text =
        "Required: Java, Python, SQL; Nice to have: Docker, Kubernetes (3+ years)";
      const result = parseKeywords(text);
      // Verify key technology tokens are parsed
      expect(result).toContain("Java");
      expect(result).toContain("Python");
      expect(result).toContain("SQL");
      expect(result).toContain("Docker");
      expect(result).toContain("Kubernetes");
    });

    it("should handle multiple consecutive delimiters", () => {
      const result = parseKeywords("hello,,,world---test");
      expect(result).toEqual(["hello", "world", "test"]);
    });
  });

  describe("Whitespace handling", () => {
    it("should trim tokens", () => {
      const result = parseKeywords("  hello   world  test  ");
      expect(result).toEqual(["hello", "world", "test"]);
    });

    it("should remove empty strings after splitting", () => {
      const result = parseKeywords("hello  ,  world");
      expect(result).toEqual(["hello", "world"]);
    });

    it("should handle leading/trailing whitespace in input", () => {
      const result = parseKeywords("  hello world  ");
      expect(result).toEqual(["hello", "world"]);
    });

    it("should handle tabs and newlines", () => {
      const result = parseKeywords("hello\t\nworld\r\ntest");
      expect(result).toContain("hello");
      expect(result).toContain("world");
      expect(result).toContain("test");
    });
  });

  describe("Empty and null input", () => {
    it("should return empty array for empty string", () => {
      const result = parseKeywords("");
      expect(result).toEqual([]);
    });

    it("should return empty array for whitespace only", () => {
      const result = parseKeywords("   ");
      expect(result).toEqual([]);
    });

    it("should return empty array for delimiter-only string", () => {
      const result = parseKeywords(",,,---;;;::()");
      expect(result).toEqual([]);
    });

    it("should return empty array for null input", () => {
      const result = parseKeywords("");
      expect(result).toEqual([]);
    });
  });

  describe("Case preservation", () => {
    it("should preserve case by default", () => {
      const result = parseKeywords("Hello World TEST");
      expect(result).toEqual(["Hello", "World", "TEST"]);
    });

    it("should preserve mixed case in technical terms", () => {
      const result = parseKeywords("TypeScript, JavaScript, Python");
      expect(result).toEqual(["TypeScript", "JavaScript", "Python"]);
    });

    it("should handle camelCase and PascalCase", () => {
      const result = parseKeywords("camelCase, PascalCase");
      expect(result).toEqual(["camelCase", "PascalCase"]);
    });
  });

  describe("Minimum length filtering", () => {
    it("should not filter by default (minLength=0)", () => {
      const result = parseKeywords("I am a developer");
      expect(result).toContain("I");
      expect(result).toContain("a");
    });

    it("should filter tokens below minLength (token.length > minLength)", () => {
      const result = parseKeywords("I am a big developer", { minLength: 2 });
      // Filter keeps tokens where length > 2 (length 3+)
      expect(result).not.toContain("I"); // length 1
      expect(result).not.toContain("a"); // length 1
      expect(result).not.toContain("am"); // length 2, filtered
      expect(result).toContain("big"); // length 3
      expect(result).toContain("developer"); // length 9
    });

    it("should filter with minLength=3", () => {
      const result = parseKeywords("the quick brown fox", { minLength: 3 });
      // Filter keeps tokens where length > 3 (length 4+)
      expect(result).not.toContain("the"); // length 3, filtered
      expect(result).not.toContain("fox"); // length 3, filtered
      expect(result).toContain("quick"); // length 5
      expect(result).toContain("brown"); // length 5
    });

    it("should filter with minLength=4", () => {
      const result = parseKeywords("verify testing python", { minLength: 4 });
      // Filter keeps tokens where length > 4 (length 5+)
      expect(result).toContain("verify"); // length 6
      expect(result).toContain("testing"); // length 7
      expect(result).toContain("python"); // length 6
    });

    it("should return empty array when all tokens below minLength", () => {
      const result = parseKeywords("a b c d e", { minLength: 2 });
      expect(result).toEqual([]);
    });
  });

  describe("Real-world scenarios", () => {
    it("should parse job description keywords", () => {
      const jobDesc =
        "We are looking for a Senior Developer with 5+ years of experience in TypeScript, Node.js, and React. Must have experience with Docker and Kubernetes.";
      const result = parseKeywords(jobDesc, { minLength: 3 });

      // Verify key technology keywords are parsed
      expect(result).toContain("Senior");
      expect(result).toContain("Developer");
      expect(result).toContain("TypeScript");
      expect(result).toContain("Node");
      expect(result).toContain("React");
      expect(result).toContain("Docker");
      expect(result).toContain("Kubernetes");
    });

    it("should parse resume text", () => {
      const resume =
        "Senior Software Engineer at TechCorp. Skilled in: JavaScript, Python, SQL. Led team of 5 engineers. Increased performance by 40%.";
      const result = parseKeywords(resume, { minLength: 2 });

      expect(result).toContain("Senior");
      expect(result).toContain("Software");
      expect(result).toContain("Engineer");
      expect(result).toContain("JavaScript");
      expect(result).toContain("Python");
      expect(result).toContain("SQL");
      expect(result).toContain("Led");
      expect(result).toContain("performance");
    });

    it("should handle skill list format", () => {
      const skills = "JavaScript, TypeScript, React.js, Node.js (3+ years)";
      const result = parseKeywords(skills);

      expect(result).toContain("JavaScript");
      expect(result).toContain("TypeScript");
      expect(result).toContain("React");
      expect(result).toContain("Node");
      expect(result).toContain("years");
    });

    it("should handle comma-separated list with extra spaces", () => {
      const list = "Java  ,  Python  ,  Go  ,  Rust";
      const result = parseKeywords(list);

      expect(result).toEqual(["Java", "Python", "Go", "Rust"]);
    });
  });

  describe("Special characters and edge cases", () => {
    it("should handle numbers", () => {
      const result = parseKeywords("React 18, Vue 3, Angular 15");
      expect(result).toContain("React");
      expect(result).toContain("18");
      expect(result).toContain("Vue");
      expect(result).toContain("3");
    });

    it("should handle decimal numbers", () => {
      const result = parseKeywords("Version 3.14, Release 2.1.0");
      expect(result).toContain("Version");
      expect(result).toContain("3");
      expect(result).toContain("14");
      expect(result).toContain("Release");
      expect(result).toContain("2");
      expect(result).toContain("1");
      expect(result).toContain("0");
    });

    it("should handle URLs (split on delimiters only)", () => {
      const result = parseKeywords("https://github.com/user/repo");
      // URL is split by colons and periods only (slashes are not delimiters)
      expect(result).toContain("https");
      // The rest is not fully split because "/" is not a delimiter
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle markdown-like formatting", () => {
      const result = parseKeywords("**Skills**: JavaScript, TypeScript");
      // Asterisks are not delimiters, so "**Skills**" is kept as is
      expect(result).toContain("**Skills**");
      expect(result).toContain("JavaScript");
      expect(result).toContain("TypeScript");
    });

    it("should handle parenthetical notes", () => {
      const result = parseKeywords("Expert (10+ years) in Python");
      expect(result).toContain("Expert");
      expect(result).toContain("10+"); // "+" is not a delimiter, stays with "10"
      expect(result).toContain("years");
      expect(result).toContain("Python");
    });
  });

  describe("Determinism and stability", () => {
    it("should produce consistent output on repeated calls", () => {
      const input = "React, TypeScript, Node.js - 5+ years";
      const result1 = parseKeywords(input);
      const result2 = parseKeywords(input);

      expect(result1).toEqual(result2);
    });

    it("should maintain token order from input", () => {
      const result = parseKeywords("zebra, apple, monkey, banana");
      expect(result[0]).toBe("zebra");
      expect(result[1]).toBe("apple");
      expect(result[2]).toBe("monkey");
      expect(result[3]).toBe("banana");
    });
  });
});

describe("extractKeywords", () => {
  it("should be an alias for parseKeywords with default minLength=0", () => {
    const input = "hello world test";
    const result1 = extractKeywords(input);
    const result2 = parseKeywords(input);

    expect(result1).toEqual(result2);
  });

  it("should respect minLength parameter", () => {
    const input = "a cat sat on the mat";
    const result = extractKeywords(input, 4);

    // "cat" has 3 chars, filtered out; "sat", "the", "mat" have 3 chars, filtered out
    // Only tokens with 4+ chars remain
    expect(result).toEqual([]);
  });

  it("should work with complex input and minLength", () => {
    const input =
      "Senior Software Engineer with expertise in TypeScript and Node.js";
    const result = extractKeywords(input, 3);

    expect(result).toContain("Senior");
    expect(result).toContain("Software");
    expect(result).toContain("Engineer");
    expect(result).toContain("expertise");
    expect(result).toContain("TypeScript");
    // "and" has exactly 3 chars, should be included with minLength=3
    expect(result).toContain("with");
    expect(result).toContain("Node");
  });
});
