import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 2,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.BASE_URL || "https://staging.shukhratbekov.uz",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "lms",
      use: { baseURL: process.env.LMS_URL || "https://lms.staging.shukhratbekov.uz" },
    },
    {
      name: "crm",
      use: { baseURL: process.env.CRM_URL || "https://crm.staging.shukhratbekov.uz" },
    },
    {
      name: "student",
      use: { baseURL: process.env.STUDENT_URL || "https://student.staging.shukhratbekov.uz" },
    },
    {
      name: "website",
      use: { baseURL: process.env.BASE_URL || "https://staging.shukhratbekov.uz" },
    },
  ],
});
