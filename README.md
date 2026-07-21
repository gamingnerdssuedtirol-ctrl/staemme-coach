# Stämme Coach v0.6 – intelligenter Bauplaner

## Neu

- Dorfziel auswählbar: OFF, DEF oder ausgeglichen
- Planungsfenster von 1 bis 24 Stunden
- Queue wird bei der Bewertung berücksichtigt
- Rohstoffbestand und Produktion werden hochgerechnet
- Speicher- und Bauernhofengpässe werden priorisiert
- Produktionsungleichgewichte werden bewertet
- Voraussetzungen für Stall, Werkstatt und Adelshof werden geprüft
- Hauptempfehlung plus drei Alternativen
- Kosten und geschätzte Wartezeit
- transparente Planer-Diagnose mit Punktwerten und Gründen

## Installation

Nur die GitHub-PWA wird aktualisiert. Das funktionierende Tampermonkey-Script v0.5.2 bleibt unverändert.

1. ZIP entpacken.
2. Diese Dateien in das Repository `staemme-coach` hochladen:
   - index.html
   - app.js
   - sw.js
   - manifest.webmanifest
   - icon-192.svg
   - icon-512.svg
3. Vorhandene Dateien ersetzen und Commit bestätigen.
4. Coach neu öffnen.
5. Oben muss `v0.6` stehen.
6. Im Spiel wie gewohnt `Coach aktualisieren` drücken.

## Hinweis

Dies ist die erste Version des intelligenten Bauplaners. Die Planer-Diagnose zeigt, weshalb ein Gebäude bevorzugt wurde. Dadurch können wir die Gewichtung anhand deiner echten Spielsituation gezielt weiter verbessern.
