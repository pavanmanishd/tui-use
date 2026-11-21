#!/bin/bash
set -euo pipefail
printf '[global]\nbreak-system-packages = true\n' > /etc/pip.conf
for p in tinyfmt tinylog; do
  mkdir -p "/opt/pkgs/$p/$p"
  echo 'VERSION = "1.0.0"' > "/opt/pkgs/$p/$p/__init__.py"
  printf 'from setuptools import setup\nsetup(name="%s", version="1.0.0", packages=["%s"])\n' "$p" "$p" > "/opt/pkgs/$p/setup.py"
  pip3 install -q --root-user-action=ignore --no-build-isolation --no-index "/opt/pkgs/$p"
done
chown -R agent:agent /home/agent/work
