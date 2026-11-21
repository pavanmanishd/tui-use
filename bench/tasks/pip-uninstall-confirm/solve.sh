#!/bin/bash
set -euo pipefail
tui-use start "sudo pip uninstall tinyfmt" --name pip --until-text "Proceed (Y/n)?" --timeout 30000 >/dev/null
tui-use send pip --text y --key enter --until-exit --timeout 30000 >/dev/null
