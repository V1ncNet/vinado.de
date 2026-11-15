import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ failOnBrowserErrors: void }>({
  failOnBrowserErrors: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') problems.push(`console: ${message.text()}`);
      });
      page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
      page.on('requestfailed', (request) => {
        const reason = request.failure()?.errorText;
        if (reason !== 'net::ERR_ABORTED') problems.push(`requestfailed: ${request.url()} ${reason}`);
      });
      page.on('response', (response) => {
        if (response.status() >= 400) problems.push(`response: ${response.status()} ${response.url()}`);
      });
      await use();
      expect(problems).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
