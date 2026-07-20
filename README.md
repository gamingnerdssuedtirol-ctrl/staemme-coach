# Stämme Coach PWA v0.1

Diese Version ist speziell dafür gedacht, ohne PC auf Android getestet zu werden.

## Soforttest ohne Hosting

Die Datei `index.html` kann auf Android aus einem Dateimanager im Browser geöffnet werden. Dabei funktionieren Dashboard, lokaler Speicher, JSON-Import und Demodaten. Die Installation als echte PWA sowie der Offline-Service-Worker benötigen später eine HTTPS-Adresse.

## Datenübernahme ohne Zahlen abzutippen

Die App enthält einen Bookmarklet-Ausleser:

1. `index.html` öffnen.
2. Unter „Daten übernehmen“ die Anleitung öffnen.
3. „Auslese-Befehl kopieren“ drücken.
4. In Firefox ein neues Lesezeichen erstellen.
5. Als Lesezeichen-Adresse den kopierten JavaScript-Text einsetzen.
6. Die Stämme im Browser öffnen.
7. Das Lesezeichen „Stämme auslesen“ ausführen.
8. Zur Coach-Seite wechseln.
9. „Aus Zwischenablage importieren“ drücken.

Der Ausleser versucht Rohstoffe, Bevölkerung, Produktion, Gebäude, Bauschleife, sichtbare Truppen und Effekte zu übernehmen.

## Technische Grenze

Eine normale PWA darf wegen der Browser-Sicherheitsregeln nicht selbstständig den Inhalt eines anderen Tabs oder einer anderen Domain lesen. Deshalb dient das Lesezeichen als Brücke. Es wird bewusst nur nach einer manuellen Aktion ausgeführt und klickt nichts im Spiel an.

## Dateien

- `index.html` – Oberfläche
- `app.js` – lokale Datenhaltung und erste Empfehlungen
- `bookmarklet.txt` – Auslese-Befehl separat
- `manifest.webmanifest` – PWA-Metadaten
- `sw.js` – Offline-Cache für eine später gehostete Version

## Nächster Test

Nach dem ersten echten Import bitte den JSON-Inhalt aus „JSON-Test und Fehlerdiagnose“ kopieren und im Chat schicken. Dann können die Selektoren exakt auf die mobile Spielseite angepasst werden.
