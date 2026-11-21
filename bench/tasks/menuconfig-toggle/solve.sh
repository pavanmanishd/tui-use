#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start menuconfig --name kc --until-text Networking --timeout 10000 >/dev/null
tui-use send kc --input down enter --until-text "Export Prometheus metrics" --timeout 5000 >/dev/null
tui-use send kc --input down space --until-text "Metrics port" --timeout 5000 >/dev/null
tui-use send kc --key esc --until-text Caching --timeout 5000 >/dev/null
tui-use send kc --input down enter down enter --until-text "(int)" --timeout 5000 >/dev/null
tui-use send kc --input backspace backspace backspace backspace 256 enter --until-text "(256)" --timeout 5000 >/dev/null
tui-use send kc --key S --until-text "Filename to save" --timeout 5000 >/dev/null
tui-use send kc --key enter --until-text "Configuration saved" --timeout 5000 >/dev/null
tui-use send kc --key enter --until-gone "Configuration saved" --timeout 5000 >/dev/null
tui-use send kc --key Q --until-exit --timeout 5000 >/dev/null
