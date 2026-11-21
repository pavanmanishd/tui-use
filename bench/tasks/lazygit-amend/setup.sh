#!/bin/bash
set -euo pipefail
mkdir -p /home/agent/work/shop/src
cd /home/agent/work/shop
git init -q
export GIT_AUTHOR_DATE="2024-05-01T10:00:00Z" GIT_COMMITTER_DATE="2024-05-01T10:00:00Z"
printf '# Shop\n\nA tiny shop backend.\n' > README.md
printf '# Changelog\n\n## Unreleased\n\n- Cart totals include tax\n' > CHANGELOG.md
printf '# TODO\n\n- Write tests for checkout\n' > TODO.md
printf 'def total(items):\n    return sum(i.price * i.qty for i in items)\n' > src/cart.py
git add .
git commit -qm "Initial commit"
export GIT_AUTHOR_DATE="2024-05-02T10:00:00Z" GIT_COMMITTER_DATE="2024-05-02T10:00:00Z"
cat > src/cart.py <<'PY'
def total(items, code=None):
    amount = sum(i.price * i.qty for i in items)
    if code == "SPRING10":
        amount *= 0.9
    return amount
PY
git commit -qam "Add discount codes to the cart"
printf '# Changelog\n\n## Unreleased\n\n- Cart totals include tax\n- Discount codes in the cart\n' > CHANGELOG.md
printf '# TODO\n\n- Write tests for checkout\n- Expire old discount codes\n' > TODO.md
chown -R agent:agent /home/agent/work
