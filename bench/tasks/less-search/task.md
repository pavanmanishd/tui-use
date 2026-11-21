---
category: full-screen
---
`/home/agent/work/logs/app.log` is a large application log. Somewhere in it there is exactly one ERROR entry reporting a "ledger checksum mismatch". The line directly after that ERROR line holds the `request_id` of the failed request.

Use `less` to find that entry. Write the request id (it looks like `req-` followed by 10 hex characters) to `/home/agent/work/answer.txt`, on a single line.
