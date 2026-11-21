#!/bin/bash
set -euo pipefail
cd /home/agent/work/shop
selected() { tui-use snapshot lg | grep -qE "«[^»]*$1[^»]*»"; }
tui-use start lazygit --name lg --until-text "Press <enter> to get started" --timeout 15000 >/dev/null
tui-use send lg --key enter --until-gone "get started" --timeout 5000 >/dev/null
selected "M CHANGELOG\.md" || tui-use send lg --key down >/dev/null
selected "M CHANGELOG\.md"
tui-use send lg --key space >/dev/null
tui-use send lg --key A --until-text "Amend last commit" --timeout 5000 >/dev/null
tui-use send lg --key enter --until-gone "Amend last commit" --timeout 5000 >/dev/null
tui-use send lg --key q --until-exit --timeout 5000 >/dev/null
