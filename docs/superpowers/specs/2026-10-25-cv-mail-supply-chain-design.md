# CV-Seite, E-Mail-Schutz und Supply-Chain-Härtung

Design für die Issues #7, #6 und #5. Sie werden in dieser Reihenfolge umgesetzt, als drei PRs nacheinander. Jeder PR schließt sein Issue. Ein gemeinsames Release `v1.6.0` folgt erst nach dem letzten Merge.

## Warum

Die Website ist statisch, aber drei Altlasten halten sie zurück.

- Die CV-Seite lädt Bootstrap 4.6.2 von jsDelivr. Bootstrap 4 ist EOL, die Seite hat keinen Dark Mode, und die fremde Origin steht einer Content Security Policy im Weg.
- Die E-Mail-Adresse auf der Startseite erzeugt ein Script von 2009 per `document.write`. Es schützt kaum, blockiert das Parsen und verhindert ebenfalls eine strenge CSP. In `humans.txt` und im Docker-Label steht die Adresse ohnehin im Klartext.
- Der Weg vom Repo zum Image auf Docker Hub ist erst teilweise abgesichert (#3). Es fehlen Prüfungen im CI, Repo-Einstellungen und eine CSP.

Spam ist heute kein akutes Problem, Gmail filtert ihn gut. Der Schutz der Adresse darf trotzdem nicht schlechter werden als heute.

## Rahmen

- Der Maintainer arbeitet allein und pusht auch direkt auf `main`. Nichts darf das blockieren.
- Laufender Aufwand pro PR oder Release soll nicht entstehen. Einmalige Einrichtung ist in Ordnung.
- Inhalte der Seiten ändern sich nicht, nur Darstellung und Technik.
- Bestehende Projektregeln gelten weiter: Commits nach Chris Beams auf Englisch, Merge-Commits für PRs, signierte annotierte Tags `v*` auf dem Merge-Commit, `package.json` trägt vor dem Tag dieselbe Version.
- Lokal läuft Node über `fnm`, also `fnm exec --using=26 -- <cmd>`.

## Teil 1: CV-Seite ohne Bootstrap (#7)

### Ziel

`src/pages/cv.astro` lädt nichts mehr von fremden Origins und nutzt dasselbe CSS wie die anderen Seiten (`tw.css` mit `base.css`). Sie sieht aus wie die übrigen Seiten, also mit derselben Schrift, denselben Farben und Dark Mode. Header und Footer bekommt sie nicht.

### Bildschirm

- **Desktop** (heute ab `lg`): zwei Spalten. Links steht der Abschnittstitel, rechts stehen die Einträge.
  - Die Titelspalte ist in allen vier Abschnitten gleich breit. Ihre Breite richtet sich nach dem längsten unteilbaren Wort, heute „Berufserfahrung“. Titel brechen nur zwischen Wörtern, also wird „Kenntnisse und Fähigkeiten“ zweizeilig. Wörter werden nie getrennt.
  - Der Zeitraum steht rechts in derselben Zeile wie der Name des Eintrags. Ist der Name zu lang, rutscht der Zeitraum **über** den Namen, nicht darunter. Der Zeitraum überdeckt nie Text.
- **Mobil**: alles untereinander. Erst kommt der Titel, dann je Eintrag der Zeitraum, der Name, die Rolle und die Liste.
- „Kenntnisse und Fähigkeiten“ behält die zwei Unterspalten nebeneinander auf allen Breiten, wie heute.
- Farben kommen aus den Variablen in `src/styles/base.css`. Dark Mode folgt `prefers-color-scheme` wie auf den anderen Seiten. Die heutige Farbe `#37474f` der Abschnittstitel und `var(--secondary)` des Zeitraums werden durch passende Variablen aus `base.css` ersetzt, die in beiden Modi lesbar sind.

### Druck auf A4

- Zwei Spalten wie am Desktop, mit derselben Titelspalte.
- Der Zeitraum steht bei jedem Eintrag **über** dem Namen, wie auf dem Handy.
- Immer schwarz auf Weiß, auch wenn der Bildschirm im Dark Mode ist. `base.css` schaltet den Dark Mode nur für `screen`, das bleibt so.
- Ein Eintrag wird nicht über zwei Seiten getrennt.
- Die Seitenränder setzt der Browser.

### Bleibt

Alle Inhalte, `<meta name="robots" content="noindex">`, `lang="de"`, die Open-Graph- und Twitter-Tags und der Titel.

### Weg

Der `<link>` auf jsDelivr, alle Bootstrap-Klassen und die ungenutzten Regeln `.border-dotted` und `div.border-bottom.border-dotted`.

### Abnahme

Abweichungen zum heutigen Stand sind gewollt, es gibt also keinen Pixelvergleich. Der Maintainer nimmt Bilder ab: Screenshots hell und dunkel auf 390 px und 1440 px Breite sowie ein PDF auf A4. Bewährt ist `npx -y playwright@1.64.1 screenshot --full-page --color-scheme=<light|dark> --viewport-size=<w,h>`. Für das PDF genügt ein kurzes Playwright-Script mit `page.pdf({ format: "A4" })`.

## Teil 2: E-Mail-Adresse schützen (#6)

### Ziel

Die Adresse ist auf der Website mindestens so gut geschützt wie heute, möglichst besser. Ohne `document.write` und ohne Inline-Script, damit eine CSP mit `script-src 'self'` funktioniert.

### Startseite

- Unter „Contact me via“ steht neben dem Briefumschlag ein Button „Show email“. Die Startseite ist englisch, deshalb ist auch der Button englisch.
- Ein Klick setzt die Adresse zusammen und ersetzt den Button durch einen normalen `mailto:`-Link mit der sichtbaren Adresse. Das Mailprogramm öffnet sich erst beim Klick auf diesen Link.
- Die Adresse steht weder im HTML noch im Klartext oder als einfaches Base64 im Script. Das genaue Verfahren wählt der Builder. Es soll einen Scraper abhalten, der die Seite rendert, aber nichts anklickt.
- Ohne JavaScript erscheint ein kurzer Hinweis, dass die Adresse JavaScript braucht und Telegram oder Matrix direkt funktionieren.
- Der Button ist per Tastatur und Screenreader bedienbar. Nach dem Klick landet der Fokus auf dem neuen Link.
- Das Script ist eine eigene Datei im Projekt, kein Inline-Script.

### Weitere Stellen

- `public/humans.txt` nennt beim Kontakt nur den Namen und `https://vinado.de`.
- Das Docker-Label `org.opencontainers.image.authors` nennt nur den Namen und `https://vinado.de`.
- `public/encrypted-mail.labeled.js` wird gelöscht.

### Nicht im Umfang

Die UIDs in `public/pgp_keys.asc` und auf `/pgp-keys/` bleiben, denn ein öffentlicher Schlüssel braucht sie. Eine eigene Kontaktadresse und ein Kontaktformular sind nicht geplant.

## Teil 3: Supply-Chain-Härtung (#5)

### Im Repo, als PR

- **Install-Scripts.** Für `esbuild`, `sharp` und `fsevents` wird einmal per `npm install-scripts approve` oder `deny` entschieden. Der Build darf sich dadurch nicht ändern. Die Entscheidung steht im Repo, sodass ein neues Paket mit Install-Script als Warnung auffällt.
- **Dependabot `cooldown`** für npm, Docker und Actions, wenige Tage. Sicherheitsupdates sind davon nicht betroffen.
- **`npm audit signatures`** läuft im CI bei PRs und Tags. Ein Fehler bricht den Lauf ab.
- **`zizmor`** prüft die Workflows bei PRs in einem eigenen Job. Ein Finding lässt den PR-Lauf scheitern. Findings, die es heute meldet, werden behoben oder begründet unterdrückt. Der Tag-Lauf hängt nicht von `zizmor` ab, denn dessen Online-Prüfungen könnten ein Release ohne Änderung im Repo scheitern lassen.
- **`actions/dependency-review-action`** läuft nur bei PRs, ebenfalls in einem eigenen Job. Es blockiert neue Dependencies mit Schwachstellen ab Severity `high`. Eine Lizenz-Policy gibt es nicht.
- **Environment für Docker Hub.** Der Push läuft in einem GitHub Environment, das nur Tags `v*` zulässt. Die Secrets `DOCKERHUB_USERNAME` und `DOCKERHUB_TOKEN` liegen dann nur dort. PR-Läufe sehen sie nicht. Eine manuelle Freigabe pro Release gibt es nicht.
- **SBOM und Provenance.** `docker/build-push-action` hängt beides an, mit `sbom: true` und `provenance: mode=max`.
- **Content Security Policy** als Header in der nginx-Konfiguration im `Dockerfile`. Nach Teil 1 und 2 laden alle Seiten nur noch Ressourcen von der eigenen Origin. Die Policy ist so streng, wie die Seiten es zulassen, und gilt für alle Seiten.
  - Bekannte Stolpersteine: FontAwesome (`public/fontawesome/js`) fügt zur Laufzeit ein `<style>`-Element ein. Astro kann kleine Stylesheets inline in das HTML schreiben. Die Policy erlaubt deshalb `style-src 'self' 'unsafe-inline'`. Hashes würden bei jedem Build oder FontAwesome-Update brechen. Für Scripts gilt strikt `script-src 'self'` ohne `'unsafe-inline'`.
  - Prüfung: Alle drei Seiten laden im Image ohne CSP-Verletzung in der Browser-Konsole. Sie sehen aus wie ohne Policy.
- Die bestehenden Warnungen im PR-Lauf („No Docker image version has been generated“, „No output specified“) sind erwartet.

### In GitHub und Docker Hub, nach dem letzten Merge

Diese Einstellungen setzt die ausführende Session per `gh`, erst nach dem Merge des dritten PRs und nach einer Rückfrage beim Maintainer.

- Secret Scanning und Push Protection einschalten.
- Dependabot Security Updates einschalten. Heute sind sie aus, es entstehen also keine PRs für Sicherheitsfixes.
- Ruleset für Tags `v*`: Verschieben und Löschen sind verboten. Es wird erst aktiviert, nachdem der Tag-Lauf von `v1.6.0` erfolgreich war. Scheitert dieser erste Lauf, lässt sich der Tag so noch korrigieren.
- Ruleset für `main`: Force-Push und Löschen sind verboten. Kein Pflicht-Review und kein Required Check, denn beides würde direkte Pushes blockieren.
- Das Environment mit seiner Tag-Regel anlegen und die Docker-Hub-Secrets hineinlegen. Die Repo-Secrets danach entfernen. Die Werte kennt nur der Maintainer, er setzt sie selbst.
- Prüfen, ob der Docker-Hub-Plan einen Token erlaubt, der nur auf `vinado/vinado.de` schreiben darf. Wenn ja, stellt der Maintainer den Token in Docker Hub um.

Reihenfolge: Environment und Secrets stehen, bevor `v1.6.0` gepusht wird. Das Tag-Ruleset folgt erst nach dem erfolgreichen Tag-Lauf.

### Bewusst weggelassen

- Pflicht-Review und Required Check auf `main`, siehe oben.
- Signatur mit `cosign`. Ohne Prüfung im Cluster bringt sie nichts. Die Evaluation läuft in V1ncNet/ops-kubernetes#34.

## Release

Der letzte Commit des dritten PRs setzt `package.json` auf `1.6.0`, wie bei `v1.5.0`. Nach dem Merge folgt der signierte annotierte Tag `v1.6.0` auf dem Merge-Commit. Der Tag-Lauf ist zugleich der erste Test für Environment, SBOM und Provenance. Renovate in `ops-kubernetes` öffnet danach den Update-PR, gemergt wird von Hand.

## Dem Builder überlassen

- Ob die CV-Seite auf `src/layouts/Main.astro` umzieht oder ein eigenes Gerüst behält. Für Besucher sieht beides gleich aus.
- Die genaue Technik von Grid, Flex und Print-CSS, solange das beschriebene Verhalten stimmt.
- Das Verfahren, mit dem das E-Mail-Script die Adresse verbirgt.
- Die Dauer des Dependabot-`cooldown`.

## Nebenbei

`.superpowers/` kommt in `.gitignore`.
