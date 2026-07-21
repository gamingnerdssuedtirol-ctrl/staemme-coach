# Stämme Coach v2.0 – Coach-Analyse

## Neu

### Strategische Bewertung von 0 bis 100

Der Coach bewertet die aktuelle Hauptempfehlung und zeigt:

- strategischen Fokus
- erkannte Spielphase
- verständliche Begründung
- wichtigste Bauaktion
- wichtigste Truppenaktion

Die Bewertung basiert weiterhin lokal auf nachvollziehbaren Regeln und Simulationen. Es werden keine Daten an einen KI-Dienst übertragen.

### Risiken und Engpässe

Der Coach warnt unter anderem vor:

- leerer oder bald endender Bauschleife
- vollem Speicher
- knapper Bevölkerung
- stark unausgeglichener Rohstoffproduktion

### Prognose für 12 bis 48 Stunden

Der Coach berechnet:

- voraussichtliches Holz
- voraussichtlichen Lehm
- voraussichtliches Eisen
- erwarteten Speicherüberlauf

### Zielplaner

Auswählbare Ziele:

- Adelshof freischalten
- 100 oder 500 Leichte Kavallerie
- 500 oder 1.000 Axtkämpfer
- alle Rohstoffgebäude auf Stufe 25

Der Coach zeigt:

- aktuellen Fortschritt
- fehlende Stufen oder Truppen
- grobe geschätzte Dauer
- mögliche Blockaden

## Installation

### GitHub-PWA

1. ZIP entpacken.
2. Alle PWA-Dateien in das Repository `staemme-coach` hochladen.
3. Alte App-Dateien wie `app-v121.js` dürfen gelöscht werden.
4. Commit bestätigen.
5. Coach neu öffnen.

Oben muss stehen:

- `v2.0`
- `Build 2.0`

### Tampermonkey

Das enthaltene Script ist Parser v0.5.4 mit dem bereits korrigierten Ressourcenparser. Es muss nur ersetzt werden, falls du noch eine ältere Parser-Version verwendest.

## Hinweis zu Zeitprognosen

Die nächste auswählbare Gebäudestufe nutzt die aus dem Spiel gelesene Bauzeit. Spätere Folgestufen sowie Ausbildungszeiten bleiben als strategische Näherung berechnet.
