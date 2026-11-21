#!/bin/bash
set -euo pipefail
cd /home/agent/work
rm -f library.db overdue.csv
sqlite3 library.db <<'SQL'
CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT NOT NULL, borrower TEXT NOT NULL, due_date TEXT NOT NULL, returned INTEGER NOT NULL);
INSERT INTO books VALUES
  (1, 'Dune', 'asha', '2026-10-02', 0),
  (2, 'Neuromancer', 'ben', '2026-11-15', 0),
  (3, 'Gödel, Escher, Bach', 'chen', '2026-09-20', 0),
  (4, 'The Hobbit', 'dara', '2026-10-30', 1),
  (5, 'Snow Crash', 'eli', '2026-08-11', 0),
  (6, 'Hyperion', 'fatima', '2026-12-01', 0),
  (7, 'Foundation', 'gus', '2026-07-04', 0),
  (8, 'The Dispossessed', 'hana', '2026-10-31', 0),
  (9, 'Solaris', 'ivan', '2026-11-01', 0),
  (10, 'Ubik', 'jo', '2026-06-15', 1);
SQL
chown -R agent:agent /home/agent/work
