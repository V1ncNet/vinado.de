# End-to-End-Tests mit Playwright

## Warum

Dependabot öffnet jede Woche PRs für npm, Docker und GitHub Actions. Heute prüft die CI nur, ob das Image baut. Ob die Seite danach noch funktioniert und gleich aussieht, sieht niemand. Deshalb bleiben die PRs liegen oder Vincent prüft sie von Hand.

Ziel ist eine Testabdeckung, nach der Vincent einen grünen Dependabot-PR ohne eigene Sichtprüfung mergen kann. Später soll das auch automatisch gehen.

## Ziele

- Playwright testet die drei Seiten `/`, `/cv/` und `/pgp-keys/` gegen das gebaute Docker-Image, also mit nginx und Content Security Policy wie in Produktion.
- Die Tests prüfen Funktion und Aussehen. Screenshot-Vergleiche fangen Layoutfehler etwa nach einem Tailwind-Update.
- Lokal und in der CI läuft derselbe Befehl. Lokal prüft er nur die Funktion, die Screenshots vergleicht nur die CI.
- Die CI startet die Tests nur bei PRs, die die Seite betreffen können, und auf Wunsch per `workflow_dispatch`.

## Nicht-Ziele

- Kein Required Check in der Branch Protection. Ein Pfadfilter auf Workflow-Ebene lässt den Check bei übersprungenen PRs auf „pending“ stehen. Wer die Tests später zur Pflicht macht, verschiebt den Filter auf Job-Ebene, etwa mit einem Job, der die geänderten Pfade prüft.
- Kein Auto-Merge für Dependabot. Das ist ein eigener Schritt nach diesem.
- Keine Tests gegen die Live-Seite und keine Prüfung, ob externe Links erreichbar sind.
- Keine weiteren Browser als Chromium.

## Anti-Ziele

- Tests, die ohne Änderung an der Seite mal rot und mal grün sind. Ein solcher Test nimmt Vincent genau das Vertrauen, um das es geht.
- Die E-Mail-Adresse im Klartext im Repo. `reveal-email.js` versteckt sie absichtlich, das Repo ist öffentlich.

## Rahmen

- Die Seite ist ein statisches Astro-Projekt. Das Dockerfile baut sie mit `npm run build -- --site=${SITE}` und liefert sie mit `nginx-unprivileged` auf Port 8080 aus. nginx setzt die CSP.
- `deploy.yml` baut mit `SITE=https://vinado.de`. Der Testaufbau übergibt dasselbe Build-Arg, sonst weichen Meta-Tags und die PGP-Seite von Produktion ab.
- Lokal hat Vincent Docker auf einem Mac mit arm64. Die GitHub-Runner sind amd64. Chromium rendert Schrift auf beiden Architekturen leicht verschieden, daher entstehen Referenzbilder nur in der CI.
- Dependabot gruppiert seit 30f0ac8 pro Ökosystem. Die Gruppe `npm` umfasst alle Pakete.
- Commits folgen den bestehenden Regeln: Englisch, Chris Beams, Merge-Commits für PRs.

## Ansätze

Drei Ziele für die Tests standen zur Wahl.

1. **Gegen das Docker-Image.** Lokal und in der CI läuft dasselbe Image. Das deckt Updates von npm, Node-Image und nginx sowie die CSP ab. Ein Lauf dauert etwa zwei bis drei Minuten.
2. **Gegen `astro preview`.** Das ist einfacher und schneller. nginx, CSP und Docker-Updates bleiben aber ungetestet.
3. **Lokal Preview, in der CI das Image.** Das ist lokal schnell, aber es gibt zwei Startwege, und CSP-Fehler zeigen sich erst in der CI.

Vincent hat Ansatz 1 gewählt, weil nur er alle drei Arten von Dependabot-PRs abdeckt.

Für den Auslöser standen „jeder PR“, „nur Dependabot-PRs“ und „PRs mit Seitenbezug“ zur Wahl. Vincent hat „PRs mit Seitenbezug“ gewählt. So prüft die CI auch seine eigenen Änderungen, überspringt aber reine Doku-PRs.

## Design

### Testaufbau

- `e2e/` ist ein eigenes npm-Paket mit `package.json`, `package-lock.json`, Playwright-Konfiguration, Compose-File und Tests. `@playwright/test` steht nur dort. So ändert ein Playwright-Update weder das Root-Lockfile noch das Image, und es löst kein Release aus.
- Das Compose-File in `e2e/` startet zwei Dienste.
  - `site` baut das Image aus dem Dockerfile mit `SITE=https://vinado.de` und stellt Port 8080 bereit.
  - `playwright` nutzt das offizielle Image `mcr.microsoft.com/playwright`, mountet `e2e/` und führt `npx playwright test` gegen `http://site:8080` aus.
- Die Tag-Version des Playwright-Images kommt aus `e2e/package-lock.json`. Steht sie fest im Compose-File, macht das nächste Playwright-Update von Dependabot die Tests rot, obwohl die Seite in Ordnung ist. Wie die Version weitergereicht wird, entscheidet der Builder, etwa über eine Umgebungsvariable, die ein npm-Script aus dem Lockfile liest.
- Der Container bekommt ein eigenes `node_modules` als anonymes Volume. So bleibt ein `e2e/node_modules` auf dem Mac unberührt.
- Playwright schreibt fehlende Referenzbilder und lässt den Test fehlschlagen. Das gilt nur, solange `updateSnapshots` in der Konfiguration ungesetzt bleibt. Ein ausdrückliches `'missing'` schreibt das Bild und meldet Grün.
- Ein npm-Script startet den ganzen Lauf, etwa `npm run test:e2e`. Vincent ruft lokal nur diesen Befehl auf.
- Die Screenshot-Vergleiche laufen nur, wenn die Umgebungsvariable `CI` gesetzt ist. Lokal überspringt Playwright sie. Das Compose-File reicht `CI` an den Container durch. Sonst sähe Playwright in der CI kein `CI`, überspränge alle Screenshots und meldete trotzdem Grün.
- Ein CI-Lauf schlägt fehl, wenn Screenshot-Tests übersprungen wurden.

### Was die Tests prüfen

Die Seite lädt nichts von fremden Origins, das verbietet schon die CSP. Externe Links prüfen die Tests nur am `href`. Eine Netzwerksperre im Compose-File braucht es deshalb nicht.

Für jede der drei Seiten:

- Die Seite antwortet mit Status 200 und hat den erwarteten Titel und die Hauptüberschrift.
- Die Antwort trägt den Header `Content-Security-Policy`.
- Die Konsole meldet keine Fehler, auch keine CSP-Verstöße. Kein Request schlägt fehl.
- Screenshot-Vergleich der ganzen Seite in zwei Größen, Desktop und Mobil. Das ergibt sechs Referenzbilder.

Pro Seite zusätzlich:

- **Startseite.** Jeder externe Link hat das erwartete `href`. Die Font-Awesome-Icons sind als SVG gerendert. Der Button „Show email“ ist sichtbar. Ein Klick ersetzt ihn durch einen Link, dessen `href` mit `mailto:` beginnt und ein `@` enthält. Die Adresse selbst steht nirgends im Test. Schlägt ein Test fehl, legt Playwright einen Snapshot der Seite in den Report. Deshalb prüft ein einziges `page.evaluate` den fokussierten Link, entfernt ihn wieder und gibt nur ein Boolean zurück. Trace, Video und Fehler-Screenshots bleiben aus.
- **CV.** Alle vier Abschnittstitel sind da.
- **PGP Keys.** Der Fingerprint steht auf der Seite. `/pgp_keys.asc` liefert einen Schlüssel, der mit `-----BEGIN PGP PUBLIC KEY BLOCK-----` beginnt. Der `curl`-Befehl nennt `https://vinado.de/pgp_keys.asc`.
- **Footer.** Die Links auf Startseite, PGP Keys und CV führen zu Seiten mit Status 200. `/cv/` hat keinen Footer, geprüft wird also von `/` aus.
- **Assets.** `robots.txt`, `humans.txt`, `site.webmanifest`, `favicon.ico` und `sitemap-index.xml` antworten mit Status 200.

### Screenshots

- Playwright erzeugt und vergleicht sie nur in der CI auf dem amd64-Runner, im selben Container wie die übrigen Tests.
- Vor dem Screenshot warten die Tests, bis Font Awesome die Icons ersetzt hat. Der E-Mail-Button bleibt dabei ungeklickt.
- Der Footer zeigt das aktuelle Jahr. Die Tests maskieren ihn im Screenshot.
- Die Referenzbilder sind normale Git-Objekte ohne LFS. Vincent wollte zuerst LFS. Für sechs kleine PNGs mit `scale: 'css'` und wenige Updates im Jahr lohnen aber weder die lokale Installation noch der Fehlerfall, bei dem Playwright LFS-Pointer statt Bildern liest.
- Schlägt ein Vergleich fehl, lädt die CI den Playwright-Report mit den Diff-Bildern als Artefakt hoch.

### Referenzbilder aktualisieren

Ändert sich das Aussehen zu Recht, etwa nach einem Playwright-Update oder einer gewollten Designänderung, aktualisiert Vincent die Bilder von Hand.

1. Er prüft die Diff-Bilder im Report des roten Laufs.
2. Er startet `e2e.yml` per `workflow_dispatch` auf dem Branch des PRs, mit einem Input, der `--update-snapshots` setzt.
3. Der Lauf lädt die neuen Bilder als Artefakt hoch. Der Workflow bekommt dafür keine Schreibrechte.
4. Vincent lädt das Artefakt mit `gh run download` herunter, committet die Bilder und pusht auf den Branch.

GitHub erlaubt `workflow_dispatch` nur für Workflows, die schon auf dem Default-Branch liegen. Für den PR, der `e2e.yml` einführt, gibt es den Knopf also noch nicht. Deshalb schreibt Playwright fehlende Referenzbilder in jedem CI-Lauf neu, lässt den Test fehlschlagen und lädt die Bilder als Artefakt hoch. Die ersten sechs Bilder kommen so in den PR. Vincent lädt sie herunter, prüft sie und committet sie.

Das passiert vor allem bei Playwright-Updates, also wenige Male im Jahr. Den Weg beschreibt eine kurze Anleitung in `e2e/README.md`.

### Dependabot

`.github/dependabot.yml` bekommt einen zweiten npm-Eintrag mit `directory: /e2e` und eigener Gruppe. Playwright-Updates kommen so in einem eigenen PR. Ein roter Screenshot im npm-PR der Seite heißt dann, dass sich die Seite verändert hat und nicht nur der Browser.

### CI

- Ein eigener Workflow `e2e.yml` läuft bei `pull_request` und `workflow_dispatch`.
- Der Pfadfilter umfasst `src/**`, `public/**`, `e2e/**`, `package.json`, `package-lock.json`, `astro.config.mjs`, `tsconfig.json`, `Dockerfile`, `.dockerignore` und `.github/workflows/e2e.yml`.
- Der Workflow hat einen Input für `workflow_dispatch`, der die Referenzbilder neu erzeugt (siehe oben).
- Der Workflow nutzt dieselben Konventionen wie `deploy.yml`. Die Actions sind auf SHA gepinnt, der Checkout setzt `persist-credentials: false` und die `permissions` sind minimal. zizmor prüft ihn mit.

### Release und Build

- `deploy.yml` veröffentlicht bei jedem Push auf `main` ein Release. `paths-ignore` bekommt zusätzlich `e2e/**` und `.github/workflows/e2e.yml`. Tests, Playwright-Updates und neue Referenzbilder erzeugen dann kein neues Image.
- `.dockerignore` bekommt `e2e/`. Sonst macht `COPY . ./` den Build-Cache bei jedem neuen Referenzbild ungültig.
- `src/styles/tw.css` schließt `e2e/` per `@source not` aus, wie schon `docs/` und `public/`. Sonst erzeugt Tailwind CSS aus Klassennamen in den Tests.
- `.gitignore` bekommt `test-results/` und `playwright-report/`.

## Dem Builder überlassen

- Namen von Compose-File, npm-Scripts und Testdateien.
- Die genauen Viewport-Größen für Desktop und Mobil.
- Wie die Playwright-Version aus dem Lockfile ins Compose-File kommt.
- Schwellwerte für den Screenshot-Vergleich, solange die Tests stabil bleiben.
- Ob Docker-Layer in der CI gecacht werden.
