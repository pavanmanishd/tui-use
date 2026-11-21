---
category: remote
---
The SSH server on `localhost` (port 22) has an account `ops` with the password `Maple-Stone-58`. Accept the server's host key when asked.

Use an interactive `sftp` session as `ops@localhost` to do two transfers:

1. Download `/home/ops/reports/q3-summary.csv` from the server into the local directory `/home/agent/work/downloads/` (keep the file name).
2. Upload the local file `/home/agent/work/release/build-2417.tar.gz` to the server directory `/home/ops/incoming/` (keep the file name).

Both copies must be byte-for-byte identical to their originals.
