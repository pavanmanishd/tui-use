#!/bin/bash
set -euo pipefail
export OLD_PASSWORD='Maple-Stone-73' NEW_PASSWORD='Quartz-River-58'
tui-use start "ssh dev@localhost" --name dev --until-regex 'yes/no|password:' --timeout 10000 >/dev/null
if tui-use snapshot dev | grep -q 'yes/no'; then
  tui-use send dev --text yes --key enter --until-text "password:" --timeout 5000 >/dev/null
fi
tui-use send dev --secret-env OLD_PASSWORD --key enter --until-text 'Current password:' --timeout 10000 >/dev/null
tui-use send dev --secret-env OLD_PASSWORD --key enter --until-text "New password:" --timeout 5000 >/dev/null
tui-use send dev --secret-env NEW_PASSWORD --key enter --until-regex '[Rr]etype new password:' --timeout 5000 >/dev/null
tui-use send dev --secret-env NEW_PASSWORD --key enter --until-exit --timeout 10000 >/dev/null
