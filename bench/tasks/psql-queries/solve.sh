#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start "psql shop" --name pg --until-text "shop=>" --timeout 30000 >/dev/null
tui-use send pg --text "UPDATE orders SET status = 'shipped' WHERE customer = 'acme' AND status = 'pending';" --key enter --until-text "UPDATE 3" >/dev/null
tui-use send pg --text "DELETE FROM orders WHERE status = 'cancelled';" --key enter --until-text "DELETE 3" >/dev/null
tui-use send pg --text "INSERT INTO orders VALUES (100, 'globex', 'pending', 42.50);" --key enter --until-text "INSERT 0 1" >/dev/null
tui-use send pg --text "\\copy (SELECT customer FROM orders GROUP BY customer ORDER BY sum(amount) DESC LIMIT 1) TO '/home/agent/work/top_customer.txt'" --key enter --until-text "COPY 1" >/dev/null
tui-use send pg --text "\\q" --key enter --until-exit --timeout 10000 >/dev/null
