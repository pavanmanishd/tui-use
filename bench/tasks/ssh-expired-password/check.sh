#!/bin/bash
set -euo pipefail
hash=$(getent shadow dev | cut -d: -f2)
[ "$(perl -e 'print crypt($ARGV[0], $ARGV[1])' 'Quartz-River-58' "$hash")" = "$hash" ]
