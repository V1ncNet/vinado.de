import { test, expect } from './fixtures';

const pages = [
  { path: '/', title: 'Vincent Nadoll', heading: 'Vincent Nadoll' },
  { path: '/cv/', title: 'Vincent Nadoll • Lebenslauf', heading: 'Lebenslauf' },
  { path: '/pgp-keys/', title: 'Vincent Nadoll • PGP Keys', heading: 'Vincent Nadoll' },
];

test('each page answers with CSP and heading', async ({ page }) => {
  for (const { path, title, heading } of pages) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-security-policy']).toContain("default-src 'none'");
    await expect(page).toHaveTitle(title);
    await expect(page.locator('h1:visible')).toHaveText(heading);
  }
});

test('home links point to profiles', async ({ page }) => {
  await page.goto('/');
  const links = {
    GitHub: 'https://github.com/V1ncNet',
    Instagram: 'https://www.instagram.com/vinado95/',
    Mastodon: 'https://masto.ai/@vinado',
    Steam: 'https://steamcommunity.com/id/V1ncNet',
    'Sing @ Kammerchor Wernigerode': 'https://kammerchor-wernigerode.de',
    'Code open-source software': 'https://github.com/V1ncNet',
    Telegram: 'https://t.me/vinado',
    Matrix: 'https://matrix.to/#/@vinado:matrix.org',
    Discord: 'https://discord.com/users/v1nad0',
  };
  for (const [name, href] of Object.entries(links)) {
    await expect(page.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
});

test('home renders icons', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('i.fa-fw')).toHaveCount(0);
  expect(await page.locator('svg.svg-inline--fa').count()).toBeGreaterThanOrEqual(10);
});

test('email button reveals mailto link', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Show email' });
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveCount(0);
  const revealed = await page.evaluate(() => {
    const active = document.activeElement;
    const isMailtoLink =
      active instanceof HTMLAnchorElement && /^mailto:[^@]+@[^@]+$/.test(active.getAttribute('href') ?? '');
    active?.remove();
    return isMailtoLink;
  });
  expect(revealed).toBe(true);
});

test('cv shows all sections', async ({ page }) => {
  await page.goto('/cv/');
  await expect(page.locator('h2')).toHaveText(['Berufserfahrung', 'Ausbildung', 'Kenntnisse und Fähigkeiten', 'Engagement']);
});

test('pgp page shows key', async ({ page, request }) => {
  await page.goto('/pgp-keys/');
  await expect(page.getByText('1E9C 28E5 6E4F C136 ED7F 8DB8 B921 02E5 8DC1 9C84')).toBeVisible();
  await expect(page.getByText('curl https://vinado.de/pgp_keys.asc | gpg --import')).toBeVisible();
  const response = await request.get('/pgp_keys.asc');
  expect(response.status()).toBe(200);
  expect(await response.text()).toMatch(/^-----BEGIN PGP PUBLIC KEY BLOCK-----/);
});

test('footer links lead to pages', async ({ page }) => {
  const footerLinks = [
    { name: 'PGP Keys', path: '/pgp-keys/' },
    { name: 'CV', path: '/cv/' },
    { name: 'Homepage', path: '/' },
  ];
  for (const { name, path } of footerLinks) {
    await page.goto('/');
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.request().isNavigationRequest() && new URL(r.url()).pathname === path),
      page.getByRole('contentinfo').getByRole('link', { name, exact: true }).click(),
    ]);
    expect(response.status()).toBe(200);
  }
});

test('static assets answer', async ({ request }) => {
  for (const path of ['/robots.txt', '/humans.txt', '/site.webmanifest', '/favicon.ico', '/sitemap-index.xml']) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
});
