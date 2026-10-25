# CV-Seite, E-Mail-Schutz und Supply-Chain-Härtung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die CV-Seite verliert Bootstrap, die E-Mail-Adresse erscheint erst nach Klick, und Pipeline, Image und Repo werden gegen Supply-Chain-Angriffe gehärtet.

**Architecture:** Drei Teile, drei Branches, drei PRs in der Reihenfolge #7, #6, #5. Jeder Teil zweigt vom `main` ab, auf dem der vorige PR gemergt ist. Die CSP in Teil C setzt voraus, dass A und B keine fremden Origins und kein `document.write` mehr übrig lassen. Repo-Einstellungen und das Release `v1.6.0` folgen nach dem letzten Merge.

**Tech Stack:** Astro 7, Tailwind CSS 4, nginx-unprivileged, Docker, GitHub Actions, Dependabot, npm 11

**Spec:** `docs/superpowers/specs/2026-10-25-cv-mail-supply-chain-design.md`

## Global Constraints

- Jeder Commit baut: `fnm exec --using=26 -- npm ci && fnm exec --using=26 -- npm run build -- --site=https://vinado.de` endet mit `[build] Complete!`.
- Jedes `npm`, `npx` und `node` läuft als `fnm exec --using=26 -- <cmd>`.
- `package-lock.json` entsteht nur durch npm-Befehle, nie von Hand.
- Das Repo hat kein Test-Framework, und dieser Plan führt keins ein. Geprüft wird mit Build, `grep` auf `dist/`, Screenshots, PDF und Browser-Checks gegen `npm run preview` (Port 4321) oder das Docker-Image.
- Screenshots: `fnm exec --using=26 -- npx -y playwright@1.64.1 screenshot --full-page --color-scheme=<light|dark> --viewport-size=<w,h> <url> <datei>`. PDF: `fnm exec --using=26 -- npx -y playwright@1.64.1 pdf --paper-format=A4 <url> <datei>`. Ergebnisse liegen im Scratchpad der Session, nicht im Repo.
- Docker-Build lokal nur mit `--build-arg SITE=https://vinado.de`.
- Inhalte der Seiten ändern sich nicht. `noindex` und `lang="de"` auf `/cv/` bleiben.
- Commits englisch nach Chris Beams, atomar, ohne Hinweis auf Plan oder Agents. Trailer wie von der ausführenden Session vorgegeben.
- PRs werden mit Merge-Commit gemergt. Gemergt wird erst nach Zustimmung des Maintainers.
- Neue Actions werden auf Commit-SHA gepinnt, mit Versionskommentar `# vX.Y.Z`. Den SHA liefert `gh api repos/<owner>/<repo>/git/ref/tags/<tag> --jq .object.sha`. Bei annotierten Tags muss man noch einmal auflösen.

## Review Focus

1. **Lange Namen am Desktop.** Ein Eintrag wie „Maritim Hotel & Internationales Congress Center Dresden“ darf den Zeitraum nicht überdecken. Der Zeitraum rutscht über den Namen. Prüfung in Task 1, Screenshot 1440 px.
2. **Druck im Dark Mode.** Ein Ausdruck aus einem Browser im Dark Mode ist trotzdem schwarz auf Weiß. Prüfung in Task 1 mit einem PDF bei `--color-scheme=dark`.
3. **Tastatur und Screenreader beim E-Mail-Button.** Ein Druck auf Enter löst ihn aus, und danach liegt der Fokus auf dem `mailto:`-Link. Prüfung in Task 2.
4. **CSP auf allen Seiten im Image.** Auch `/cv/`, `/pgp-keys/` und die 404-Antwort tragen den Header. Die drei Seiten laden ohne CSP-Verletzung in der Konsole. Prüfung in Task 7.
5. **PR-Läufe ohne Secrets.** Ein PR-Lauf baut weiter grün, obwohl er das Environment nicht betritt und keine Secrets sieht. Prüfung in Task 6 über den PR-Lauf.

---

## Teil A: CV-Seite ohne Bootstrap (#7)

Branch `replace-bootstrap-on-cv` von `main`.

### Task 1: CV-Seite auf Tailwind und eigenes CSS umstellen

**Files:**
- Modify: `src/pages/cv.astro`
- Modify: `public/humans.txt` (Zeile `Components:`)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `src/styles/tw.css` und darin `base.css` mit den Variablen `--white`, `--dark`, `--gray-dark`, `--font-family-sans-serif`
- Produces: `/cv/` ohne fremde Origin. Teil C verlässt sich darauf.

**Entscheidungen:**
- Die Seite behält ihr eigenes Gerüst und zieht nicht auf `Main.astro` um. `Main.astro` bringt Header, Footer, StuckPixel, FontAwesome, `lang="en"` und Pflicht-Props für Meta-Tags mit, die die CV-Seite alle nicht will.
- `import "../styles/tw.css";` im Frontmatter. Der `<body>` bekommt `font-light text-base md:text-xl leading-normal!` wie in `Main.astro`. Schrift, Text- und Hintergrundfarbe setzt ein eigener `body`-Block mit denselben Variablen wie in `Main.astro`.
- Breakpoint für zwei Spalten ist `lg` (1024 px).
- Ein gemeinsames Grid über alle Abschnitte: `grid-template-columns: min-content minmax(0, 1fr)`. Jeder Abschnitt hat `display: contents`. So ist die Titelspalte überall gleich breit, und Titel brechen nur zwischen Wörtern.
- Jeder Eintrag beginnt mit einer Kopfzeile aus Name und Zeitraum, als Flexbox mit `justify-content: space-between`. Am Desktop gilt `flex-wrap: wrap-reverse`, damit ein umbrechender Zeitraum über den Namen rutscht. Auf dem Handy und im Druck gilt `flex-wrap: wrap`, und der Zeitraum hat `order: -1; flex-basis: 100%`. Der Zeitraum hat `white-space: nowrap`. Die Rolle folgt in der nächsten Zeile. Zusätze wie „(ehem. Studenteninitiative IZ e.V.)“ gehören zum Namen.
- `@media print` schaltet dasselbe Zwei-Spalten-Grid ein wie `lg`. Jeder Eintrag bekommt `break-inside: avoid`.
- Farben: Abschnittstitel `var(--dark)`, Zeitraum `var(--gray-dark)`. Die Werte `#37474f` und `var(--secondary)` entfallen.
- „Kenntnisse und Fähigkeiten“: zwei Unterspalten mit `grid grid-cols-2` auf allen Breiten.
- Die Regeln für `h1`, `h2` und `ul` aus dem heutigen `<style>`-Block bleiben sinngemäß erhalten. `.border-dotted` und `div.border-bottom.border-dotted` entfallen.

- [ ] **Step 1: Baseline-Bilder vom heutigen Stand erzeugen**

Auf `main` bauen, `npm run preview` starten. Danach `/cv/` hell und dunkel bei `390,844` und `1440,900` aufnehmen und ein A4-PDF hell erzeugen. Dateien `cv-before-*.png` und `cv-before.pdf`.

- [ ] **Step 2: `src/pages/cv.astro` nach den Entscheidungen oben umbauen**

Der `<link>` auf jsDelivr und alle Bootstrap-Klassen (`container`, `row`, `col`, `col-lg-3`, `col-lg-9`, `position-relative`) verschwinden.

- [ ] **Step 3: In `public/humans.txt` „Bootstrap“ aus `Components:` streichen**

- [ ] **Step 4: Bauen und auf Reste prüfen**

Run: `fnm exec --using=26 -- npm run build -- --site=https://vinado.de && grep -c 'jsdelivr\|bootstrap\|col-lg' dist/cv/index.html`
Expected: Build endet mit `[build] Complete!`, `grep` gibt `0` aus.

- [ ] **Step 5: Bilder vom neuen Stand erzeugen und selbst prüfen**

Dieselben vier Screenshots wie in Step 1 als `cv-after-*.png`. Dazu zwei PDFs, `cv-after-light.pdf` und `cv-after-dark.pdf` mit `--color-scheme=dark`. Prüfen:
- Bei 1440 px überdeckt kein Zeitraum Text. Der Eintrag „Maritim Hotel & Internationales Congress Center Dresden“ zeigt den Zeitraum über dem Namen oder rechts daneben.
- Alle vier Titel beginnen auf derselben x-Position, ihr Inhalt ebenso. „Berufserfahrung“ ist nicht getrennt.
- Bei 390 px steht jeder Zeitraum über seinem Namen.
- Beide PDFs sind zweispaltig, schwarz auf Weiß, mit dem Zeitraum über dem Namen. Kein Eintrag ist über zwei Seiten getrennt.
- Dunkel bei 1440 px: alle Texte sind lesbar.

- [ ] **Step 6: Bilder dem Maintainer zur Abnahme vorlegen**

Vorher und nachher nebeneinander zeigen, dazu die Pfade der PDFs nennen. Erst nach seinem Ok weitermachen. Wünscht er Änderungen, zurück zu Step 2.

- [ ] **Step 7: Commit für die CV-Seite**

```bash
git add src/pages/cv.astro public/humans.txt
git commit
```
Betreff: `Replace Bootstrap on the CV page with Tailwind`. Der Body erwähnt Dark Mode und Druck auf A4 und schließt mit `Closes #7`.

- [ ] **Step 8: `.superpowers/` in `.gitignore` aufnehmen und separat committen**

Betreff: `Ignore local brainstorming files`

- [ ] **Step 9: Branch pushen und PR öffnen**

Titel `Replace Bootstrap on the CV page with Tailwind`. Die Beschreibung verweist auf #7 und hängt keine Bilder an. Danach auf den Merge durch den Maintainer warten.

---

## Teil B: E-Mail-Adresse nach Klick (#6)

Branch `reveal-email-on-click` vom `main` nach dem Merge von Teil A.

### Task 2: Adresse erst nach Klick zusammensetzen

**Files:**
- Create: `public/reveal-email.js`
- Modify: `src/pages/index.astro:36`
- Delete: `public/encrypted-mail.labeled.js`

**Interfaces:**
- Produces: Die Startseite lädt nur Scripts von der eigenen Origin und hat kein Inline-Script. Teil C verlässt sich darauf.

**Entscheidungen:**
- Das Script liegt in `public/` und wird mit `<script is:inline defer src="/reveal-email.js"></script>` eingebunden, wie die FontAwesome-Scripts. Das Compress-Plugin minifiziert es beim Build. Ein von Astro verarbeitetes `<script>` scheidet aus, denn Astro schreibt kleine Scripts inline ins HTML.
- Das `<li>` enthält das Briefumschlag-Icon, einen `<button type="button">` mit dem Text `Show email` und ein `<noscript>` mit dem Text `Email needs JavaScript. Telegram and Matrix work without it.`. Der Button ist ohne JavaScript per `hidden` verborgen, das Script entfernt `hidden`.
- Der Button sieht aus wie die übrigen Links in der Liste, also ohne Rahmen, ohne Hintergrund, mit geerbter Schrift und Farbe und `cursor: pointer`.
- Klick oder Enter ersetzen den Button durch `<a href="mailto:…">…</a>` mit der Adresse als Text. Der Link bekommt sofort den Fokus. Er hat kein `target="_blank"`.
- Die Adresse ist die aus `public/humans.txt`, Zeile `Contact:`. Task 3 entfernt sie dort erst danach. Im Script steht sie als Zahlenfolge, die mit einem festen Schlüssel per XOR verschlüsselt ist. Entschlüsselt wird erst im Click-Handler. Die Adresse erscheint im Script weder im Klartext noch als Base64.

- [ ] **Step 1: Verschlüsselte Zahlenfolge erzeugen**

Ein Einzeiler mit `node -e` erzeugt die Folge aus Adresse und Schlüssel. Er gehört nicht ins Repo.

- [ ] **Step 2: `public/reveal-email.js` schreiben**

- [ ] **Step 3: `src/pages/index.astro` umstellen und `public/encrypted-mail.labeled.js` löschen**

- [ ] **Step 4: Bauen und auf Klartext prüfen**

Run: `fnm exec --using=26 -- npm run build -- --site=https://vinado.de && grep -rIl 'nadoll@\|document.write' dist; grep -o '<script[^>]*>' dist/index.html | grep -vc 'src='`
Expected: `grep -rIl` meldet nur `dist/humans.txt` (das ändert Task 3). Die Zahl der Inline-Scripts ist `0`.

- [ ] **Step 5: Verhalten im Browser prüfen**

`npm run preview` starten und `http://localhost:4321/` mit Playwright-MCP oder Claude in Chrome öffnen.
- Vor dem Klick enthält das DOM die Adresse nicht. Prüfen mit `document.body.innerHTML.includes("nadoll@")`, Ergebnis `false`.
- Per Tab den Button fokussieren und Enter drücken. Danach ist `document.activeElement` ein `<a>` mit `href` gleich `mailto:` plus der Adresse aus `humans.txt`.
- Bei deaktiviertem JavaScript ist der Button unsichtbar, und der `<noscript>`-Text erscheint.
- Hell und dunkel bei 390 px und 1440 px aufnehmen und auf Optik prüfen: Der Button fällt in der Liste nicht aus der Reihe.

- [ ] **Step 6: Commit**

Betreff: `Reveal the email address only on click`. Der Body nennt den Wegfall von `document.write` und den Vorteil für eine CSP.

### Task 3: Klartext-Adresse aus humans.txt und Docker-Label entfernen

**Files:**
- Modify: `public/humans.txt` (Zeilen `Contact:` und `Last update:`)
- Modify: `Dockerfile:15`

- [ ] **Step 1: `humans.txt` ändern**

`Contact: https://vinado.de` und `Last update: 2026-10-25` (oder das Datum der Umsetzung).

- [ ] **Step 2: Docker-Label ändern**

`LABEL org.opencontainers.image.authors="Vincent Nadoll (https://vinado.de)"`

- [ ] **Step 3: Prüfen**

Run: `fnm exec --using=26 -- npm run build -- --site=https://vinado.de && grep -rIl 'nadoll@' dist Dockerfile public src`
Expected: keine Ausgabe.

- [ ] **Step 4: Commit**

Betreff: `Remove the plain email address from metadata`. Body schließt mit `Closes #6`.

- [ ] **Step 5: Branch pushen und PR öffnen**

Titel `Reveal the email address only on click`. Danach auf den Merge warten.

---

## Teil C: Supply-Chain-Härtung (#5)

Branch `harden-supply-chain` vom `main` nach dem Merge von Teil B.

### Task 4: Install-Scripts festlegen und Signaturen prüfen

**Files:**
- Modify: `package.json`, `package-lock.json` (über npm)
- Modify: `Dockerfile:6`

**Entscheidungen:**
- `esbuild`, `sharp` und `fsevents` werden per `npm install-scripts deny` gesperrt. Heute laufen ihre Scripts schon nicht, der Build bleibt also gleich. Die genaue Syntax liefert `npm install-scripts --help`. Die Entscheidung landet in `package.json` unter `allowScripts`.
- Das `Dockerfile` führt `RUN npm ci && npm audit signatures` aus. Damit prüfen PR- und Tag-Läufe die Signaturen, ohne dass der Workflow Node braucht.

- [ ] **Step 1: Scripts sperren**

Run: `fnm exec --using=26 -- npm install-scripts deny esbuild sharp fsevents`
Expected: Danach meldet `fnm exec --using=26 -- npm ci` keine Warnung `install-scripts` mehr.

- [ ] **Step 2: Signaturprüfung lokal ausführen**

Run: `fnm exec --using=26 -- npm audit signatures`
Expected: Exit-Code 0, Meldung `verified registry signature`.

- [ ] **Step 3: `Dockerfile` anpassen und Image bauen**

Run: `docker build --build-arg SITE=https://vinado.de -t vinado-check .`
Expected: Build erfolgreich, im Log steht die Ausgabe von `npm audit signatures`.

- [ ] **Step 4: `dist/` mit dem Stand vor dem Task vergleichen**

Run: `diff -r <dist vorher> dist`
Expected: keine Unterschiede.

- [ ] **Step 5: Commit**

Betreff: `Deny install scripts and verify registry signatures`

### Task 5: Cooldown für Dependabot

**Files:**
- Modify: `.github/dependabot.yml`

- [ ] **Step 1: Jedem der drei Ökosysteme `cooldown: default-days: 3` geben**

- [ ] **Step 2: YAML prüfen**

Run: `fnm exec --using=26 -- npx -y js-yaml .github/dependabot.yml`
Expected: Das JSON zeigt `cooldown.default-days: 3` in allen drei Einträgen.

- [ ] **Step 3: Commit**

Betreff: `Delay Dependabot updates by three days`. Der Body erklärt, dass schnell entdeckte Schadversionen so meist abgefangen werden und Sicherheitsupdates nicht betroffen sind.

### Task 6: Workflow mit Environment, SBOM, Provenance und PR-Prüfungen

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Entscheidungen:**
- Der Job `build` bekommt `environment: ${{ github.event_name == 'push' && 'docker-hub' || '' }}`. Nur Tag-Läufe betreten damit das Environment `docker-hub`. Blockiert der PR-Lauf deswegen trotzdem oder schlägt fehl, wird der Job in `build` (PR, ohne Login und Push) und `release` (Tag, mit Environment) geteilt. Die Schritte bleiben dabei gleich.
- `docker/build-push-action` bekommt `sbom: true` und `provenance: mode=max`.
- `actions/checkout` bekommt `persist-credentials: false`.
- Neuer Job `zizmor` mit `zizmorcore/zizmor-action`, `advanced-security: false`, nur bei `pull_request`. Er scheitert bei jedem Finding. Heutige Findings werden behoben. Eine Unterdrückung ist nur mit Begründung im Kommentar erlaubt.
- Neuer Job `dependency-review` mit `actions/dependency-review-action`, `fail-on-severity: high`, nur bei `pull_request`. Eine Lizenz-Policy gibt es nicht.
- Beide neuen Jobs laufen parallel zu `build` und erben `permissions: contents: read`.

- [ ] **Step 1: SHAs der neuesten Releases von `zizmorcore/zizmor-action` und `actions/dependency-review-action` ermitteln**

- [ ] **Step 2: `deploy.yml` nach den Entscheidungen oben ändern**

- [ ] **Step 3: Lokal mit zizmor prüfen**

Run: `uvx zizmor .github/workflows/deploy.yml` (ohne `uv` geht auch `pipx run zizmor`)
Expected: `No findings`

- [ ] **Step 4: Commit**

Betreff: `Harden the release workflow`. Der Body nennt das Environment, SBOM und Provenance sowie die zwei PR-Prüfungen.

### Task 7: Content Security Policy in nginx

**Files:**
- Modify: `Dockerfile` (nginx-Konfiguration im `RUN`-Block der zweiten Stage)

**Entscheidungen:**
- Der Header steht im `server`-Block mit `always`, damit er auch für Fehlerseiten gilt. Er steht nicht in `location /`. Verschachtelte Locations mit eigenem `add_header`, etwa für CSS und JS, erben ihn nicht, aber dort ist er auch wirkungslos.
- Die Policy:

```
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

- `'unsafe-inline'` gilt nur für Styles. FontAwesome fügt zur Laufzeit ein `<style>` ein, und Astro schreibt kleine Stylesheets inline. Beides per Hash abzusichern ist brüchig, denn jeder Build oder jedes FA-Update kann den Hash ändern. Scripts bleiben strikt `'self'`.
- Meldet die Konsole eine Verletzung, wird die Policy nur um genau die gemeldete Quelle erweitert, und die Ursache steht im Commit-Body.

- [ ] **Step 1: Header ergänzen und Image bauen**

Run: `docker build --build-arg SITE=https://vinado.de -t vinado-check . && docker run -d --rm -p 8080:8080 --name vinado-check vinado-check`

- [ ] **Step 2: Header auf allen Pfaden prüfen**

Run: `for p in / /cv/ /pgp-keys/ /does-not-exist; do curl -sI localhost:8080$p | grep -ci content-security-policy; done`
Expected: viermal `1`.

- [ ] **Step 3: Konsole auf Verletzungen prüfen**

Die drei Seiten aus dem Container im Browser öffnen. Auf der Startseite zusätzlich den E-Mail-Button klicken.
Expected: keine Meldung `Content-Security-Policy` in der Konsole. Icons, Styles und der Button funktionieren. Bei 1440 px hell sieht jede Seite aus wie ohne Policy. Zum Vergleich dient ein Image vom Stand vor diesem Task.

- [ ] **Step 4: Container stoppen und committen**

Betreff: `Serve a Content Security Policy`

### Task 8: Version 1.6.0 und PR

**Files:**
- Modify: `package.json`, `package-lock.json` über `fnm exec --using=26 -- npm version 1.6.0 --no-git-tag-version`

- [ ] **Step 1: Version setzen und committen**

Betreff: `Update homepage to version 1.6.0`, wie bei `v1.5.0`.

- [ ] **Step 2: Branch pushen und PR öffnen**

Titel `Harden the supply chain`. Die Beschreibung schließt #5 und nennt die Einstellungen aus Task 9, die nach dem Merge folgen.

- [ ] **Step 3: PR-Lauf prüfen**

Run: `gh pr checks --watch`
Expected: `build`, `zizmor` und `dependency-review` sind grün. `build` wartet nicht auf eine Freigabe des Environments. Die bekannten Warnungen „No Docker image version has been generated“ und „No output specified“ sind in Ordnung.

- [ ] **Step 4: Auf den Merge durch den Maintainer warten**

---

## Nach dem Merge

### Task 9: Repo-Einstellungen, Release und Tag-Ruleset

Jede Änderung an Einstellungen erst nach Rückfrage beim Maintainer. Er setzt die Secret-Werte selbst.

- [ ] **Step 1: Secret Scanning, Push Protection und Dependabot Security Updates einschalten**

Run: `gh api -X PATCH repos/V1ncNet/vinado.de -f 'security_and_analysis[secret_scanning][status]=enabled' -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'` und `gh api -X PUT repos/V1ncNet/vinado.de/automated-security-fixes`
Expected: `gh api repos/V1ncNet/vinado.de --jq .security_and_analysis` zeigt alle drei als `enabled`.

- [ ] **Step 2: Ruleset für `main` anlegen**

Ziel `refs/heads/main`, Regeln `deletion` und `non_fast_forward`, keine Bypass-Liste nötig. Expected: `gh api repos/V1ncNet/vinado.de/rulesets` listet es mit `enforcement: active`.

- [ ] **Step 3: Environment `docker-hub` anlegen**

Deployment-Policy: nur Tags `v*` (`deployment_branch_policy` mit `custom_branch_policies: true`, dann eine Policy `{"name":"v*","type":"tag"}`). Keine Reviewer.

- [ ] **Step 4: Maintainer setzt die Secrets im Environment**

Der Maintainer führt `gh secret set DOCKERHUB_USERNAME --env docker-hub` und `gh secret set DOCKERHUB_TOKEN --env docker-hub` aus. Danach prüft er in Docker Hub, ob sein Plan einen Token erlaubt, der nur auf `vinado/vinado.de` schreibt. Wenn ja, erzeugt er einen solchen Token und setzt ihn stattdessen.

- [ ] **Step 5: Tag `v1.6.0` erstellen und pushen**

Auf dem Merge-Commit, annotiert und GPG-signiert, Nachricht `Harden the supply chain`. Run: `gh run watch` auf den Tag-Lauf.
Expected: Der Lauf betritt `docker-hub`, pusht `1`, `1.6` und `1.6.0`, und `docker buildx imagetools inspect vinado/vinado.de:1.6.0 --format '{{ json .SBOM }}'` liefert ein SBOM. Scheitert der Lauf, den Fehler beheben und den Tag neu setzen. Das ist erlaubt, solange das Tag-Ruleset noch fehlt.

- [ ] **Step 6: Repo-Secrets entfernen**

Run: `gh secret delete DOCKERHUB_USERNAME` und `gh secret delete DOCKERHUB_TOKEN`
Expected: `gh secret list` ist leer, `gh secret list --env docker-hub` zeigt beide.

- [ ] **Step 7: Ruleset für Tags `v*` anlegen**

Ziel `refs/tags/v*`, Regeln `deletion`, `non_fast_forward` und `update`. Expected: aktiv in `gh api repos/V1ncNet/vinado.de/rulesets`.

- [ ] **Step 8: Renovate-PR in `V1ncNet/ops-kubernetes` abwarten**

Den Maintainer darauf hinweisen. Gemergt wird von Hand.
