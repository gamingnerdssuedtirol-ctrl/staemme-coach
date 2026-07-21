# Stämme Coach v0.6.1

Diese Version behebt den leeren Coach und verbessert die Funktion „Spiel öffnen“.

## Änderungen

- „Spiel in neuem Tab öffnen“ ist jetzt ein normaler Link und funktioniert auf Android zuverlässiger.
- Zusätzlich gibt es „Spiel im selben Tab öffnen“ als Ausweichmöglichkeit.
- Der Link öffnet direkt Welt `de256` und – sobald Daten vorhanden sind – das zuletzt synchronisierte Dorf.
- Ältere gespeicherte Coach-Daten werden automatisch aus früheren LocalStorage-Schlüsseln übernommen.
- Ohne Spieldaten erscheint eine klare Anleitung statt einer scheinbar kaputten Oberfläche.
- Synchronisationsstatus:
  - gerade eben / vor X Minuten
  - Warnung ab 30 Minuten
- Neuer Service-Worker-Cache, damit das Handy nicht bei v0.6 hängen bleibt.

## Installation auf GitHub

1. ZIP entpacken.
2. Alle enthaltenen Dateien in das Repository `staemme-coach` hochladen.
3. Vorhandene Dateien ersetzen.
4. Commit bestätigen.
5. GitHub Pages neu öffnen.

Oben muss `v0.6.1` stehen.

## Wichtig bei altem Cache

Falls weiterhin v0.6 angezeigt wird:

1. Seite einmal neu laden.
2. Browser-Menü öffnen.
3. „Website-Daten löschen“ oder „Cache leeren“ für die Coach-Seite.
4. Coach erneut öffnen.

Danach:

1. „Spiel in neuem Tab öffnen“ drücken.
2. Im Spiel unten rechts „Coach aktualisieren“ drücken.
3. Der Coach öffnet sich mit den aktuellen Daten.
