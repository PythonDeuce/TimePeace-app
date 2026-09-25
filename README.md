# TimePeace

A world clock that lives on your desktop: every city you care about in one disc, a military time trainer, a meeting finder, and sticky notes that pin anywhere on the screen. Windows, macOS, and Linux. An EABA product.

Download page: https://pythondeuce.github.io/TimePeace-app/

Direct downloads (always the latest release):

- Windows: https://github.com/PythonDeuce/TimePeace-app/releases/latest/download/TimePeace-windows.exe
- macOS, Apple silicon (M1 and later): https://github.com/PythonDeuce/TimePeace-app/releases/latest/download/TimePeace-macos-arm64.zip
- macOS, Intel: https://github.com/PythonDeuce/TimePeace-app/releases/latest/download/TimePeace-macos-intel.zip
- Linux: https://github.com/PythonDeuce/TimePeace-app/releases/latest/download/TimePeace-linux

This repository holds the download page and the release builds. The source is developed privately by EABA.

- The builds are not code signed; see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for the SmartScreen and Gatekeeper steps and everything else.
- The app's only network use is the daily update check and, with Updates set to Automatic, the download of a new release; see [PRIVACY.md](PRIVACY.md).
- TimePeace 1.1.0 and later are licensed for personal and internal use only; see [LICENSE](LICENSE). Versions 1.0.0 through 1.0.6 were released under the MIT License.

## Use it from an assistant (MCP)

TimePeace is also an MCP server, so Claude Desktop or another MCP client can read and steer your clock: ask what time it is in the cities you follow, add or remove a city, switch the theme or layout, lock the clock, or create and read sticky notes. It is local only and needs the clock to be running. Point the client at the installed app with the `--mcp` flag, for example in Claude Desktop (Settings, Developer, Edit config):

```json
{ "mcpServers": { "timepeace": { "command": "C:\\Users\\you\\AppData\\Local\\TimePeace\\TimePeace.exe", "args": ["--mcp"] } } }
```
