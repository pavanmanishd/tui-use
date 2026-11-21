#!/bin/bash
set -euo pipefail
tui-use start "ssh-keygen -t ed25519 -C deploy@bench" --name kg --until-text "Enter file in which to save the key" --timeout 30000 >/dev/null
tui-use send kg --text /home/agent/work/keys/deploy_key --key enter --until-text "Enter passphrase" >/dev/null
tui-use send kg --text blue-otter-42 --key enter --until-text "Enter same passphrase again" >/dev/null
tui-use send kg --text blue-otter-42 --key enter --until-exit --timeout 15000 >/dev/null
