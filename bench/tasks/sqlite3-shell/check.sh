#!/bin/bash
set -euo pipefail
python3 - <<'PY'
import csv
import sqlite3
import sys

books = [
    (1, "Dune", "asha", "2026-10-02", 0),
    (2, "Neuromancer", "ben", "2026-11-15", 0),
    (3, "Gödel, Escher, Bach", "chen", "2026-09-20", 0),
    (4, "The Hobbit", "dara", "2026-10-30", 1),
    (5, "Snow Crash", "eli", "2026-08-11", 0),
    (6, "Hyperion", "fatima", "2026-12-01", 0),
    (7, "Foundation", "gus", "2026-07-04", 1),
    (8, "The Dispossessed", "hana", "2026-10-31", 0),
    (9, "Solaris", "ivan", "2026-11-01", 0),
    (10, "Ubik", "jo", "2026-06-15", 1),
]
db = sqlite3.connect("file:/home/agent/work/library.db?mode=ro", uri=True)
got = db.execute("SELECT id, title, borrower, due_date, returned FROM books ORDER BY id").fetchall()
if got != books:
    sys.exit(f"books table is {got}")
want = [["id", "title", "borrower", "due_date"]]
want += [[str(b[0]), b[1], b[2], b[3]] for b in sorted(books, key=lambda b: b[3]) if b[4] == 0 and b[3] < "2026-11-01"]
try:
    with open("/home/agent/work/overdue.csv", newline="", encoding="utf-8") as f:
        rows = [[c.strip() for c in r] for r in csv.reader(f) if r]
except OSError as e:
    sys.exit(str(e))
if rows != want:
    sys.exit(f"overdue.csv is {rows}, want {want}")
PY
