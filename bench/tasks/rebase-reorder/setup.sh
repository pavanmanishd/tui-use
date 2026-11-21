#!/bin/bash
set -euo pipefail
repo=/home/agent/work/cli-tool
mkdir -p "$repo" && cd "$repo"
git init -q
n=0
commit() {
  n=$((n + 1))
  export GIT_AUTHOR_DATE="2024-04-02T09:0$n:00+0000" GIT_COMMITTER_DATE="2024-04-02T09:0$n:00+0000"
  git add -A
  git commit -q -m "$1"
}
printf '# cli-tool\n' > README.md
commit "Initial commit"
printf 'import json\n\n\ndef load_config(path):\n    with open(path) as f:\n        return json.laod(f)\n' > config.py
commit "Add config loader"
printf '# cli-tool\n\n## Usage\n\n    cli-tool --config config.json\n' > README.md
commit "Add README usage section"
printf 'import json\n\n\ndef load_config(path):\n    with open(path) as f:\n        return json.load(f)\n' > config.py
commit "Fix typo in config loader"
mkdir -p /root/.bench
{
  git rev-parse 'HEAD^{tree}'
  git rev-parse 'HEAD~2^{tree}'
  git rev-parse HEAD~3
  git rev-parse HEAD~3:README.md
  git rev-parse HEAD:config.py
} > /root/.bench/rebase-reorder
chown -R agent:agent /home/agent/work
