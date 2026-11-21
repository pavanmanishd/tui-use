---
category: git
---
In the git repository `/home/agent/work/service`, a merge of branch `feature` into `main` is in progress and stopped with conflicts in `config.yml`. Resolve the conflicts with `git mergetool --tool=vimdiff`: take the `feature` side for the `port` line (`port: 8443`) and keep the `main` side for the `log_level` line (`log_level: warn`). Every other line of `config.yml` must stay as it is, with no conflict markers left. Then complete the merge by committing it, so that `main` ends with a merge commit whose parents are the previous `main` commit and `feature`.
