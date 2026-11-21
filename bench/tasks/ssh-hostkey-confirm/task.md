---
category: remote
---
There is an SSH server on `localhost` (port 22) that you have never connected to. The account is `ops` and its password is `Copper-Field-17`.

Connect with ssh as `ops@localhost`. When ssh asks whether to trust the server's host key, accept it so that it is saved to your `~/.ssh/known_hosts`; do not turn off host key checking or point ssh at a different known_hosts file. Then, on the server, create the file `/home/ops/hello.txt` containing the single line `hostkey ok`.
