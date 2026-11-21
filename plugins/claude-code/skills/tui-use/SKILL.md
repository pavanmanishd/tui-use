---
name: tui-use
description: Use when a command will wait for keyboard input or draw a full-screen UI, such as an editor, pager, interactive git command, installer prompt, password prompt, REPL, debugger, database shell, htop, fzf or ssh. Runs it in a real terminal through the tui_* tools instead of the shell tool.
---

# Interactive programs with tui-use

The shell tool has no terminal. Anything that waits for input hangs until it times out, and full-screen programs print escape codes. Use the `tui_*` tools for those commands.

## When to use it

- Editors and pagers: `vim`, `nano`, `less`, `man`, `git commit` without `-m`.
- Interactive git: `git rebase -i`, `git add -p`, `git mergetool`.
- Prompts: `npm init`, `npm create`, installers, `apt` confirmations, `ssh` passwords and host keys.
- REPLs and debuggers you need across several steps: `python`, `node`, `psql`, `sqlite3`, `gdb`, `pdb`.
- Full-screen apps and pickers: `htop`, `lazygit`, `tig`, `mc`, `fzf`, `gum`, `menuconfig`.

Keep using the shell tool for commands that run and exit on their own.

## How to drive a session

1. `tui_start` with the command. It returns a session id and the screen.
2. `tui_send` with `text`, `keys`, or an ordered `input` list. It waits for the program to settle and returns only the rows that changed.
3. Read the screen the way a person would. Rows are numbered, the cursor is `[x]`, and the highlighted item in a menu is wrapped in `«…»`.
4. For slow work (installs, builds, network), pass `wait: {text: "..."}` or `wait: {gone: "Installing"}` with a larger `timeout_ms`, or call `tui_wait`. If a response ends with "still changing", the program was not done; wait for a specific text.
5. When finished, quit the program normally or call `tui_manage` with `action: "kill"`.

## Examples

Save and quit vim:

```json
{ "session": "s1", "input": [{ "key": "esc" }, { "text": ":wq" }, { "key": "enter" }] }
```

Answer a password prompt without the password entering the transcript. The value comes from an environment variable of the tui-use server:

```json
{ "session": "s1", "secret_env": "SSH_PASSWORD", "keys": ["enter"] }
```

Pick the third item of a menu: send `down` twice, check the `«…»` mark is on the right item, then `enter`.

## Keys

`enter`, `tab`, `esc`, `backspace`, `delete`, `up`, `down`, `left`, `right`, `home`, `end`, `pageup`, `pagedown`, `space`, `f1` to `f12`, any single character, combined with `ctrl+`, `alt+` or `shift+` (for example `ctrl+c`, `ctrl+x`, `shift+tab`).
