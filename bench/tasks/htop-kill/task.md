---
category: full-screen
---
Several long-running processes owned by the user `agent` are running in this container: `ledger-sync-agent`, `ledger-sync-daemon`, `ledger-sync-worker` and `ledger-cache`. The `ledger-sync-daemon` process is misbehaving.

Use htop to find the `ledger-sync-daemon` process and kill it with htop's kill command (F9). Leave the other `ledger-*` processes running.
