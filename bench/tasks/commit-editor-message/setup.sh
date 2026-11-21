#!/bin/bash
set -euo pipefail
repo=/home/agent/work/api-client
mkdir -p "$repo" && cd "$repo"
git init -q
export GIT_AUTHOR_DATE="2024-08-20T16:00:00+0000" GIT_COMMITTER_DATE="2024-08-20T16:00:00+0000"
printf 'import urllib.request\n\n\ndef get(url):\n    return urllib.request.urlopen(url).read()\n' > client.py
git add -A
git commit -q -m "Add API client"
cat > ratelimit.py <<'PY'
import os
import time

RPS = float(os.environ.get("RATE_LIMIT_RPS", "10"))


class RateLimiter:
    def __init__(self, rps=RPS):
        self.interval = 1.0 / rps
        self.last = {}

    def wait(self, host):
        now = time.monotonic()
        delay = self.last.get(host, 0) + self.interval - now
        if delay > 0:
            time.sleep(delay)
        self.last[host] = time.monotonic()
PY
git add ratelimit.py
mkdir -p /root/.bench
git rev-parse HEAD > /root/.bench/commit-editor-message.base
git write-tree > /root/.bench/commit-editor-message.tree
chown -R agent:agent /home/agent/work
