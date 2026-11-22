---
category: pickers
---
Run `sudo -u wizard /usr/local/bin/cluster-wizard`. It is a whiptail wizard that creates a cluster plan, and it saves the plan itself in a file you can't write. Go through it and choose:

- Region: the one the wizard marks as primary. Which region that is changes from machine to machine.
- Cluster name: `orion-blue`
- Node size: `m6.large`
- Add-ons: exactly `metrics` and `backups`, nothing else
- Confirm with Yes at the end.

On this machine you have no Python, Perl, compilers or general sudo; the only sudo command allowed is the one above.
