import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("API docs are accessible", async ({ request }) => {
    const apiUrl = process.env.API_URL || "https://api.staging.shukhratbekov.uz";
    const response = await request.get(`${apiUrl}/docs`);
    expect(response.status()).toBe(200);
  });

  test("Website loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
  });
});

test.describe("Auth Flow", () => {
  test("Director can log in to LMS", async ({ page }) => {
    const lmsUrl = process.env.LMS_URL || "https://lms.staging.shukhratbekov.uz";
    await page.goto(lmsUrl);

    await page.fill('input[name="email"], input[type="email"]', "director@edu.uz");
    await page.fill('input[name="password"], input[type="password"]', process.env.TEST_USER_PASSWORD || "password123");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/dashboard**", { timeout: 10_000 });
    await expect(page.locator("text=Dashboard, text=Дашборд").first()).toBeVisible();
  });

  test("Student can log in to Student Portal", async ({ page }) => {
    const studentUrl = process.env.STUDENT_URL || "https://student.staging.shukhratbekov.uz";
    await page.goto(studentUrl);

    await page.fill('input[name="email"], input[type="email"]', "student1@edu.uz");
    await page.fill('input[name="password"], input[type="password"]', process.env.TEST_USER_PASSWORD || "password123");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/dashboard**", { timeout: 10_000 });
  });
});
