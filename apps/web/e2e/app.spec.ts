import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should redirect to login when accessing dashboard unauthenticated", async ({ page }) => {
    await page.goto("/events");
    await expect(page).toHaveURL(/.*login/);
  });

  test("should display login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });
});

test.describe("Dashboard", () => {
  test("should display dashboard stats", async ({ page }) => {
    await page.goto("/");
    // Check if we're on dashboard or redirected to login
    const url = page.url();
    if (url.includes("login")) {
      test.skip();
      return;
    }
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Total revenue")).toBeVisible();
    await expect(page.getByText("Tickets sold")).toBeVisible();
  });
});

test.describe("Events", () => {
  test("should navigate to events list", async ({ page }) => {
    await page.goto("/events");
    const url = page.url();
    if (url.includes("login")) {
      test.skip();
      return;
    }
    await expect(page.getByText("Events")).toBeVisible();
  });

  test("should have create event button", async ({ page }) => {
    await page.goto("/events");
    const url = page.url();
    if (url.includes("login")) {
      test.skip();
      return;
    }
    await expect(page.getByRole("link", { name: /new event/i })).toBeVisible();
  });
});
