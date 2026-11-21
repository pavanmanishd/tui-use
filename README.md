<img src="assets/icon.svg" width="64" height="64" alt="">

# tui-use

Let any AI agent drive interactive terminal programs: vim, `git rebase -i`, `npm init`, ssh, REPLs, htop, installers and database shells.

Coding agents run shell commands one at a time without a terminal. A command that waits for input hangs until the tool times out, full-screen programs print escape codes, and a REPL forgets everything between turns. tui-use gives the agent a real terminal it can see and type into, across as many turns as it needs.

```
claude mcp add tui-use -- npx -y @pavanmanishd/tui-use@1.0.0 mcp
```

![Claude Code squashing three commits with git rebase -i through tui-use](assets/demo.gif)

Claude Code (Opus) squashing three commits with `git rebase -i` through tui-use: it rewrites the todo list with `:2,3s/^pick/squash/`, replaces the combined message, and saves. This is the terminal the agent drove, as tui-use recorded it.

## What the agent sees

Every call that changes something returns the screen as numbered text. The cursor is `[x]`, and highlighted text such as the selected menu item is wrapped in `«…»`.

```
session s1 · git rebase -i HEAD~3 · 120x40 · cursor 2:1 · alt · running · idle 310ms
───
 1│pick 3f2a1c0 Add parser
 2│[s]quash 9b4e7d2 Fix parser edge case
 3│squash 1d8c5aa Rename parser module
 4│
 5│# Rebase 7c0e2b1..1d8c5aa onto 7c0e2b1 (3 commands)
 …
40│"~/repo/.git/rebase-merge/git-rebase-todo" 27L, 1189C
```

After the first screen, `tui_send` returns only the rows that changed:

```
session s1 · python3 · 120x40 · cursor 6:5 · normal · running · idle 312ms
───
 4│>>> sum(x) * 2
 5│42
 6│>>> [ ]
(3 of 40 rows changed)
```

## Install

tui-use needs Node.js 22 or later on macOS or Linux (on Windows, use WSL). It ships prebuilt terminal binaries for x64 and arm64, so nothing compiles during install.

### Claude Code

```
claude mcp add tui-use -- npx -y @pavanmanishd/tui-use@1.0.0 mcp
```

Or install the plugin, which also adds a skill that tells Claude when to use tui-use instead of the shell:

```
/plugin install tui-use --marketplace pavanmanishd/tui-use
```

### Codex

`~/.codex/config.toml`:

```toml
[mcp_servers.tui-use]
command = "npx"
args = ["-y", "@pavanmanishd/tui-use@1.0.0", "mcp"]
```

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "tui-use": { "command": "npx", "args": ["-y", "@pavanmanishd/tui-use@1.0.0", "mcp"] }
  }
}
```

### Gemini CLI

`~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "tui-use": { "command": "npx", "args": ["-y", "@pavanmanishd/tui-use@1.0.0", "mcp"] }
  }
}
```

### OpenCode

`opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "tui-use": {
      "type": "local",
      "command": ["npx", "-y", "@pavanmanishd/tui-use@1.0.0", "mcp"],
      "enabled": true
    }
  }
}
```

### Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tui-use": { "command": "npx", "args": ["-y", "@pavanmanishd/tui-use@1.0.0", "mcp"] }
  }
}
```

### Any agent with a shell

```
npm install -g @pavanmanishd/tui-use@1.0.0
tui-use start "npm init" --name init
tui-use send init --text "my-app" --key enter
```

## MCP tools

| Tool | What it does |
|---|---|
| `tui_start` | Start a program and return its first screen. Params: `command`, `cwd`, `env`, `cols`, `rows`, `name`, `wait`. |
| `tui_send` | Type `text`, a `secret_env` value and `keys` (or an ordered `input` list), wait, and return the new screen. `paste: true` sends a bracketed paste. `mode` is `diff` by default. |
| `tui_snapshot` | Return the screen without sending input. `styles: "none"` drops the `«…»` marks. |
| `tui_wait` | Wait without sending input, for builds and installs. |
| `tui_scrollback` | Read output that scrolled off screen, by line range (`[-50, -1]`) or `search`. |
| `tui_manage` | `list`, `kill` (SIGTERM, then SIGKILL after 2 s), `resize`, or `recording` (the asciinema file path). |

Saving and quitting vim in one call:

```json
{ "session": "s1", "input": [{ "key": "esc" }, { "text": ":wq" }, { "key": "enter" }] }
```

Key names: `enter`, `tab`, `esc`, `backspace`, `delete`, `up`, `down`, `left`, `right`, `home`, `end`, `pageup`, `pagedown`, `space`, `f1` to `f12`, any single character, with `ctrl+`, `alt+` or `shift+` in front (`ctrl+c`, `shift+tab`). An unknown name is an error, never typed as text.

### Waiting

By default a call returns once the program has printed something and then gone quiet for 300 ms with an unchanged screen, or after 5 s. If the program is still drawing (a spinner, a slow install), the response ends with a note saying so. For slow programs, pass a wait object:

| Field | Returns when |
|---|---|
| `text` | this substring is on screen |
| `regex` | this pattern matches the screen |
| `gone` | this substring has left the screen |
| `idle_ms` | no output for this long |
| `exit` | the program exits |
| `timeout_ms` | upper bound, default 5000, max 600000 |

Conditions combine with OR, and the response names the one that fired.

## CLI

The CLI covers the same operations for agents that only have a shell. Sessions live in a background daemon, so they survive between shell calls.

```
tui-use start "npm init" --name init
tui-use send init --text "my-app" --key enter
tui-use send init --input esc ":wq" enter
tui-use snapshot init --diff
tui-use wait init --text "Is this OK?" --timeout 10000
tui-use scrollback init --search error
tui-use list
tui-use kill init
tui-use attach init
tui-use replay ~/.local/share/tui-use/recordings/20261121-101500-s1.cast
```

`--json` prints the raw response. Exit codes: 0 ok, 1 request error, 2 usage error, 3 wait timed out. Quote commands that have their own flags: `tui-use start "git rebase -i HEAD~3"`.

## Watch the agent, or take over

`tui-use attach <session>` mirrors a session in your terminal while the agent works. Anything you type goes to the program too, and the agent's screen header shows `human attached (rw)` while you are there. Press `ctrl+]` to detach; the session keeps running.

## Security

- tui-use runs commands as you, with the environment of the agent that asked. It adds no privilege the agent's shell tool didn't already have, and it is not a sandbox.
- One daemon per user listens on a unix socket in a directory only you can read. Clients refuse to connect if that directory is a symlink, belongs to someone else, or is readable by other users.
- `secret_env` names an environment variable of the tui-use process (for example one set in your MCP config). Its value is typed into the program and replaced with `***` anywhere it would appear in a screen, scrollback, search result or recording. List those variables in `TUI_USE_SECRETS=SSH_PASS,DB_PASS` so they are not copied into the environment of the programs tui-use starts.
- Sessions an MCP client starts are killed when that client disconnects. Another MCP client can read them but cannot type into them.
- Every session is recorded as an asciinema v2 file under `~/.local/share/tui-use/recordings`. Recordings never contain input, and they are deleted after 7 days.

## Configuration

`~/.config/tui-use/config.json`, all keys optional:

```json
{
  "maxSessions": 8,
  "idleTimeoutMinutes": 30,
  "scrollbackLines": 10000,
  "recordings": true,
  "recordingRetentionDays": 7,
  "deny": ["^rm -rf /", "^sudo "]
}
```

`deny` holds regular expressions; a matching command is refused before anything runs. An unknown key stops the daemon from starting, so a typo can't silently do nothing.

## TUI-Bench

TUI-Bench is 40 interactive tasks (editors, git, prompts, REPLs, full-screen apps, ssh and pickers), each in a Docker container with a scripted checker. It runs real agent CLIs (Claude Code, Gemini CLI and OpenCode) with the shell tool only, then with tui-use added, and reports success rate, turns, tokens and wall time. See [bench/README.md](bench/README.md) to reproduce it.

Results will be published here after the first full run.

## Compared with other tools

Based on each project's README in November 2026.

| | tui-use | terminal-use (`tu`) | mcp-interactive-terminal | pexpect-mcp | tmux MCP servers |
|---|---|---|---|---|---|
| MCP server | yes | no, CLI | yes | yes | yes |
| CLI for agents with only a shell | yes | yes | no | no | no |
| Full terminal emulator | xterm.js | alacritty | xterm.js | no (pexpect) | tmux |
| Input, wait and new screen in one call | yes | no, separate commands | yes | not documented | varies |
| Diff of changed rows | yes | not documented | not documented | no | not documented |
| Selected items marked in text | yes | not documented | not documented | no | not documented |
| Secrets kept out of output | yes | not documented | not documented | not documented | not documented |
| Human watches live | yes, and can type | yes, watch only | not documented | not documented | yes (tmux attach) |
| Mouse input | not yet | yes | not documented | not documented | not documented |
| Recordings | asciinema | not documented | not documented | not documented | not documented |
| Benchmark | TUI-Bench | no | no | no | no |

## Development

```
npm ci
npm run lint && npm run typecheck
npm test                  # unit tests
npm run test:integration  # real programs in real terminals; ssh test needs Docker
```

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
