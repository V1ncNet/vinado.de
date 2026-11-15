# Playwright-End-to-End-Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Playwright prüft die drei Seiten im gebauten Docker-Image funktional und optisch, damit Vincent Dependabot-PRs ohne eigene Sichtprüfung mergen kann.

**Architecture:** `e2e/` ist ein eigenes npm-Paket. Sein Compose-File startet das Image der Seite und daneben das offizielle Playwright-Image mit dem gemounteten `e2e/`. Die Version des Playwright-Images liest ein npm-Script aus `e2e/package-lock.json`. Funktionale Tests laufen überall, Screenshot-Tests nur mit gesetztem `CI` auf dem amd64-Runner.

**Tech Stack:** Playwright Test 1.65.x (TypeScript), Docker Compose, nginx-unprivileged, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-11-15-playwright-e2e-design.md`

## Global Constraints

- Getestet wird nur Chromium. Die Seiten sind `/`, `/cv/` und `/pgp-keys/`.
- Das Image baut mit `SITE=https://vinado.de` wie in `deploy.yml`.
- `@playwright/test` steht nur in `e2e/package.json`, nie im Root-`package.json`.
- Die echte E-Mail-Adresse steht nirgends im Repo, im Test, im Log oder in einem Artefakt.
- `updateSnapshots` bleibt in der Playwright-Konfiguration ungesetzt. `trace`, `video` und `screenshot` bleiben `'off'`.
- Referenzbilder entstehen nur in der CI. Lokal überspringt Playwright die Screenshot-Tests.
- Actions sind auf Commit-SHA mit Versionskommentar gepinnt. Der Checkout setzt `persist-credentials: false`, die `permissions` sind minimal.
- Commits auf Englisch nach Chris Beams, ohne unnötige Artikel, mit Trailer `Co-Authored-By` des tatsächlichen Modells.
- Gepusht wird nur nach Vincents ausdrücklichem Ja.
- Lokal läuft Node über `fnm exec --using=26 -- <cmd>`.

## Review Focus

1. **Falsches Grün in der CI.** Kommt `CI` nicht im Container an, überspringt Playwright alle Screenshots und meldet Grün. Erwartet wird ein roter Lauf. Task 3 belegt mit `CI=1`, dass die Variable ankommt. Task 4 prüft per `jq`, dass nichts übersprungen wurde.
2. **Adresse im Report.** Bei einem roten Test legt Playwright einen ARIA-Snapshot der Seite in den Report. Erwartet wird, dass die Adresse nie im DOM steht, wenn eine Assertion fehlschlägt. Task 2 prüft und entfernt den Link in einem einzigen `page.evaluate`.
3. **Icons noch nicht ersetzt.** Font Awesome lädt per `defer` und tauscht `<i>` gegen `<svg>`. Erwartet werden stabile Bilder. Task 3 wartet, bis kein `i.fa-fw` mehr im DOM ist, und Task 5 wiederholt den grünen Lauf zweimal.
4. **Jahreswechsel.** Der Footer zeigt das Baujahr. Erwartet wird, dass am 1. Januar kein Screenshot rot wird. Task 3 maskiert den Footer.
5. **Abgeschnittene Seite.** `fullPage` mit einem fixierten Element wie dem Stuck Pixel kann bei langer Seite wie `/cv/` mobil verrutschen. Erwartet wird ein vollständiges Bild. Task 5 sieht sich jedes Referenzbild an.

---

### Task 1: Testpaket mit einem ersten Test

**Files:**
- Create: `e2e/package.json`, `e2e/package-lock.json`, `e2e/run.sh`, `e2e/compose.yaml`, `e2e/playwright.config.ts`, `e2e/tests/fixtures.ts`, `e2e/tests/pages.spec.ts`
- Modify: `package.json` (nur Script), `.gitignore`, `.dockerignore`, `src/styles/tw.css`

**Interfaces:**
- Produces: `npm run test:e2e [-- <playwright args>]` im Repo-Root ruft `npm --prefix e2e test -- …` auf. Das startet den ganzen Lauf und gibt den Exit-Code von Playwright zurück.
- Produces: `e2e/tests/fixtures.ts` exportiert `test` und `expect`. `test` hat eine automatische Fixture. Sie lässt den Test fehlschlagen bei Konsolenfehlern, `pageerror`, fehlgeschlagenen Requests außer `net::ERR_ABORTED` und Antworten mit Status ≥ 400. Alle Specs importieren aus `./fixtures`.
- Produces: Playwright-Projekte `desktop` (`devices['Desktop Chrome']`) und `mobile` (`devices['Pixel 7']`). `baseURL` kommt aus `BASE_URL`, Standard `http://site:8080`.
- Produces: Reporter in dieser Reihenfolge: `list`, `html` (`open: 'never'`), `json` mit `outputFile: 'test-results/results.json'`.

- [ ] **Step 1: Paket anlegen**

`e2e/package.json` mit `"private": true`, `"type": "module"` und ohne `version`.
Run: `cd e2e && fnm exec --using=26 -- npm install --save-dev @playwright/test@1.65`
Expected: `e2e/package-lock.json` existiert. Das Root-`package-lock.json` ist unverändert.

- [ ] **Step 2: `e2e/compose.yaml` schreiben**

- Dienst `site`: `build` mit `context: ..` und `args: SITE: https://vinado.de`. Healthcheck `curl -fsS http://localhost:8080/` mit `interval: 1s`, `timeout: 2s`, `retries: 30`.
- Dienst `playwright`: `image: mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION:?}-noble`, `working_dir: /e2e`, Volumes `.:/e2e` und das anonyme `/e2e/node_modules`, `ipc: host`, `init: true`, `environment` mit `CI` (durchgereicht, ohne Wert) und `BASE_URL: http://site:8080`, `depends_on: site: condition: service_healthy`.
- `entrypoint: ["sh", "-c", "npm ci --ignore-scripts --no-audit --no-fund && exec \"$$@\"", "--"]`, `command: ["npx", "playwright", "test"]`. Das `$$` verhindert, dass Compose interpoliert.

- [ ] **Step 3: Scripts anlegen**

`e2e/run.sh`, ausführbar, `set -eu`:
```sh
cd "$(dirname "$0")"
export PLAYWRIGHT_VERSION=$(node -p "require('./package-lock.json').packages['node_modules/@playwright/test'].version")
trap 'docker compose down' EXIT
docker compose run --rm --build playwright npx playwright test "$@"
```
`e2e/package.json`, Script `test`: `./run.sh`. npm hängt Argumente an, so landen sie in `"$@"`. Ein Shell-Script statt Einzeiler, weil `trap` und Argumente in einem npm-Einzeiler nicht zuverlässig zusammengehen.

Root-`package.json`, Script `test:e2e`: `npm --prefix e2e test --`.

- [ ] **Step 4: `e2e/playwright.config.ts` und `e2e/tests/fixtures.ts` schreiben**

Werte wie unter Interfaces und Global Constraints. Dazu `testDir: 'tests'`, `forbidOnly: !!process.env.CI`, `retries: 0` und `snapshotPathTemplate: '{testDir}/__screenshots__/{arg}-{projectName}{ext}'`.

- [ ] **Step 5: Ersten Test schreiben**

```ts
// e2e/tests/pages.spec.ts
test('home answers with CSP', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-security-policy']).toContain("default-src 'none'");
  await expect(page).toHaveTitle('Vincent Nadoll');
});
```

- [ ] **Step 6: Prüfen, dass der Test fehlschlagen kann**

Erwarteten Titel kurz auf `'Falsch'` ändern.
Run: `fnm exec --using=26 -- npm run test:e2e; echo "exit=$?"`
Expected: FAIL in beiden Projekten mit Abweichung beim Titel, `exit=1`, danach läuft kein Container mehr (`docker compose -f e2e/compose.yaml ps` leer). Titel zurücksetzen.

- [ ] **Step 7: Test grün**

Run: `fnm exec --using=26 -- npm run test:e2e; echo "exit=$?"`
Expected: `2 passed`, `exit=0`.

- [ ] **Step 8: Argumente kommen an**

Run: `fnm exec --using=26 -- npm run test:e2e -- --project=desktop`
Expected: `1 passed`.

- [ ] **Step 9: Seite unverändert**

`.gitignore` bekommt `test-results/` und `playwright-report/`. `.dockerignore` bekommt `e2e/`. `src/styles/tw.css` bekommt `@source not "../../e2e";` neben den bestehenden Ausschlüssen.
Run: `fnm exec --using=26 -- npm run build` vor und nach der Änderung, jeweils `shasum dist/_astro/*.css`.
Expected: gleiche Prüfsumme.

- [ ] **Step 10: Commit**

```
Add Playwright test setup against Docker image
```
Body: Warum gegen das Image getestet wird (nginx, CSP, Docker-Updates), warum ein eigenes Paket (kein Release bei Playwright-Updates) und dass die Image-Version aus dem Lockfile kommt.

---

### Task 2: Funktionale Tests aller Seiten

**Files:**
- Modify: `e2e/tests/pages.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect` aus `e2e/tests/fixtures.ts`, `npm run test:e2e` aus Task 1.

- [ ] **Step 1: Tests schreiben**

| Test | Assertions |
|-|-|
| `each page answers with CSP and heading` | Für `/`, `/cv/`, `/pgp-keys/`: Status 200, CSP-Header enthält `default-src 'none'`. Titel `Vincent Nadoll`, `Vincent Nadoll • Lebenslauf`, `Vincent Nadoll • PGP Keys`. Sichtbare `h1`: `Vincent Nadoll`, `Lebenslauf`, `Vincent Nadoll`. |
| `home links point to profiles` | Links per Rolle und Name mit `href`: GitHub `https://github.com/V1ncNet`, Instagram `https://www.instagram.com/vinado95/`, Mastodon `https://masto.ai/@vinado`, Steam `https://steamcommunity.com/id/V1ncNet`, Sing @ Kammerchor Wernigerode `https://kammerchor-wernigerode.de`, Code open-source software `https://github.com/V1ncNet`, Telegram `https://t.me/vinado`, Matrix `https://matrix.to/#/@vinado:matrix.org`, Discord `https://discord.com/users/v1nad0`. |
| `home renders icons` | `i.fa-fw` hat Count 0, `svg.svg-inline--fa` hat mindestens 10 Treffer. |
| `email button reveals mailto link` | Button `Show email` sichtbar, Klick darauf, danach Count 0. Dann ein einziges `page.evaluate`. Es prüft, ob `document.activeElement` ein `a` mit `href` passend zu `/^mailto:[^@]+@[^@]+$/` ist, entfernt das Element und gibt nur das Boolean zurück. `expect(revealed).toBe(true)`. Kein Locator berührt den Link. |
| `cv shows all sections` | `h2`: `Berufserfahrung`, `Ausbildung`, `Kenntnisse und Fähigkeiten`, `Engagement`. |
| `pgp page shows key` | Text `1E9C 28E5 6E4F C136 ED7F 8DB8 B921 02E5 8DC1 9C84` sichtbar. Text `curl https://vinado.de/pgp_keys.asc | gpg --import` sichtbar. `request.get('/pgp_keys.asc')` hat Status 200, Body beginnt mit `-----BEGIN PGP PUBLIC KEY BLOCK-----`. |
| `footer links lead to pages` | Für `PGP Keys` → `/pgp-keys/`, `CV` → `/cv/`, `Homepage` → `/`: jeweils frisches `goto('/')`, Klick, `page.waitForURL`. Status ≥ 400 fängt die Fixture. |
| `static assets answer` | `request.get` mit Status 200 für `/robots.txt`, `/humans.txt`, `/site.webmanifest`, `/favicon.ico`, `/sitemap-index.xml`. |

- [ ] **Step 2: Fehlschlag prüfen**

In `public/reveal-email.js` kurz `button.hidden = false;` auskommentieren.
Run: `fnm exec --using=26 -- npm run test:e2e`
Expected: FAIL in `email button reveals mailto link`. Danach `git checkout public/reveal-email.js`.

- [ ] **Step 3: Kein Leak im Report**

Im Test kurz `toBe(false)` erwarten. Die echte Adresse nur zur Prüfungszeit in eine Shell-Variable dekodieren, nie ausgeben und nie committen. Ein Grep nach `mailto:` taugt nicht, denn der Report zitiert die Regex aus dem Testcode.
Run:
```sh
fnm exec --using=26 -- npm run test:e2e
addr=$(node -e 'const s=require("fs").readFileSync("public/reveal-email.js","utf8");const k=s.match(/KEY = "(\w+)"/)[1];const a=JSON.parse(s.match(/ENCODED_ADDRESS = (\[[^\]]+\])/)[1]);process.stdout.write(String.fromCharCode(...a.map((c,i)=>c^k.charCodeAt(i%k.length))))')
grep -rlF "$addr" e2e/test-results; echo "exit=$?"
```
Der HTML-Report bettet seine Daten als base64-Zip in `e2e/playwright-report/index.html` ein. Der Builder extrahiert dieses Zip in ein leeres Temp-Verzeichnis und sucht dort ebenfalls mit `grep -rlF "$addr"`.
Expected: FAIL im Test. Beide `grep` finden nichts (Exit-Code 1). Assertion zurücksetzen, Temp-Verzeichnis löschen.

- [ ] **Step 4: Alles grün**

Run: `fnm exec --using=26 -- npm run test:e2e`
Expected: alle Tests in beiden Projekten `passed`.

- [ ] **Step 5: Commit**

```
Cover pages, links and assets with tests
```

---

### Task 3: Screenshot-Tests

**Files:**
- Create: `e2e/tests/visual.spec.ts`

**Interfaces:**
- Consumes: Fixtures und Projekte aus Task 1.
- Produces: Referenzbilder `e2e/tests/__screenshots__/{home,cv,pgp-keys}-{desktop,mobile}.png`, sechs Stück.

- [ ] **Step 1: Test schreiben**

`e2e/tests/visual.spec.ts` überspringt die ganze Datei mit `test.skip(!process.env.CI, 'Screenshots are compared on the amd64 CI runner only')`. Pro Seite ein Test `<name> looks unchanged`, Namen `home`, `cv`, `pgp-keys`:
- Vor dem Screenshot `await page.evaluate(() => document.fonts.ready)` und warten, bis `i.fa-fw` den Count 0 hat.
- `await expect(page).toHaveScreenshot('<name>.png', { fullPage: true, mask: [page.locator('footer')], animations: 'disabled', scale: 'css' })`.
- Kein Screenshot-Test klickt den E-Mail-Button.

- [ ] **Step 2: Lokaler Lauf**

Run: `fnm exec --using=26 -- npm run test:e2e`
Expected: Tests aus Task 2 `passed`, sechs Screenshot-Tests `skipped`.

- [ ] **Step 3: `CI` kommt im Container an**

Run: `CI=1 fnm exec --using=26 -- npm run test:e2e`
Expected: FAIL der sechs Screenshot-Tests mit „A snapshot doesn't exist … writing actual“. Die lokalen Bilder sind arm64 und werden nicht committet. Danach `rm -rf e2e/tests/__screenshots__`.

- [ ] **Step 4: Commit**

```
Compare page screenshots in CI
```
Body: Warum nur in der CI (arm64 und amd64 rendern verschieden).

---

### Task 4: CI-Workflow, Release-Filter und Dependabot

**Files:**
- Create: `.github/workflows/e2e.yml`, `e2e/README.md`
- Modify: `.github/workflows/deploy.yml`, `.github/dependabot.yml`

**Interfaces:**
- Consumes: `npm run test:e2e`, `e2e/test-results/results.json`, `e2e/tests/__screenshots__/`.
- Produces: Artefakte `playwright-report` und `screenshots`. Input `update-snapshots` (boolean, Standard `false`) für `workflow_dispatch`.

- [ ] **Step 1: `e2e.yml` schreiben**

- Auslöser `pull_request` mit `paths`: `src/**`, `public/**`, `e2e/**`, `package.json`, `package-lock.json`, `astro.config.mjs`, `tsconfig.json`, `Dockerfile`, `.dockerignore`, `.github/workflows/e2e.yml`. Dazu `workflow_dispatch` mit Input `update-snapshots`.
- `permissions: contents: read`. `concurrency` je Ref mit `cancel-in-progress: true`. Job auf `ubuntu-latest`, `timeout-minutes: 15`, `env: CI: true`.
- Checkout mit derselben SHA wie in `deploy.yml`, `persist-credentials: false`. Kein `setup-node`, der Runner hat Node.
- Testschritt `npm run test:e2e`, mit `-- --update-snapshots`, wenn der Input gesetzt ist. Den Input über `env` übergeben, nicht per `${{ }}` im Script.
- Danach ein Schritt mit `if: always()`: `jq -e '.stats.skipped == 0' e2e/test-results/results.json`.
- `actions/upload-artifact`, auf SHA gepinnt. `playwright-report` aus `e2e/playwright-report/` mit `if: failure()`. `screenshots` aus `e2e/tests/__screenshots__/` mit `if: failure() || inputs.update-snapshots`.

- [ ] **Step 2: `deploy.yml` anpassen**

`paths-ignore` bekommt `e2e/**` und `.github/workflows/e2e.yml`.

- [ ] **Step 3: Dependabot anpassen**

Zweiter Eintrag `package-ecosystem: npm`, `directory: /e2e`, wöchentlich, `cooldown.default-days: 7`, Gruppe `e2e` mit `patterns: ["*"]`.

- [ ] **Step 4: `e2e/README.md` schreiben**

Englisch, kurz, mit dem Skill `unslop`. Inhalt:
- Lokal laufen die Tests mit `npm run test:e2e`. Voraussetzung ist Docker.
- Screenshots vergleicht nur die CI.
- Referenzbilder aktualisieren: Diff im Report prüfen, `gh workflow run e2e.yml --ref <branch> -f update-snapshots=true`, `gh run download <run-id> -n screenshots -D e2e/tests/__screenshots__`, committen, pushen.
- Bis `e2e.yml` auf `main` liegt, kommen fehlende Bilder aus dem Artefakt `screenshots` des roten Laufs.

- [ ] **Step 5: Workflows prüfen**

Run: `docker run --rm -v "$PWD:/src" -w /src ghcr.io/zizmorcore/zizmor .github/workflows/`
Expected: keine Funde der Stufe medium oder höher.

- [ ] **Step 6: Commit**

```
Run end-to-end tests on site-related PRs
```
Body: Pfadfilter, warum der Check noch nicht Pflicht ist, eigener Dependabot-Eintrag und Release-Filter.

---

### Task 5: PR und erste Referenzbilder

**Files:**
- Create: `e2e/tests/__screenshots__/*.png` (sechs Stück)

- [ ] **Step 1: Push freigeben lassen**

Per `AskUserQuestion` fragen, ob der Branch gepusht und ein PR geöffnet werden darf. Ohne Ja geht es nicht weiter.

- [ ] **Step 2: PR öffnen**

Branch pushen, PR per `gh pr create` mit Beschreibung nach `unslop`, danach `link_pull_request`.
Expected: `e2e.yml` wird rot, weil die Referenzbilder fehlen, und lädt das Artefakt `screenshots` hoch.

- [ ] **Step 3: Bilder holen und prüfen**

Run: `gh run download <run-id> -n screenshots -D e2e/tests/__screenshots__`
Expected: sechs PNGs. Jedes ansehen: Icons da, Footer maskiert, Layout plausibel. Bei Zweifeln Vincent zeigen.

- [ ] **Step 4: Commit**

```
Add reference screenshots for pages
```

- [ ] **Step 5: Push und Stabilität**

Push nach Vincents Ja aus Step 1. Den grünen Lauf danach zweimal per `gh run rerun <run-id>` wiederholen.
Expected: dreimal grün in `e2e.yml`, inklusive `jq`-Schritt. `deploy.yml` grün.
