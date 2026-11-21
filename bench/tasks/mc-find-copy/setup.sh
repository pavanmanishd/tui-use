#!/bin/bash
set -euo pipefail
umask 022
cd /home/agent/work
mkdir -p outbox
n=7700
for year in 2022 2023 2024; do
  for q in q1 q2 q3 q4; do
    dir="archive/$year/$q/invoices"
    mkdir -p "$dir" "archive/$year/$q/receipts"
    for _ in 1 2 3 4; do
      n=$((n + 3))
      printf '%%PDF-1.4\n%% invoice %s %s %s\n' "$n" "$year" "$q" > "$dir/invoice-$n.pdf"
      printf 'receipt %s\n' "$n" > "archive/$year/$q/receipts/receipt-$n.txt"
    done
  done
done
printf '%%PDF-1.4\n%% invoice 7731 2024 q3 total=4180.25\n' > archive/2024/q3/invoices/invoice-7731.pdf
sha256sum archive/2024/q3/invoices/invoice-7731.pdf | cut -d' ' -f1 > /root/.mc-find-copy.sha256
chown -R agent:agent /home/agent/work
