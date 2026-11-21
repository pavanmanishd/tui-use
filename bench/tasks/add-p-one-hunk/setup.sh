#!/bin/bash
set -euo pipefail
repo=/home/agent/work/shop
mkdir -p "$repo" && cd "$repo"
git init -q
cat > pagination.py <<'PY'
import logging

log = logging.getLogger(__name__)


def page_count(total, size):
    return (total + size - 1) // size


def clamp(page, pages):
    return max(0, min(page, pages - 1))


def validate(size):
    if size <= 0:
        raise ValueError("size must be positive")
    return size


def paginate(items, page, size):
    size = validate(size)
    start = page * size
    end = start + size + 1
    return items[start:end]
PY
export GIT_AUTHOR_DATE="2024-06-10T08:00:00+0000" GIT_COMMITTER_DATE="2024-06-10T08:00:00+0000"
git add -A
git commit -q -m "Add pagination helpers"
mkdir -p /root/.bench
git rev-parse HEAD > /root/.bench/add-p-one-hunk.base
sed 's/end = start + size + 1/end = start + size/' pagination.py | git hash-object --stdin > /root/.bench/add-p-one-hunk.fixed
sed -i -e 's/end = start + size + 1/end = start + size/' -e '/^log = /a log.setLevel(logging.DEBUG)' pagination.py
git hash-object pagination.py > /root/.bench/add-p-one-hunk.worktree
chown -R agent:agent /home/agent/work
