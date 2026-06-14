/**
 * Parse text into normalized keyword tokens.
 * Handles consistent tokenization across resume scoring, fit analysis, and keyword analysis.
 */
export function parseKeywords(text: string, options?: { minLength?: number }): string[] {
  if (!text) return [];

  const { minLength = 0 } = options || {};

  // Split on whitespace, commas, hyphens, newlines, periods, semicolons, colons, parentheses
  const tokens = text
    .split(/[\s,\-\n.;:()]+/)
    .filter((token) => token.length > minLength)
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens;
}

/**
 * Extract skills/keywords from text with optional minimum length filter.
 * Commonly used for comparing resume content against job requirements.
 */
export function extractKeywords(text: string, minLength: number = 0): string[] {
  return parseKeywords(text, { minLength });
}
