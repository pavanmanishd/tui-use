#!/bin/bash
set -euo pipefail
cd /home/agent/work
subject=$(openssl req -in site.csr -noout -subject -nameopt RFC2253)
[ "$subject" = "subject=emailAddress=admin@widgets.example.com,CN=widgets.example.com,OU=Platform,O=Example Widgets Ltd,L=Bengaluru,ST=Karnataka,C=IN" ] || { echo "got $subject" >&2; exit 1; }
openssl req -in site.csr -noout -verify 2>/dev/null
[ "$(openssl req -in site.csr -noout -pubkey)" = "$(openssl pkey -in site.key -pubout)" ]
! openssl req -in site.csr -noout -text | grep -Eq "challengePassword|unstructuredName"
