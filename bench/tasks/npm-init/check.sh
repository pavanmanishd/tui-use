#!/bin/bash
set -euo pipefail
node -e '
const p = require("/home/agent/work/greeter/package.json");
const want = { name: "greeter-cli", version: "2.1.0", description: "Prints friendly greetings", main: "cli.js", license: "MIT" };
for (const [k, v] of Object.entries(want)) {
  if (p[k] !== v) { console.error(`${k} is ${JSON.stringify(p[k])}, want ${JSON.stringify(v)}`); process.exit(1); }
}
'
