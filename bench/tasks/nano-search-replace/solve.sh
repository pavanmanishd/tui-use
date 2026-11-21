#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start "nano deploy.env" --name ed --until-text deploy.env >/dev/null
tui-use send ed --key alt+r --until-text "Search (to replace)" >/dev/null
tui-use send ed --text staging.example.com --key enter --until-text "Replace with" >/dev/null
tui-use send ed --text prod.example.com --key enter --until-text "Replace this instance?" >/dev/null
tui-use send ed --input a --until-regex "Replaced [0-9]+ occurrences" >/dev/null
tui-use send ed --key ctrl+s --until-text "Wrote" >/dev/null
tui-use send ed --key ctrl+x --until-exit >/dev/null
