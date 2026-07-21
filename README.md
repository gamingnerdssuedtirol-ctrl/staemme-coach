# Stämme Coach v0.5

## 1. GitHub aktualisieren
Lade `index.html`, `app.js`, `sw.js`, `manifest.webmanifest` und beide Icons in dein Repository hoch und ersetze die alten Dateien. Danach muss oben **v0.5** stehen.

## 2. Tampermonkey aktualisieren
Öffne dein vorhandenes Script, lösche den alten Inhalt, füge den Inhalt von `staemme-coach.user.js` ein und speichere. Danach Die Stämme neu laden.

## Behoben
- Rohstoffe werden direkt von der sichtbaren Spielseite bzw. aus `game_data` gelesen.
- Dorfname wird sauber ermittelt.
- Vollständigkeit prüft tatsächliche Werte.
- Alte Lesezeichen-Einrichtung entfernt.
- Planung berücksichtigt vorhandenen Adelshof und OFF-Dorf stärker.
