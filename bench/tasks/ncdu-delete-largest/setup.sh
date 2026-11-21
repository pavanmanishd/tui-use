#!/bin/bash
set -euo pipefail
cd /home/agent/work
mkdir -p data && cd data
blob() { mkdir -p "$(dirname "$1")"; head -c "$2" /dev/urandom > "$1"; }
for i in $(seq 1 9); do blob "assets/img/banner-$i.png" 1048576; done
blob backups/2024-05/db.dump 4194304
blob backups/2024-06/db.dump 4194304
blob backups/2024-06/files.tar 2097152
blob backups/2024-07/db.dump 2097152
for i in $(seq 1 400); do blob "cache/obj/$((i % 16))/entry-$i.bin" 20480; done
for i in $(seq 1 6); do blob "logs/app-$i.log" 524288; done
blob dump.bin 14680064
find . -type f | sort > /root/.ncdu-delete-largest.files
chown -R agent:agent /home/agent/work
