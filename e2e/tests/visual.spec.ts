import { test, expect } from './fixtures';

test.skip(!process.env.CI, 'Screenshots are compared on the amd64 CI runner only');

const pages = [
  { name: 'home', path: '/' },
  { name: 'cv', path: '/cv/' },
  { name: 'pgp-keys', path: '/pgp-keys/' },
];

for (const { name, path } of pages) {
  test(`${name} looks unchanged`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('i.fa-fw')).toHaveCount(0);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      mask: [page.locator('footer')],
      animations: 'disabled',
      scale: 'css',
    });
  });
}
