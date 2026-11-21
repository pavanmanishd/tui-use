#!/bin/bash
set -euo pipefail
export OPS_PASSWORD='Maple-Stone-58'
tui-use start "sftp ops@localhost" --name ftp --until-text 'yes/no' --timeout 10000 >/dev/null
tui-use send ftp --text yes --key enter --until-text "password:" --timeout 5000 >/dev/null
tui-use send ftp --secret-env OPS_PASSWORD --key enter --until-text 'sftp>' --timeout 10000 >/dev/null
tui-use send ftp --input "get /home/ops/reports/q3-summary.csv /home/agent/work/downloads/" enter >/dev/null
tui-use send ftp --input "put /home/agent/work/release/build-2417.tar.gz /home/ops/incoming/" enter >/dev/null
tui-use send ftp --input bye enter --until-exit --timeout 5000 >/dev/null
