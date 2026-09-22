# TimePeace troubleshooting

Where the files live (called "the settings folder" below):

- Windows: `%APPDATA%\TimePeace`
- macOS: `~/Library/Application Support/TimePeace`
- Linux: `~/.config/TimePeace`

## Windows says "Windows protected your PC"

The build is not code signed, so SmartScreen warns the first time. Choose "More info", then "Run anyway". The warning does not come back for that file.

## The download says "Virus detected" (Windows)

Some antivirus programs flag new unsigned apps that few people have downloaded yet. It is a false alarm, but you have to let the file through yourself:

1. Click Start, type Windows Security, and open it.
2. Click "Virus & threat protection".
3. Click "Protection history".
4. Find the entry for TimePeace-windows.exe (it says Threat quarantined or blocked).
5. Click it, then "Actions", then "Allow" (or Restore).
6. Download the Windows file from the download page again. This time it stays.
7. Open it. If Windows shows "Windows protected your PC", click "More info", then "Run anyway".

With a different antivirus (McAfee, Norton, Avast, and others), open that program, look for Quarantine or History, find TimePeace, choose Restore or Allow, then do steps 6 and 7.

## macOS says the app is damaged or from an unidentified developer

The build is not notarized. Right click the app, choose Open, then Open again in the dialog. If macOS still refuses, run once in Terminal:

```bash
xattr -dr com.apple.quarantine /Applications/TimePeace.app
```

## Nothing appears, or a dialog says WebView2 is missing (Windows)

TimePeace draws with the Edge WebView2 runtime, which ships with Windows 11 and most Windows 10 machines. If it is missing, install the Evergreen runtime from Microsoft's WebView2 page, then start TimePeace again.

## Nothing appears on Linux

Install the WebKitGTK bindings, then start again:

```bash
sudo apt install python3-gi gir1.2-webkit2-4.1 gir1.2-gtk-3.0
```

Transparency needs a compositing window manager (GNOME, KDE, picom). Without one the window has a solid background.

## A second copy will not start

Only one TimePeace runs at a time. Starting it again brings the running one to the front. If nothing is on screen, look for the tray icon and choose Show, or Bring to screen.

## The widget is off screen

Right click the tray icon and choose "Bring to screen". It centers the clock on the monitor under the cursor.

## My settings are gone

Settings are kept twice: in the app's browser storage and in `store.json` in the settings folder. If the browser storage was reset, the file restores it on the next start. If `store.json` is missing too, the settings are gone; a backup of the folder is the only way back.

Settings depend on the local port 47321. If another program holds that port, TimePeace uses the next one and shows a toast saying so; settings are restored from `store.json` in that case.

## Notes are missing after an update from 1.0.x

Versions 1.0.0 to 1.0.6 shipped without the note window files, so notes could not open. Version 1.1.0 fixes that; note data written by an earlier version is still in the store and comes back.

## Reading the log

`timepeace.log` in the settings folder records startup, window events, script errors, and the update check. It rotates at about 512 KB. When reporting a problem, include the lines from the last start (they begin with a line containing "started").

## Starting over

Quit TimePeace, then delete the settings folder. The next start is a fresh install. Delete only `state.json` to reset window positions and keep everything else.
