#!/bin/bash
set -euo pipefail
cd /home/agent/work/api-client
tui-use start "GIT_EDITOR=vim git commit" --name cm --until-text "Please enter the commit message" >/dev/null
tui-use send cm --input i --until-text=INSERT >/dev/null
tui-use send cm --text $'Add rate limiter to API client\n\nRequests are now limited to 10 per second per host.\nThe limit can be changed with the RATE_LIMIT_RPS variable.' >/dev/null
tui-use send cm --input esc ":wq" enter --until-exit >/dev/null
