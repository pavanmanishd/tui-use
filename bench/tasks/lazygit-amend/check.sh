#!/bin/bash
set -euo pipefail
cd /home/agent/work/shop
git() { command git -c safe.directory='*' "$@"; }
[ "$(git rev-list --count HEAD)" = 2 ]
[ "$(git log -1 --format=%B HEAD | sed '/^$/d')" = "Add discount codes to the cart" ]
[ "$(git log -1 --format=%s HEAD~1)" = "Initial commit" ]
[ "$(git diff --name-only HEAD~1 HEAD | sort | tr '\n' ' ')" = "CHANGELOG.md src/cart.py " ]
[ "$(git show HEAD:CHANGELOG.md)" = "$(printf '# Changelog\n\n## Unreleased\n\n- Cart totals include tax\n- Discount codes in the cart')" ]
[ "$(git show HEAD:TODO.md)" = "$(printf '# TODO\n\n- Write tests for checkout')" ]
[ "$(cat TODO.md)" = "$(printf '# TODO\n\n- Write tests for checkout\n- Expire old discount codes')" ]
[ -z "$(git diff --name-only HEAD -- CHANGELOG.md src)" ]
