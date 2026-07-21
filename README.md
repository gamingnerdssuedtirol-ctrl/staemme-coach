# Stämme Coach v1.2.1 – Cache-Fix

## Ursache

Auf deinem Screenshot steht zwar `v1.2`, aber die sichtbare Oberfläche ist weiterhin die alte Version.

Das bedeutet: `index.html` wurde aktualisiert, während der Browser bzw. Service Worker noch die alte `app.js` aus dem Cache geladen hat.

## Behoben

Version 1.2.1 verwendet eine vollständig neue JavaScript-Datei:

`app-v121.js`

Dadurch kann der Browser nicht mehr versehentlich die alte `app.js` laden.

Zusätzlich:

- neuer Service-Worker-Cache
- automatische Löschung alter Coach-Caches
- sichtbare Build-Anzeige `Build 1.2.1`
- interaktive Funktionen werden dadurch zuverlässig geladen

## Installation

1. ZIP entpacken.
2. **Alle Dateien** in dein GitHub-Repository hochladen.
3. Vorhandene Dateien ersetzen.
4. Die alte Datei `app.js` im Repository darf gelöscht werden.
5. Commit bestätigen.
6. Coach öffnen.

Oben muss stehen:

- `v1.2.1`
- `Build 1.2.1`

Danach die Seite einmal vollständig neu laden.

## Sichtbare Änderungen

Nach erfolgreichem Update siehst du:

- `Erledigt`- und `Anpinnen`-Buttons bei Bauempfehlungen
- Strategie standardmäßig nur mit fünf Schritten
- Button `Weitere Schritte anzeigen`
- aufklappbare Truppenempfehlungen
- Verlauf-Bereich
