# TimePeace privacy

TimePeace runs entirely on your computer.

## What stays local

- Your settings, cities, quiz stats, and sticky notes live in the app's own browser storage and in a `store.json` file next to it. Nothing is uploaded.
- Window positions and the tray options live in `state.json` in the same folder.
- "Detect my city" asks your system for a location once, matches it against a city list bundled with the app, and keeps only the city name and time zone. The coordinates are not stored or sent anywhere.
- The log file `timepeace.log` records startup, window events, and errors, and stays on your disk. It never includes note text or settings values.
- Dictation runs on this computer with whisper.cpp. What you say is transcribed here and never leaves your machine; the audio is not kept.
- Updates leave this folder alone. A copy of `store.json` is taken right before an update installs (`backups/`), beside the copies taken at every start.

Folder locations:

- Windows: `%APPDATA%\TimePeace`
- macOS: `~/Library/Application Support/TimePeace`
- Linux: `~/.config/TimePeace`

## The MCP connector

When an assistant is configured to use TimePeace as an MCP server, it starts `TimePeace --mcp` itself and that process talks to the running clock over the loopback address only, authorized by a token the clock writes to `control.json` in its settings folder for the length of a run. The assistant sees what the tools return (your cities, the time there, note titles and text when it asks for them) and nothing else. Nothing is sent anywhere by TimePeace; what the assistant does with an answer is governed by that assistant.

## The two network requests

**The update check.** Once a day, and when you press "Check for updates" in Settings, About TimePeace, the app asks GitHub for the latest release of TimePeace:

`https://api.github.com/repos/PythonDeuce/TimePeace-app/releases/latest`

The request carries the app version in its User-Agent header and nothing else. GitHub sees your IP address, as any web request does. The answer tells the app whether a newer version exists.

When a newer version exists and Updates is set to Automatic in Settings, About TimePeace (the default), the app downloads that release's file for your system from GitHub, checks it against the checksum published with the release, keeps it in the `updates` folder beside your settings, and installs it the next time TimePeace starts (or when you choose Restart now), on Windows, Mac and Linux alike. The old build is kept beside the app as `.old` until the next start, in case the swap has to be undone. Set Updates to Manual and the app only tells you; you open the download page yourself.

**The speech model.** Dictation needs a model file it does not ship with. The first time you press a microphone in a note, or when you choose Download in Settings, Dictation, the app fetches it once from the whisper.cpp model store on Hugging Face (`https://huggingface.co/ggerganov/whisper.cpp/resolve/main/<model>.bin`, about 60 MB), checks it against the published size and checksum, and keeps it under `models/` in the settings folder. The request carries the app version in its User-Agent header and nothing else. Nothing about you or your notes is sent; the download never happens on its own.

There is no telemetry, no analytics, no crash reporting, and no account.

## Removing everything

Quit TimePeace and delete the folder above. That removes every setting, note, and log.
