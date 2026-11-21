#!/bin/bash
set -euo pipefail
repo=/home/agent/work/search-app
mkdir -p "$repo" && cd "$repo"
git init -q
n=0
commit() {
  n=$((n + 1))
  export GIT_AUTHOR_DATE="2024-03-01T10:0$n:00+0000" GIT_COMMITTER_DATE="2024-03-01T10:0$n:00+0000"
  git add -A
  git commit -q -m "$1"
}
printf '# search-app\n' > README.md
commit "Initial commit"
printf 'class User:\n    def __init__(self, name):\n        self.name = name\n' > user.py
commit "Add user model"
printf 'def search(users, q):\n    return [u for u in users if q in u.name]\n' > search.py
commit "Add search endpoint"
printf 'def search(users, q, page=0, size=10):\n    hits = [u for u in users if q in u.name]\n    return hits[page * size:(page + 1) * size]\n' > search.py
commit "Fix search pagination"
printf 'from search import search\n\n\ndef test_empty():\n    assert search([], "a") == []\n' > test_search.py
commit "Add search tests"
mkdir -p /root/.bench
git rev-parse 'HEAD^{tree}' > /root/.bench/rebase-squash-3.tree
git rev-parse HEAD~3 > /root/.bench/rebase-squash-3.base
chown -R agent:agent /home/agent/work
