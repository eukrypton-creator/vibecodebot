# JAR-Download-Bot

Ein Discord-Bot, der mit `/download` ein Auswahlmenü für JAR-Dateien anbietet.

## Einrichtung

1. Installiere Node.js 20 oder neuer.
2. Führe `npm install` aus.
3. Kopiere `.env.example` nach `.env` und trage Token und Application-ID aus dem [Discord Developer Portal](https://discord.com/developers/applications) ein.
4. Lege die anzubietenden Dateien in den Ordner `jars`.
5. Registriere den Slash-Befehl: `npm run register`.
6. Starte den Bot mit `npm start`.

Beim Einladen des Bots müssen die Scopes `bot` und `applications.commands` gewählt werden. Als Bot-Berechtigung genügt **Dateien anhängen** (Attach Files) sowie die üblichen Rechte zum Senden von Nachrichten.

## Hinweise

- `/download` zeigt bis zu 25 JAR-Dateien auf einmal an (Discord-Limit).
- Discord erlaubt nur Uploads innerhalb des Upload-Limits des Servers bzw. Accounts. Ist eine Datei zu groß, erhält der Nutzer eine klare Fehlermeldung.
- Die Dateien bleiben lokal im Ordner `jars`; sie werden nicht in Git eingecheckt.
