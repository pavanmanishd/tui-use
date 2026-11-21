#!/bin/bash
set -euo pipefail
key=/home/agent/work/keys/deploy_key
read -r type blob comment < "$key.pub"
[ "$type" = ssh-ed25519 ]
[ "$comment" = deploy@bench ]
derived=$(ssh-keygen -y -P blue-otter-42 -f "$key")
[ "$(echo "$derived" | cut -d' ' -f1,2)" = "$type $blob" ]
! ssh-keygen -y -P "" -f "$key" >/dev/null 2>&1
