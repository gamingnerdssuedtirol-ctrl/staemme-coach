# Stämme Coach v0.8 – Offline-Planer

## Neu

Der Coach plant jetzt gezielt für deine Abwesenheit.

Du stellst ein:

- Offline-Zeit von 1 bis 16 Stunden
- Sicherheitsreserve von 0 bis 120 Minuten

Der Offline-Planer berücksichtigt:

- die bereits laufende Bauschleife
- den strategischen Bauplan
- Rohstoffwartezeiten
- exakte Bauzeiten, soweit sie aus dem Spiel importiert wurden
- geschätzte Zeiten für spätere, noch nicht auswählbare Stufen

## Anzeige

Der Coach zeigt:

- geplante Rückkehrzeit
- gesamte Queue-Abdeckung
- vorhandene Bauaufträge
- zusätzlich empfohlene Gebäude
- Start- und Endzeit jedes Schritts
- Warnung, falls die Offline-Zeit noch nicht vollständig abgedeckt ist
- Zeitreserve, wenn die Queue länger läuft als nötig

## Wichtiger Hinweis

Der Coach führt keine Spielaktion aus. Er stellt nur die empfohlene Reihenfolge zusammen. Die Gebäude müssen weiterhin von dir im Spiel in die Bauschleife gesetzt werden.

## Installation

Das Tampermonkey-Script v0.5.3 bleibt unverändert.

1. ZIP entpacken.
2. Alle PWA-Dateien in dein GitHub-Repository `staemme-coach` hochladen.
3. Vorhandene Dateien ersetzen.
4. Commit bestätigen.
5. Coach neu laden.

Oben muss `v0.8` stehen.

Falls noch eine ältere Version sichtbar ist, den Website-Cache der Coach-Seite löschen und erneut öffnen.
