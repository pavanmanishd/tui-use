#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start python3 --name py --until-text ">>>" --timeout 30000 >/dev/null
tui-use send py --text "import sensor" --key enter >/dev/null
tui-use send py --text "s = sensor.Sensor()" --key enter --until-text "ready" --timeout 30000 >/dev/null
tui-use send py --text "s.zero()" --key enter >/dev/null
tui-use send py --text "r = [s.read() for _ in range(3)]" --key enter >/dev/null
tui-use send py --text "open('/home/agent/work/readings.txt', 'w').write(''.join(f'{v}{chr(10)}' for v in r))" --key enter >/dev/null
tui-use send py --key ctrl+d --until-exit --timeout 10000 >/dev/null
