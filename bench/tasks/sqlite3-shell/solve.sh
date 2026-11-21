#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start "sqlite3 library.db" --name sq --until-text "sqlite>" --timeout 30000 >/dev/null
tui-use send sq --text "UPDATE books SET returned = 1 WHERE id = 7;" --key enter >/dev/null
tui-use send sq --text ".headers on" --key enter >/dev/null
tui-use send sq --text ".mode csv" --key enter >/dev/null
tui-use send sq --text ".output /home/agent/work/overdue.csv" --key enter >/dev/null
tui-use send sq --text "SELECT id, title, borrower, due_date FROM books WHERE returned = 0 AND due_date < '2026-11-01' ORDER BY due_date;" --key enter >/dev/null
tui-use send sq --text ".output stdout" --key enter >/dev/null
tui-use send sq --text ".quit" --key enter --until-exit --timeout 10000 >/dev/null
