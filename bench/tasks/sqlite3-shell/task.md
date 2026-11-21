---
category: repls
---
`/home/agent/work/library.db` is a SQLite database with a `books` table (`id`, `title`, `borrower`, `due_date`, `returned`). Open it in the interactive `sqlite3` shell and:

1. Mark the book with id `7` as returned (set `returned` to `1`).
2. Then export every book that is still not returned (`returned = 0`) and has a `due_date` before `2026-11-01` to `/home/agent/work/overdue.csv`: CSV with a header row, columns `id,title,borrower,due_date` in that order, sorted by `due_date` ascending.

Do not change any other rows.
