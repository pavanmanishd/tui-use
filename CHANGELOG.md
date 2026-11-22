# Changelog

## 1.1.0

- Snapshots fold three or more identical rows, such as vim's `~` filler, into one line that keeps the row numbers. A full-screen vim snapshot is about a third smaller.
- When the only thing still changing is a few characters on one row, such as a spinner or a percentage, calls return after about half a second with a note naming the row, instead of waiting for the 5 second timeout.
- When a row has highlights in several colours, the one with the most contrast keeps `«…»` and fainter ones get `‹…›`, so yes/no dialogs and tab bars show which item is active.
- Mouse input: `click`, `double_click`, `right_click`, `middle_click`, `scroll_up` and `scroll_down` at a row and column, for programs that turn on mouse reporting. Positions must be on screen, and programs that use the older byte encoding instead of SGR take columns and rows up to 95.
- PNG screenshots: `image: true` on `tui_snapshot`, or `tui-use screenshot`.
- Emoji and other wide characters use Unicode 11 widths, so cursor columns line up with modern terminals.
- TUI-Bench has five new tasks that take away the agent's own ways to get a terminal (sudo, Python, Perl, `script`, compilers, bundled pty modules), so they measure what tui-use adds when an agent can't improvise.
- Releases publish through npm trusted publishing and can be rerun after a partial failure.

## 1.0.0

- First release: terminal sessions with numbered text snapshots, diffs, highlight marks, settle detection and wait conditions; the MCP server with six tools; the CLI with a background daemon and `attach`; secret input that never appears in output; asciinema recordings; the Claude Code plugin; and TUI-Bench.
