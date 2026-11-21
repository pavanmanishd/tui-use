#!/bin/bash
set -euo pipefail
d=/home/agent/work/dashboard
for f in tsconfig.json tsconfig.app.json vite.config.ts src/main.tsx src/App.tsx index.html; do
  [ -f "$d/$f" ] || { echo "missing $f" >&2; exit 1; }
done
node -e '
const p = require("/home/agent/work/dashboard/package.json");
const deps = p.dependencies || {}, dev = p.devDependencies || {};
const ok = p.name === "dashboard" && deps.react && deps["react-dom"] && dev.typescript &&
  dev["@vitejs/plugin-react"] && !dev["@vitejs/plugin-react-swc"];
if (!ok) { console.error("package.json is not a React + TypeScript project named dashboard"); process.exit(1); }
'
