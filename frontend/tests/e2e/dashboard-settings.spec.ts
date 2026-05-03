import { test, expect } from "@playwright/test";

test("dashboard settings redirects unauthenticated visitors", async ({ page }) => {
  await page.goto("/dashboard/settings");

  await expect(page).toHaveURL(/\/auth\/login\?next=%2Fdashboard%2Fsettings/);
  await expect(page.getByRole("heading", { name: "Selamat Datang" })).toBeVisible();
});

test("anggota keluarga route redirects unauthenticated visitors", async ({ page }) => {
  await page.goto("/dashboard/rw/warga/00000000-0000-4000-8000-000000000000/anggota-keluarga");

  await expect(page).toHaveURL(
    /\/auth\/login\?next=%2Fdashboard%2Frw%2Fwarga%2F00000000-0000-4000-8000-000000000000%2Fanggota-keluarga/
  );
});