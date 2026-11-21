#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start "npm create vite@6.5.0" --name vite --until-regex "Ok to proceed|Project name" --timeout 120000 >/dev/null
if tui-use snapshot vite | grep -q "Ok to proceed"; then
  tui-use send vite --key enter --until-text "Project name" --timeout 120000 >/dev/null
fi
tui-use send vite --text dashboard --key enter --until-text "Select a framework" >/dev/null
tui-use send vite --key down --key down --until-text "● React" >/dev/null
tui-use send vite --key enter --until-text "Select a variant" >/dev/null
tui-use send vite --key enter --until-exit --timeout 30000 >/dev/null
