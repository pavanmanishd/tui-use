#!/bin/bash
set -euo pipefail
expected=$(cat <<'PY'
def discount(n):
    return n // 10


def summarize(items):
    total = 0
    counter = {}
    for item in items:
        total += 1
        counter[item.kind] = counter.get(item.kind, 0) + 1
    account = items[0].account if items else None
    count_max = max(counter.values(), default=0)
    print("total:", total, "max:", count_max)
    return {"total": total, "account": account, "discount": discount(total)}
PY
)
[ "$(cat /home/agent/work/stats.py)" = "$expected" ]
