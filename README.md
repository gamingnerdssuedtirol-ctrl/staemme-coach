# Stämme Coach v1.0 – Truppen-Coach

## Neu

Der Coach berechnet jetzt zusätzlich eine sinnvolle Truppenausbildung.

### Der Truppen-Coach berücksichtigt

- Dorfziel: OFF, DEF oder ausgeglichen
- aktuelle Truppenbestände
- Kaserne, Stall und Werkstatt
- freie Bevölkerung
- aktuelle Rohstoffe
- einstellbare Rohstoffreserve für Gebäude
- praktische Losgrößen statt unrealistisch großer Aufträge
- Spielphase und Zielquoten

### Anzeige

Der Coach zeigt bis zu drei Empfehlungen, zum Beispiel:

- 25 × LK
- 100 × Axt
- 20 × Späher

Für jeden Auftrag werden angezeigt:

- benötigtes Produktionsgebäude
- geschätzte Ausbildungsdauer
- Rohstoffkosten
- strategische Begründung

Im Live-Dashboard erscheint zusätzlich:

`Jetzt rekrutieren: 25 LK`

## Rohstoffreserve

Über den Regler legst du fest, wie viel Prozent deiner aktuellen Rohstoffe nicht für Truppen eingeplant werden sollen.

Beispiel:

- 35 % Reserve: ausgewogener Standard
- 60 % Reserve: stärkerer Fokus auf Gebäude
- 0 % Reserve: maximale Truppenproduktion

## Wichtiger Hinweis

Die Ausbildung wird nicht automatisch gestartet. Der Coach ist ausschließlich eine Entscheidungshilfe.

Die Ausbildungszeiten sind derzeit Näherungen auf Basis der Stufe von Kaserne, Stall oder Werkstatt. Exakte Ausbildungszeiten können später ebenfalls direkt aus dem Spiel gelesen werden.

## Installation

Das Tampermonkey-Script v0.5.3 bleibt unverändert.

1. ZIP entpacken.
2. Alle PWA-Dateien in das GitHub-Repository `staemme-coach` hochladen.
3. Bestehende Dateien ersetzen.
4. Commit bestätigen.
5. Coach neu laden.

Oben muss `v1.0` stehen.

Falls weiterhin eine ältere Version erscheint, den Website-Cache der Coach-Seite löschen und neu öffnen.
