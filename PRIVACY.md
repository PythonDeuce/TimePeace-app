# TimePeace privacy

TimePeace runs entirely on your computer.

## What stays local

- Your settings, cities, quiz stats, and sticky notes live in the app's own browser storage and in a `store.json` file next to it. Nothing is uploaded.
- Window positions and the tray options live in `state.json` in the same folder.
- "Detect my city" asks your system for a location once, matches it against a city list bundled with the app, and keeps only the city name and time zone. The coordinates are not stored or sent anywhere.
- The log file `timepeace.log` records startup, window events, and errors, and stays on your disk. It never includes note text or settings values.

Folder locations:

- Windows: `%APPDATA%\TimePeace`
- macOS: `~/Library/Application Support/TimePeace`
- Linux: `~/.config/TimePeace`

## The one network request

Once a day, and when you press "Check for updates" in Settings, About TimePeace, the app asks GitHub for the latest release of TimePeace:

`https://api.github.com/repos/PythonDeuce/TimePeace-app/releases/latest`

The request carries the app version in its User-Agent header and nothing else. GitHub sees your IP address, as any web request does. The answer only tells the app whether a newer version exists. The app never downloads or installs an update on its own; you open the download page yourself.

There is no telemetry, no analytics, no crash reporting, and no account.

## Removing everything

Quit TimePeace and delete the folder above. That removes every setting, note, and log.
