---
category: git
---
The git repository `/home/agent/work/api-client` has staged changes. Commit them by running `git commit` without `-m` or `-F`, and write the commit message in the editor (vim) that git opens. The message must be exactly these four lines: the subject line, one blank line, and a two-line body:

```
Add rate limiter to API client

Requests are now limited to 10 per second per host.
The limit can be changed with the RATE_LIMIT_RPS variable.
```

After the commit, nothing may be left staged or modified.
