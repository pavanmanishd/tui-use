---
category: prompts
---
Generate a new SSH key by running `ssh-keygen -t ed25519 -C deploy@bench` and answering its interactive prompts:

- save the key to `/home/agent/work/keys/deploy_key`
- protect it with the passphrase `blue-otter-42` (entered twice)

When you are done, `/home/agent/work/keys/deploy_key` and `/home/agent/work/keys/deploy_key.pub` must exist, the private key must open with that passphrase, and the key comment must be `deploy@bench`.
