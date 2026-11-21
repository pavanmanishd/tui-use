---
category: git
---
In the git repository `/home/agent/work/shop`, the file `pagination.py` has two uncommitted changes: a debug logging line near the top and a fix for an off-by-one bug in `paginate` (`end = start + size + 1` becomes `end = start + size`). Use `git add -p` to stage only the off-by-one fix, then commit it with the message `Fix off-by-one in paginate`. The debug logging change must stay in the working tree as an unstaged, uncommitted change, and nothing else may be staged.
