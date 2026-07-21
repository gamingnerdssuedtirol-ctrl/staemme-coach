# Stämme Coach v0.7.1 – exakte Bauzeiten

## Was jetzt exakt ist

Das neue Tampermonkey-Script v0.5.3 liest auf der Hauptgebäude-Seite für jedes Gebäude:

- die aktuell auswählbare nächste Stufe
- die vom Spiel berechnete Bauzeit
- soweit im HTML vorhanden auch die angezeigten Rohstoffkosten

Die vom Spiel angezeigte Bauzeit enthält bereits:

- Weltgeschwindigkeit
- aktuelle Hauptgebäudestufe
- aktive Baugeschwindigkeits-Effekte
- serverseitige Modifikatoren

## Wichtige technische Grenze

Exakt auslesbar ist immer die **aktuell auswählbare nächste Stufe** eines Gebäudes.

Beispiel:

- Schmiede ist Stufe 6
- Schmiede 7: exakt
- Schmiede 8: auf der aktuellen Seite noch nicht auswählbar und deshalb zunächst geschätzt

Nach jedem erneuten „Coach aktualisieren“ wird die dann nächste Stufe wieder exakt übernommen. Im Strategieplan steht deshalb bei jedem Schritt:

- `exakt bis …`
- oder `geschätzt bis …`

So behauptet der Coach nicht fälschlich, eine hochgerechnete Zeit sei exakt.

## Installation

### 1. GitHub-PWA

Alle Dateien außer `staemme-coach.user.js` in das Repository `staemme-coach` hochladen und bestehende Dateien ersetzen.

Danach muss oben `v0.7.1` stehen.

### 2. Tampermonkey

1. Tampermonkey öffnen.
2. „Stämme Coach Aktualisieren“ öffnen.
3. Alten Inhalt vollständig löschen.
4. Inhalt von `staemme-coach.user.js` einfügen.
5. Speichern.
6. Die Stämme neu laden.
7. „Coach aktualisieren“ drücken.

Im JSON sollte danach stehen:

```json
"parserVersion": "0.5.3"
```

Unter `diagnostics` erscheint:

```json
"exactBuildTimesFound": 13
```

Die Zahl kann je nach sichtbaren bzw. ausbaubaren Gebäuden abweichen.
