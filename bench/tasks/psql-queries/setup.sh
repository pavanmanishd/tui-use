#!/bin/bash
set -euo pipefail
pg_ctlcluster 15 main start
runuser -u postgres -- psql -q -c "CREATE ROLE agent LOGIN" -c "CREATE DATABASE shop OWNER agent"
cd /home/agent/work
rm -f top_customer.txt
runuser -u agent -- psql -q -d shop <<'SQL'
CREATE TABLE orders (
  id integer PRIMARY KEY,
  customer text NOT NULL,
  status text NOT NULL,
  amount numeric(10, 2) NOT NULL
);
INSERT INTO orders VALUES
  (1, 'acme', 'pending', 120.00),
  (2, 'acme', 'shipped', 80.00),
  (3, 'initech', 'pending', 300.00),
  (4, 'acme', 'pending', 45.50),
  (5, 'globex', 'cancelled', 999.00),
  (6, 'umbrella', 'shipped', 410.00),
  (7, 'initech', 'cancelled', 50.00),
  (8, 'acme', 'cancelled', 15.00),
  (9, 'umbrella', 'pending', 60.00),
  (10, 'globex', 'shipped', 200.00),
  (11, 'initech', 'shipped', 150.00),
  (12, 'acme', 'pending', 99.99);
SQL
chown -R agent:agent /home/agent/work
