#!/bin/bash
set -euo pipefail
cd /home/agent/work
expected=$(cat /root/.mc-find-copy.sha256)
[ "$(ls -A outbox)" = "invoice-7731.pdf" ]
[ "$(sha256sum < outbox/invoice-7731.pdf | cut -d' ' -f1)" = "$expected" ]
[ "$(sha256sum < archive/2024/q3/invoices/invoice-7731.pdf | cut -d' ' -f1)" = "$expected" ]
