import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/FigmaLab/i);
});

test('get started link', async ({ page }) => {
    await page.goto('/');

    // Check if some main element exists
    const mainElement = page.locator('#root');
    await expect(mainElement).toBeVisible();
});
