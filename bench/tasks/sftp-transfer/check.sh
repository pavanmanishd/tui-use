#!/bin/bash
set -euo pipefail
csv=$(sed -n 1p /root/.sftp-transfer.sha256)
tarball=$(sed -n 2p /root/.sftp-transfer.sha256)
[ "$(sha256sum < /home/agent/work/downloads/q3-summary.csv | cut -d' ' -f1)" = "$csv" ]
[ "$(sha256sum < /home/ops/incoming/build-2417.tar.gz | cut -d' ' -f1)" = "$tarball" ]
[ "$(stat -c %U /home/ops/incoming/build-2417.tar.gz)" = ops ]
