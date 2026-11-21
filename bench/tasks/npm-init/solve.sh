#!/bin/bash
set -euo pipefail
cd /home/agent/work/greeter
tui-use start "npm init" --name init --until-text "package name:" --timeout 30000 >/dev/null
tui-use send init --text greeter-cli --key enter --until-text "version:" >/dev/null
tui-use send init --text 2.1.0 --key enter --until-text "description:" >/dev/null
tui-use send init --text "Prints friendly greetings" --key enter --until-text "entry point:" >/dev/null
tui-use send init --text cli.js --key enter --until-text "test command:" >/dev/null
tui-use send init --key enter --until-text "git repository:" >/dev/null
tui-use send init --key enter --until-text "keywords:" >/dev/null
tui-use send init --key enter --until-text "author:" >/dev/null
tui-use send init --key enter --until-text "license:" >/dev/null
tui-use send init --text MIT --key enter --until-text "Is this OK?" >/dev/null
tui-use send init --key enter --until-exit --timeout 15000 >/dev/null
