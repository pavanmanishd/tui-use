#!/bin/bash
set -euo pipefail
cd /home/agent/work
cat > stats.py <<'PY'
def discount(n):
    return n // 10


def summarize(items):
    count = 0
    counter = {}
    for item in items:
        count += 1
        counter[item.kind] = counter.get(item.kind, 0) + 1
    account = items[0].account if items else None
    count_max = max(counter.values(), default=0)
    print("count:", count, "max:", count_max)
    return {"count": count, "account": account, "discount": discount(count)}
PY
chown -R agent:agent /home/agent/work
