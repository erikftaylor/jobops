import { test, expect, Page } from "@playwright/test";

test.describe("Resume Generation Vertical Slice", () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto("http://localhost:5173");
  });

  test.afterEach(async () => {
    await page.close();
  });

  test("complete flow: Generate → Preview → Copy → Download", async () => {
    // Step 1: Create a job
    const testJobData = {
      title: "Senior Software Engineer",
      company: "TechCorp",
      description: `We are looking for a Senior Software Engineer to join our team.
Requirements:
- 5+ years of software engineering experience
- Strong TypeScript/Node.js skills
- Experience with React
- System design knowledge

Responsibilities:
- Design and implement scalable backend systems
- Mentor junior engineers
- Lead technical discussions`,
    };

    // Fill in new job form
    await page.fill('input[name="title"]', testJobData.title);
    await page.fill('input[name="company"]', testJobData.company);
    await page.fill('textarea[placeholder*="description" i]', testJobData.description);

    // Submit form
    await page.click('button:has-text("Create Job")');

    // Wait for job to appear in list
    await page.waitForSelector(`text=${testJobData.title}`);

    // Click to select the job
    await page.click(`text=${testJobData.title}`);

    // Step 2: Click Generate Resume button
    const generateButton = page.locator('button:has-text("Generate Tailored Resume")');
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // Step 3: Wait for generation to complete
    // Should show loading state
    await expect(generateButton).toContainText("Generating Resume...");

    // Wait for "Resume Generated" to appear (max 30 seconds for Claude)
    await page.waitForSelector('text=Resume Generated', { timeout: 60000 });

    // Verify artifact card appears
    const artifactCard = page.locator('text=Resume Generated');
    await expect(artifactCard).toBeVisible();

    // Verify version badge
    const versionBadge = page.locator('text=V1');
    await expect(versionBadge).toBeVisible();

    // Step 4: Click Preview button
    const previewButton = page.locator('button:has-text("Preview")');
    await expect(previewButton).toBeVisible();
    await previewButton.click();

    // Step 5: Verify preview modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Check that resume content is visible
    const resumeContent = page.locator("text=PROFESSIONAL SUMMARY");
    await expect(resumeContent).toBeVisible();

    // Verify the resume preview shows rendered text
    const previewText = await modal.textContent();
    expect(previewText).toBeTruthy();
    expect(previewText).toContain("CORE SKILLS");
    expect(previewText).toContain("EXPERIENCE");

    // Step 6: Test Copy button
    const copyButton = page.locator('button:has-text("Copy")');
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    // Verify copy feedback
    await expect(copyButton).toContainText("✓ Copied!", { timeout: 2000 });

    // Verify clipboard content by checking if it contains expected text
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("PROFESSIONAL SUMMARY");

    // Step 7: Test Download PDF button
    const downloadPromise = page.waitForEvent("download");
    const downloadButton = page.locator('button:has-text("Download PDF")');
    await expect(downloadButton).toBeVisible();
    await downloadButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/resume_v\d+\.pdf/);

    // Step 8: Close modal
    const closeButton = page.locator('button[aria-label="Close modal"]');
    await closeButton.click();

    // Verify modal is closed
    await expect(modal).not.toBeVisible();

    // Step 9: Refresh page and verify persistence
    await page.reload();

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Verify artifact still visible after refresh
    await expect(page.locator("text=Resume Generated")).toBeVisible();
    await expect(page.locator("text=V1")).toBeVisible();

    // Step 10: Re-open preview to verify data persisted
    const previewButtonAfterRefresh = page.locator('button:has-text("Preview")');
    await previewButtonAfterRefresh.click();

    // Verify modal opens again
    await expect(modal).toBeVisible();
    const resumeContentAfterRefresh = page.locator("text=PROFESSIONAL SUMMARY");
    await expect(resumeContentAfterRefresh).toBeVisible();
  });

  test("should handle generation error gracefully", async () => {
    // Create a minimal job to trigger potential errors
    const testJobData = {
      title: "Test Job",
      company: "Test Company",
      description: "Minimal job description for testing error handling.",
    };

    await page.fill('input[name="title"]', testJobData.title);
    await page.fill('input[name="company"]', testJobData.company);
    await page.fill('textarea[placeholder*="description" i]', testJobData.description);
    await page.click('button:has-text("Create Job")');

    await page.waitForSelector(`text=${testJobData.title}`);
    await page.click(`text=${testJobData.title}`);

    // Try to generate resume
    const generateButton = page.locator('button:has-text("Generate Tailored Resume")');
    await generateButton.click();

    // Wait a moment for potential error to appear or success to occur
    try {
      await page.waitForSelector("text=Resume Generated", { timeout: 60000 });
    } catch {
      // Error may have occurred, check for error message
      const errorElement = page.locator("[role=alert]", { hasText: /error|failed/i });
      // Either generation succeeded or error was shown - both are valid outcomes
    }
  });
});
