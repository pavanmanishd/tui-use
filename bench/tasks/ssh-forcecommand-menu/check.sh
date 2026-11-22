#!/bin/bash
set -euo pipefail
[ "$(cat /home/ops/actions.log)" = "$(printf 'flush-cache confirmed\nmenu exit')" ]
