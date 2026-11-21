#!/bin/bash
set -euo pipefail
tui-use start "sudo adduser carol" --name add --until-text "New password:" --timeout 30000 >/dev/null
tui-use send add --text "Tr0ub4dor-77" --key enter --until-text "Retype new password:" >/dev/null
tui-use send add --text "Tr0ub4dor-77" --key enter --until-text "Full Name" >/dev/null
tui-use send add --text "Carol Danvers" --key enter --until-text "Room Number" >/dev/null
tui-use send add --text "B-12" --key enter --until-text "Work Phone" >/dev/null
tui-use send add --key enter --until-text "Home Phone" >/dev/null
tui-use send add --key enter --until-text "Other" >/dev/null
tui-use send add --key enter --until-text "Is the information correct?" >/dev/null
tui-use send add --text Y --key enter --until-exit --timeout 15000 >/dev/null
