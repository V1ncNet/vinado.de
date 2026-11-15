import { test, expect } from './fixtures';

test('home answers with CSP', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-security-policy']).toContain("default-src 'none'");
  await expect(page).toHaveTitle('Vincent Nadoll');
});
