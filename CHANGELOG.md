# Changelog

## 1.1.0

- Snapshots fold three or more identical rows, such as vim's `~` filler, into one line that keeps the row numbers. A full-screen vim snapshot is about a third smaller.
- When the only thing still changing is a few characters on one row, such as a spinner or a percentage, calls return after about half a second with a note naming the row, instead of waiting for the 5 second timeout.
- When a row has highlights in several colours, the one with the most contrast keeps `«…»` and fainter ones get `‹…›`, so yes/no dialogs and tab bars show which item is active.
- Mouse input: `click`, `double_click`, `right_click`, `middle_click`, `scroll_up` and `scroll_down` at a row and column, for programs that turn on mouse reporting.
- PNG screenshots: `image: true` on `tui_snapshot`, or `tui-use screenshot`.
- Emoji and other wide characters use Unicode 11 widths, so cursor columns line up with modern terminals.
- Releases publish through npm trusted publishing and can be rerun after a partial failure.

## 1.0.0

- First release: terminal sessions with numbered text snapshots, diffs, highlight marks, settle detection and wait conditions; the MCP server with six tools; the CLI with a background daemon and `attach`; secret input that never appears in output; asciinema recordings; the Claude Code plugin; and TUI-Bench.
