# Delegated run: Grok 4.7 and DeepSeek V4.1 Flash on the locked-down tasks

Each agent ran on the host through T3 Code and worked inside the task's container with `docker exec -u agent`, under rules that ruled out `-t`, root, `docker cp` and reading `/bench`. `bench/runner/cli.ts prepare` ran setup before the agent and `check` ran the checker after it. In the tui-use condition the prompt pointed the agent at the `tui-use` CLI. One repeat per cell.

| Task | Grok 4.7, shell only | Grok 4.7, with tui-use | DeepSeek V4.1 Flash, shell only | DeepSeek V4.1 Flash, with tui-use |
|---|---|---|---|---|
| quiz-dynamic | pass | pass | pass | pass |
| ssh-forcecommand-menu | pass | pass | pass | pass |
| ssh-expired-password | pass | pass | pass | pass |
| gdb-multi-breakpoint | pass | pass | pass | pass |
| whiptail-wizard | pass | pass | pass | pass |

20 of 20 runs passed. With tui-use, both agents drove each program directly. Without it, both built a terminal another way:

- Grok used ssh for the quiz, getting a terminal from `ssh -tt`.
- DeepSeek used `SSH_ASKPASS` and a bash coprocess for the expired-password login. In gdb it called `openpty()` inside the program being debugged and swapped its `/dev/tty` handle for the pty. For the quiz it hand-encoded a small aarch64 ELF that unlocks a `/dev/ptmx` master, then fed answers through it. For the wizard it built a similar pty bridge.

DeepSeek also wrote scratch scripts into the host checkout during its shell-only runs; they were deleted afterwards.

Codex (GPT-6 Luna) was not run: it still fails before any work with `Unsupported service_tier: flex`. Gemini CLI was not run because no Gemini key or working Gemini provider was available.
