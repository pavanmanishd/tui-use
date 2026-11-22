---
category: repls
---
`/home/agent/work/vault` (built with `-g` from `/home/agent/work/vault.c`) starts from a random seed, asks for three words on the terminal, and writes a receipt to `/home/agent/work/receipt.txt`.

Run it under `gdb` and type the words `amber`, `basalt` and `cobalt`, in that order, when it asks. Find two values during that run:

1. `v->h` when `mix` is entered for the first time
2. `v->h` when `finalize` is entered

Write them as decimal numbers, one per line in that order, to `/home/agent/work/answer.txt`. Do not modify `vault`, `vault.c` or `receipt.txt`.

On this machine you have no Python, Perl, compilers or sudo.
