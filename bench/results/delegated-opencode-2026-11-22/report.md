# Delegated run: OpenCode with DeepSeek V4.1 Flash

OpenCode ran on the host through T3 Code and worked inside each task's container with `docker exec`, so this is not the headless in-container setup the main bench uses. `bench/runner/cli.ts prepare` ran each task's setup before the agent and `check` ran the checker after it. In the tui-use condition the prompt pointed the agent at the `tui-use` CLI, since a delegated agent can't have tui-use attached as an MCP server. One repeat per cell.

| Task | Shell only | With tui-use |
|---|---|---|
| htop-kill | pass | pass |
| ssh-password-edit-restart | pass | pass |
| vim-recover-swap | pass | pass |
| mergetool-resolve | pass | pass |
| gdb-find-bug | pass | pass |
| whiptail-checklist | pass | pass |

12 of 12 runs passed. In the shell-only condition the agent wrote its own pty driver for the whiptail checklist, as Claude Code did for htop and ssh in the smoke run.

The same batch on Codex (GPT-6 Luna) failed before any work with `Unsupported service_tier: flex`, a provider configuration error, so it has no results.
