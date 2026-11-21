#!/bin/bash
set -euo pipefail
tui-use start "sudo apt install hello-tui" --name apt --until-text "Do you want to continue?" --timeout 60000 >/dev/null
tui-use send apt --text Y --key enter --until-exit --timeout 120000 >/dev/null
