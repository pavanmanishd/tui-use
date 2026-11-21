# TUI-Bench

TUI-Bench measures how well coding agents handle interactive terminal programs, with and without tui-use. It has 40 tasks in seven categories: editors, git, prompts, REPLs, full-screen apps, remote (ssh) and pickers.

Each task runs twice in a fresh Docker container:

- **shell**: the agent has only its own shell tool. tui-use is not installed and no MCP server is configured.
- **tui-use**: the same image with tui-use installed and registered as an MCP server.

The prompt, image contents and checker are the same in both conditions. A run passes when the task's checker accepts the final state of the container. Runs that take longer than 10 minutes are stopped and count as failures.

## Agents

The runner drives real agent CLIs in headless mode, pinned in the image:

| CLI | Version | Key |
|---|---|---|
| Claude Code | 2.1.329 | `ANTHROPIC_API_KEY` |
| Gemini CLI | 0.37.1 | `GEMINI_API_KEY` |
| OpenCode | 1.19.6 | `OPENROUTER_API_KEY` |

Models are listed in [runner/matrix.json](runner/matrix.json).

## Run it

You need Docker, Node.js 22 and the API keys for the CLIs you want to run.

```
npm ci && npm run build && npm pack
npx tsx bench/runner/cli.ts build-images
npx tsx bench/runner/cli.ts selftest                       # no API keys needed
npx tsx bench/runner/cli.ts run --cli claude-code --repeats 3 --jobs 4
npx tsx bench/runner/cli.ts report bench/results/<run-id>
```

`run` accepts `--task ID` and `--cli NAME` (both repeatable) and `--condition shell|tui-use`. Results go to `bench/results/<run-id>/results.jsonl`, one line per run, with the transcript of each run under `transcripts/`. `report.md` holds the summary table.

A full run is 40 tasks, five CLI and model pairs, two conditions and three repeats: 1,200 agent runs. Expect it to cost real money.

## Task format

Each task is a directory under `tasks/`:

| File | Runs as | Purpose |
|---|---|---|
| `task.md` | | Front matter with `category`, then the prompt the agent gets |
| `setup.sh` | root | Builds the starting state in `/home/agent/work` and starts any services |
| `check.sh` | root | Exits 0 only if the task was done correctly |
| `solve.sh` | agent | A reference solution driven through the `tui-use` CLI |

`selftest` checks every task without an agent: right after setup the checker must fail, and after `solve.sh` it must pass. CI runs it whenever `bench/` changes.

The agent user has passwordless sudo because some tasks need it (`apt`, `adduser`). Checkers keep their expected answers under `/root`, which the agent could read with sudo, so spot-check transcripts of passing runs.
