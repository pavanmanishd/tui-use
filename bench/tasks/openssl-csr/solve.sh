#!/bin/bash
set -euo pipefail
tui-use start "openssl req -new -key /home/agent/work/site.key -out /home/agent/work/site.csr" --name req --until-text "Country Name" --timeout 30000 >/dev/null
tui-use send req --text IN --key enter --until-text "State or Province Name" >/dev/null
tui-use send req --text Karnataka --key enter --until-text "Locality Name" >/dev/null
tui-use send req --text Bengaluru --key enter --until-text "Organization Name" >/dev/null
tui-use send req --text "Example Widgets Ltd" --key enter --until-text "Organizational Unit Name" >/dev/null
tui-use send req --text Platform --key enter --until-text "Common Name" >/dev/null
tui-use send req --text widgets.example.com --key enter --until-text "Email Address" >/dev/null
tui-use send req --text admin@widgets.example.com --key enter --until-text "challenge password" >/dev/null
tui-use send req --key enter --until-text "optional company name" >/dev/null
tui-use send req --key enter --until-exit --timeout 15000 >/dev/null
