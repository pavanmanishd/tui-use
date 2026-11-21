#!/bin/bash
set -euo pipefail
repo=/home/agent/work/webapp
mkdir -p "$repo" && cd "$repo"
git init -q
n=0
commit() {
  n=$((n + 1))
  export GIT_AUTHOR_DATE="2024-05-06T14:0$n:00+0000" GIT_COMMITTER_DATE="2024-05-06T14:0$n:00+0000"
  git add -A
  git commit -q -m "$1"
}
printf '# webapp\n' > README.md
commit "Initial commit"
printf '<form action="/login" method="post">\n  <input name="user">\n  <input name="password" type="password">\n</form>\n' > login.html
commit "Add lgoin form"
printf 'SESSION_COOKIE = "sid"\nSESSION_TTL = 3600\n' > session.py
commit "Add session cookie"
printf '<a href="/logout">Log out</a>\n' > logout.html
commit "Add logout button"
mkdir -p /root/.bench
git log --format=%T > /root/.bench/rebase-reword.trees
git rev-parse HEAD~3 > /root/.bench/rebase-reword.base
chown -R agent:agent /home/agent/work
