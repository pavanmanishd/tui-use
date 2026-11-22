#!/bin/bash
set -euo pipefail
[ "$(cat /var/lib/quiz/result)" = "score 5/5" ]
