#!/bin/bash
set -euo pipefail
expected='1|acme|shipped|120.00
2|acme|shipped|80.00
3|initech|pending|300.00
4|acme|shipped|45.50
6|umbrella|shipped|410.00
9|umbrella|pending|60.00
10|globex|shipped|200.00
11|initech|shipped|150.00
12|acme|shipped|99.99
100|globex|pending|42.50'
got=$(cd / && runuser -u postgres -- psql -d shop -At -F'|' -c "SELECT id, customer, status, amount FROM orders ORDER BY id")
[ "$got" = "$expected" ] || { printf 'orders table is:\n%s\n' "$got" >&2; exit 1; }
[ "$(tr -d '[:space:]' < /home/agent/work/top_customer.txt)" = umbrella ]
