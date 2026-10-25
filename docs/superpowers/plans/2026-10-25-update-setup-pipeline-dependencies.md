# Setup, Pipeline und Dependencies aktualisieren Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Node, IDE-Dateien, LICENSE, Pipeline und alle Dependencies aus Issue #3 auf einen aktuellen Stand bringen, ohne dass sich die ausgelieferte Website sichtbar ändert.

**Architecture:** Jede Änderung ist ein eigener Commit, der für sich baut. Node kommt zuerst, weil Astro 7 Node ≥ 22.23.4 verlangt. Tailwind 4 kommt vor Astro 7, weil `@astrojs/tailwind` nur Astro ≤ 5 erlaubt. Ob sich die Seite verändert, zeigen Screenshots gegen eine Baseline vom heutigen `main`.

**Tech Stack:** Astro, Tailwind CSS, Node, Docker (nginx-unprivileged), GitHub Actions, Dependabot

**Spec:** GitHub Issue #3 „Setup, Pipeline und Dependencies aktualisieren“ (`gh issue view 3`). Ein separates Design-Dokument gibt es nicht.

## Entscheidungen außerhalb des Issues

Diese Punkte lässt das Issue offen. Sie sind hier entschieden.

- **Node 26 statt Node 24.** Node 26 wird am 2026-10-28 LTS. Image `node:26.12.1-alpine3.24`, `.nvmrc` enthält `26`. Gibt es bei der Umsetzung einen neueren 26.x-Patch auf Docker Hub, wird der genommen.
- **`.idea` fliegt aus dem Repo** und kommt in `.gitignore`. `.vscode` bleibt, denn es enthält nur die Astro-Empfehlung und eine Launch-Konfiguration, die jedem VS-Code-Nutzer hilft.
- **Copyright auf der Website ist schon da.** `src/components/Footer.astro` zeigt `© {year}` mit dem Baujahr. Dafür gibt es keinen Task.
- **LICENSE** bekommt den Zeitraum `2024-2026`.
- **Tailwind ohne Preflight**, wie bisher mit `applyBaseStyles: false`. `tailwind.config.cjs` entfällt. Die Footer-Höhen werden zu Arbitrary Values.
- **`compressHTML: true`** in Astro 7, damit Whitespace zwischen Inline-Elementen erhalten bleibt wie in Astro 5.
- **`astro-robots-txt` fliegt raus.** Das Paket ist seit 2023 ungepflegt und bringt Zod 3 neben Astros Zod 4 mit. Eine statische `public/robots.txt` ersetzt es. Die Sitemap-URL `https://vinado.de` steht damit fest in der Datei. Das ist die einzige `SITE`, die die Pipeline übergibt.
- **Runner bleibt `ubuntu-latest`.** Der Job baut nur ein Docker-Image und hängt nicht von Ubuntu-Paketen ab.
- **PR-CI im bestehenden `deploy.yml`.** Bei Pull Requests wird gebaut, aber weder eingeloggt noch gepusht.
- **Dependabot statt Renovate.** Dependabot ist in GitHub eingebaut und braucht nur eine Datei. Node-Majors sind ausgenommen, denn die LTS wird von Hand gewählt.
- **Alles gepinnt.** Actions auf Commit-SHA mit Versionskommentar, das Node-Image auf Tag plus Digest wie schon nginx. Dependabot hält beides aktuell.
- **`npm ci` im Image**, damit das Image genau das Lockfile baut.
- **Tailwind scannt `docs/` und `public/` nicht**, damit Klassennamen aus Plan und FontAwesome kein ungenutztes CSS erzeugen.

## Global Constraints

- Jeder Commit baut: `npm ci && npm run build -- --site=https://vinado.de` endet mit `[build] Complete!`.
- Shell-State überlebt keinen Aufruf. Jedes `npm`, `npx` und `node` läuft deshalb als `fnm exec --using=26 -- <cmd>`, ab Task 1. Task 0 nutzt `--using=22`. Einmalig vorher `fnm install 26` und `fnm install 22`. Ausgenommen sind reine Werkzeugaufrufe mit `npx -y` (Playwright, js-yaml), die mit der fnm-Default-Version laufen.
- `package-lock.json` entsteht nur durch `npm install`/`npm uninstall`, nie von Hand.
- Commit-Messages englisch nach Chris Beams, Trailer wie von der ausführenden Session vorgegeben.
- Code und Commits erwähnen weder Plan noch Agents.
- Branch `update-setup-pipeline-dependencies`, abgezweigt von `main`.

## Review Focus

1. **Unlayered CSS schlägt Utilities.** Tailwind 4 nutzt Cascade Layers. Liegt `base.css` außerhalb eines Layers, gewinnt `p { margin-bottom: 1rem }` gegen `m-0` im Footer. Erwartet wird kein Abstand unter dem Footer-Absatz. Abgedeckt in Task 4 durch `layer(base)` und den Screenshot-Vergleich.
2. **Whitespace zwischen Inline-Elementen.** Die Trenner `</a> |` und `&copy; {year}&nbsp;` im Footer dürfen nicht zusammenkleben. Abgedeckt in Task 6 durch `compressHTML: true` und einen `grep`.
3. **Container ohne Zentrierung.** Tailwind 4 kennt `center: true` nicht. Erwartet wird ein zentrierter Inhalt auf Desktop-Breite. Abgedeckt in Task 4 durch `@utility container` und Screenshots bei 1440 px.
4. **Dark Mode.** Die Farben hängen an `prefers-color-scheme`. Erwartet wird dasselbe dunkle Bild wie heute. Abgedeckt durch Screenshots mit `--color-scheme=dark` in Task 4, 6 und 7.
5. **Pull Requests pushen nichts.** Ein PR-Lauf darf weder Secrets brauchen noch ein Image nach Docker Hub schieben. Abgedeckt in Task 9 durch die Bedingungen und den ersten PR-Lauf.

## Screenshot-Check

Task 0 legt die Baseline an. Task 4, 6, 7 und 11 vergleichen dagegen. Das Skript gehört nicht ins Repo. Es liegt außerhalb, etwa unter `$TMPDIR/shots.sh`.

```bash
#!/usr/bin/env bash
set -euo pipefail
out=${1:?output dir}; base=${2:-http://localhost:4321}
mkdir -p "$out"
for page in index pgp-keys cv; do
  path=$([ "$page" = index ] && echo "" || echo "$page/")
  for scheme in light dark; do
    for vp in 390,844 1440,900; do
      npx -y playwright@1.64.1 screenshot --full-page --color-scheme="$scheme" \
        --viewport-size="$vp" "$base/$path" "$out/$page-$scheme-$vp.png"
    done
  done
done
```

Vergleich: `for f in $BASE/*.png; do echo "$(basename $f) $(magick compare -metric AE $f $NEW/$(basename $f) null: 2>&1)"; done`. Erwartet wird `0` für jede Datei. Ein Wert über 0 wird mit `magick compare $a $b diff.png` angesehen und erklärt, bevor es weitergeht.

Der Server für den Vergleich ist `npm run build -- --site=https://vinado.de && npm run preview`.

---

### Task 0: Branch und Baseline

**Files:** keine im Repo

- [ ] **Step 1:** `git switch -c update-setup-pipeline-dependencies main`
- [ ] **Step 2:** `fnm exec --using=22 -- sh -c 'node -v && npm ci && npm run build -- --site=https://vinado.de'`. Erwartet: `v22.` und `[build] Complete!`
- [ ] **Step 3:** `cp -R dist $TMPDIR/dist-baseline`
- [ ] **Step 4:** `npx -y playwright@1.64.1 install chromium`, dann `npm run preview` im Hintergrund und `shots.sh $TMPDIR/shots-baseline`. Erwartet: 12 PNG-Dateien
- [ ] **Step 4b:** `shots.sh $TMPDIR/shots-baseline2` und Vergleich gegen `shots-baseline`. Erwartet: `0` für alle 12 Dateien. Sonst in `shots.sh` `--wait-for-timeout=1500` ergänzen, denn FontAwesome lädt per `defer` und `/cv/` holt Bootstrap vom CDN. Danach beide Baselines neu erzeugen und erneut vergleichen
- [ ] **Step 5:** Den Plan committen: `git add docs/superpowers/plans && git commit -m "Add plan for updating setup and dependencies"`

### Task 1: Node 26

**Files:**
- Modify: `Dockerfile:1,6`
- Modify: `.nvmrc`

- [ ] **Step 1:** Digest holen: `docker buildx imagetools inspect node:26.12.1-alpine3.24 --format '{{json .Manifest.Digest}}'`. `Dockerfile` Zeile 1 wird `FROM --platform=$BUILDPLATFORM node:26.12.1-alpine3.24@sha256:<digest> AS builder`
- [ ] **Step 2:** `.nvmrc` enthält genau `26`
- [ ] **Step 3:** `fnm exec --using=26 -- sh -c 'node -v && npm ci && npm run build -- --site=https://vinado.de'`. Erwartet: `v26.` und `[build] Complete!`
- [ ] **Step 4:** `docker build --build-arg SITE=https://vinado.de -t vinado-test .`. Erwartet: Exit 0
- [ ] **Step 5:** Commit `Build with Node 26`. Der Body nennt den LTS-Start am 2026-10-28.
- [ ] **Step 6:** `Dockerfile` Zeile 6 wird `RUN npm ci`
- [ ] **Step 7:** `docker build --build-arg SITE=https://vinado.de -t vinado-test .`. Erwartet: Exit 0
- [ ] **Step 8:** Commit `Install exact lockfile versions in the image`. Der Body erklärt, dass `npm install` neuere Versionen auflösen kann als lokal getestet.

### Task 2: JetBrains-Dateien

**Files:**
- Delete from index: `.idea/`
- Modify: `.gitignore`

- [ ] **Step 1:** `git rm -r --cached .idea`
- [ ] **Step 2:** In `.gitignore` einen Block `# JetBrains IDEs` mit `.idea/` ergänzen, im Stil der vorhandenen Blöcke
- [ ] **Step 3:** `git status --short`. Erwartet: nur gelöschte `.idea`-Dateien und `.gitignore`. `ls .idea` zeigt die Dateien weiterhin lokal
- [ ] **Step 4:** Commit `Stop tracking JetBrains project files`

### Task 3: LICENSE

**Files:**
- Modify: `LICENSE:3`

- [ ] **Step 1:** Zeile 3 wird `Copyright (c) 2024-2026 Vincent Nadoll`
- [ ] **Step 2:** Commit `Extend copyright to 2026`

### Task 4: Tailwind CSS 4

**Files:**
- Delete: `tailwind.config.cjs`
- Modify: `package.json`, `package-lock.json`, `astro.config.mjs`, `src/styles/tw.css`, `src/layouts/Main.astro`, `src/components/Footer.astro`

- [ ] **Step 1:** `npm uninstall @astrojs/tailwind && npm install tailwindcss@^4.3.3 @tailwindcss/vite@^4.3.3`
- [ ] **Step 2:** `git rm tailwind.config.cjs`
- [ ] **Step 3:** In `astro.config.mjs` die `tailwind`-Integration samt Import entfernen. Dazu `import tailwindcss from "@tailwindcss/vite";` und `vite: { plugins: [tailwindcss()] }` in `defineConfig`
- [ ] **Step 4:** `src/styles/tw.css` bekommt genau diesen Inhalt. Die alten `@tailwind`-Zeilen und der `@media`-Block entfallen.

```css
@layer theme, base, components, utilities;

@import "tailwindcss/theme.css" layer(theme);
@import "./base.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);

@source not "../../docs";
@source not "../../public";

@utility container {
  margin-inline: auto;
}

@utility items-unset {
  align-items: unset;
}

@utility pl-inherit {
  padding-left: inherit;
}
```

- [ ] **Step 5:** In `src/layouts/Main.astro` den Import `../styles/base.css` entfernen und `!leading-normal` durch `leading-normal!` ersetzen. Vorher mit `grep -rn base.css src` prüfen, dass kein anderer Ort `base.css` importiert
- [ ] **Step 6:** In `src/components/Footer.astro` `h-40p leading-40p md:h-60p md:leading-60p` durch `h-[40px] leading-[40px] md:h-[60px] md:leading-[60px]` ersetzen
- [ ] **Step 7:** `npm run build -- --site=https://vinado.de`. Erwartet: `[build] Complete!`
- [ ] **Step 8:** Prüfen, dass `base.css` im Layer liegt und der Container zentriert. Astro inlined das CSS heute ins HTML, deshalb wird ganz `dist` durchsucht. `grep -rhoE '@layer base ?\{' dist` und `grep -rc 'margin-inline:auto' dist` liefern je mindestens einen Treffer. Ob der Container wirklich zentriert, belegen erst die Screenshots bei 1440 px in Step 9
- [ ] **Step 9:** `npm run preview`, `shots.sh $TMPDIR/shots-tw4`, Vergleich gegen `shots-baseline`. Erwartet: `0` für alle 12 Dateien
- [ ] **Step 9b:** `docker build --build-arg SITE=https://vinado.de -t vinado-test .`. Erwartet: Exit 0, denn Tailwind 4 bringt native Binaries mit
- [ ] **Step 10:** Commit `Upgrade Tailwind CSS to version 4`. Der Body nennt den Wegfall von `@astrojs/tailwind` und warum `base.css` jetzt im Layer `base` liegt.

### Task 5: @playform/compress 0.2

**Files:**
- Modify: `package.json`, `package-lock.json`, ggf. `astro.config.mjs`

- [ ] **Step 1:** `npm install @playform/compress@^0.2.5`
- [ ] **Step 2:** Im README von 0.2.5 (`npm view @playform/compress readme`) prüfen, ob die Optionen `Image` und `Exclude` noch so heißen. Wenn nicht, `astro.config.mjs` anpassen, mit gleicher Wirkung
- [ ] **Step 3:** `npm run build -- --site=https://vinado.de`. Erwartet: `Successfully compressed` für HTML und JavaScript, `[build] Complete!`
- [ ] **Step 4:** `cmp public/safari-pinned-tab.svg dist/safari-pinned-tab.svg`. Erwartet: keine Ausgabe, denn die Datei ist ausgenommen
- [ ] **Step 5:** `docker build --build-arg SITE=https://vinado.de -t vinado-test .`. Erwartet: Exit 0, denn 0.2 bringt `sharp` mit
- [ ] **Step 6:** Commit `Update @playform/compress to version 0.2`

### Task 6: Astro 7

**Files:**
- Modify: `package.json`, `package-lock.json`, `astro.config.mjs`
- Create: `public/robots.txt`

- [ ] **Step 0a:** Noch unter Astro 5: `npm uninstall astro-robots-txt`, Import und `robotsTxt()` aus `astro.config.mjs` entfernen, `$TMPDIR/dist-baseline/robots.txt` nach `public/robots.txt` kopieren
- [ ] **Step 0b:** Bauen, dann `diff $TMPDIR/dist-baseline/robots.txt dist/robots.txt`. Erwartet: `[build] Complete!` und keine Ausgabe von `diff`
- [ ] **Step 0c:** Commit `Serve robots.txt as a static file`. Der Body nennt das ungepflegte Paket und die fest eingetragene Sitemap-URL.
- [ ] **Step 1:** `npm install astro@^7.4.2 @astrojs/sitemap@^3.7.4`. `npx @astrojs/upgrade` fragt interaktiv nach und ist deshalb nicht vorgesehen
- [ ] **Step 2:** In `astro.config.mjs` `compressHTML: true` auf oberster Ebene von `defineConfig` setzen
- [ ] **Step 3:** `npm run build -- --site=https://vinado.de`. Erwartet: `[build] Complete!`. Fehler des Rust-Compilers (ungeschlossene Tags, falsche Verschachtelung) im Markup beheben. Zuerst `src/pages/pgp-keys.astro:41` ansehen, denn dort steht `set:html` auf einer `<textarea>` mit Whitespace-Kindern. Aus den Upgrade-Guides für v6 und v7 betreffen dieses Repo nur diese Punkte:
  - Node ≥ 22.23.4 (`astro@7.4.2` engines), durch Task 1 erfüllt
  - Vite 7 und 8, `@tailwindcss/vite` erlaubt `^5.2 || ^6 || ^7 || ^8`
  - `<style>` und `<script>` in Quellreihenfolge (v6), unkritisch, weil `base.css` im Layer liegt
  - Rust-Compiler ist strenger (v7)
  - `compressHTML` steht per Default auf `'jsx'` (v7), Step 2 setzt `true`
- [ ] **Step 4:** `diff $TMPDIR/dist-baseline/robots.txt dist/robots.txt`. Erwartet: keine Ausgabe
- [ ] **Step 5:** `diff <(grep -o '<loc>[^<]*' $TMPDIR/dist-baseline/sitemap-0.xml) <(grep -o '<loc>[^<]*' dist/sitemap-0.xml)`. Erwartet: keine Ausgabe
- [ ] **Step 6:** `grep -o 'Vincent Nadoll</a> |' dist/index.html` liefert einen Treffer
- [ ] **Step 7:** `npm run preview`, `shots.sh $TMPDIR/shots-astro7`, Vergleich gegen `shots-baseline`. Erwartet: `0` für alle 12 Dateien
- [ ] **Step 8:** `docker build --build-arg SITE=https://vinado.de -t vinado-test .`. Erwartet: Exit 0
- [ ] **Step 9:** Commit `Upgrade Astro to version 7`. Der Body nennt `compressHTML`.

### Task 7: Lockfile neu erzeugen

**Files:**
- Modify: `package-lock.json`

- [ ] **Step 1:** `rm -rf node_modules package-lock.json && fnm exec --using=26 -- npm install`
- [ ] **Step 2:** `git diff --stat package.json`. Erwartet: keine Änderung
- [ ] **Step 3:** Build, Screenshot-Vergleich und `docker build` wie in Task 6 Step 3, 7 und 8. Erwartet: `[build] Complete!`, `0` für alle 12 Dateien, Exit 0
- [ ] **Step 4:** Commit `Regenerate package-lock.json`. Der Body nennt den Grund: frisch aufgelöste Versionen und native Binaries für alle Plattformen.

### Task 8: Actions auf aktuelle Releases pinnen

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1:** Auf die neuesten Releases pinnen, je als `uses: <owner>/<repo>@<sha> # <tag>`: `actions/checkout` v7.0.1, `docker/setup-qemu-action` v4.4.0, `docker/setup-buildx-action` v4.4.1, `docker/metadata-action` v6.2.0, `docker/login-action` v4.7.0, `docker/build-push-action` v7.4.0. Die SHA liefert `gh api repos/<owner>/<repo>/commits/<tag> -q .sha`
- [ ] **Step 2:** Für jede Action die Release Notes des neuen Majors lesen (`gh release view <tag> -R <owner>/<repo>`). Entfallene oder umbenannte Inputs, die `deploy.yml` nutzt, anpassen
- [ ] **Step 3:** `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest`. Erwartet: keine Ausgabe
- [ ] **Step 4:** Commit `Pin GitHub Actions to current releases`. Der Body nennt den Schutz vor verschobenen Tags.

### Task 9: CI für Pull Requests

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1:** Unter `on:` zusätzlich `pull_request:` ohne Filter. Auf oberster Ebene `permissions:` mit `contents: read`, denn der Job braucht vom `GITHUB_TOKEN` nichts weiter
- [ ] **Step 2:** Den Login-Step mit `if: github.event_name == 'push'` versehen
- [ ] **Step 3:** In `build-push-action` `push: ${{ github.event_name == 'push' }}`
- [ ] **Step 4:** actionlint wie in Task 8. Erwartet: keine Ausgabe. Im PR-Lauf warnt `metadata-action` später, dass keine Tags entstehen, denn die Muster sind reine Semver-Muster. Das ist erwartet und bleibt so
- [ ] **Step 5:** Commit `Build the Docker image for pull requests`. Der Body erklärt, dass PRs bisher ungeprüft blieben.

### Task 10: Dependabot

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1:** `version: 2` mit drei Einträgen unter `updates`, je `directory: /` und `schedule.interval: weekly`: `npm`, `docker`, `github-actions`. Der `docker`-Eintrag bekommt ein `ignore` für `dependency-name: node` mit `update-types: ["version-update:semver-major"]`
- [ ] **Step 2:** `npx -y js-yaml .github/dependabot.yml`. Erwartet: das YAML als JSON, Exit 0
- [ ] **Step 3:** Commit `Configure Dependabot for npm, Docker and Actions`

### Task 11: Abschluss im Image

**Files:** keine

- [ ] **Step 1:** `docker build --build-arg SITE=https://vinado.de -t vinado-test . && docker run -d --rm -p 8080:8080 --name vinado-test vinado-test`
- [ ] **Step 2:** `curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/`. Erwartet: `200`
- [ ] **Step 3:** `shots.sh $TMPDIR/shots-image http://localhost:8080`, Vergleich gegen `shots-baseline`. Erwartet: `0` für alle 12 Dateien
- [ ] **Step 4:** `docker stop vinado-test`
- [ ] **Step 5:** Nach dem Push: Der erste PR-Lauf ist grün, und das Log zeigt keinen Login und keinen Push. Erst dieser Lauf baut auf dem amd64-Builder von GitHub und für `linux/arm64`. Der Log zeigt unter „GITHUB_TOKEN Permissions“ nur `Contents: read`. Unter Insights, Dependency graph, Dependabot stehen npm, docker und github-actions ohne Konfigurationsfehler
