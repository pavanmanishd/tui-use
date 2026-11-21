---
category: repls
---
`/home/agent/work/keygen.py` creates a random session key on every run, prints only a fingerprint of it and then discards the key; it is never printed or saved. Run the program under the Python debugger with `python3 -m pdb keygen.py` (in `/home/agent/work`), stop inside `derive()` after `session_key` has been assigned, and read the value of `session_key`. Write that exact value (it looks like `1a2b3c4d-5e6f7a8b-9c0d1e2f-3a4b5c6d`) to `/home/agent/work/session_key.txt`.

The key you write must be the one created by that debugged run. Do not modify `keygen.py`.
