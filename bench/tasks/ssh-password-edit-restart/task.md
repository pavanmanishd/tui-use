---
category: remote
---
A service runs under the account `ops` on the SSH server at `localhost` (port 22). The password for `ops` is `Harbor-Lamp-42`.

Log in over ssh as `ops@localhost` with that password. In the `ops` home directory, edit `~/app/app.conf` with vim or nano and change `workers = 2` to `workers = 6`, leaving the other lines as they are. Then restart the service by running `~/bin/restart-app` as `ops` in that ssh session.
