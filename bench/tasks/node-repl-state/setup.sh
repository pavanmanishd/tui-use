#!/bin/bash
set -euo pipefail
cd /home/agent/work
rm -f inventory.json
head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n' > inventory.seed
cp inventory.seed /root/inventory.seed
cat > inventory.js <<'JS'
const crypto = require("node:crypto");
const fs = require("node:fs");

const seed = fs.readFileSync("/home/agent/work/inventory.seed", "utf8").trim();

async function load() {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const items = new Map();
  for (const name of ["bolt", "nut", "gear", "spring"]) {
    const digest = crypto.createHash("sha256").update(`${seed}:${name}`).digest();
    items.set(name, 20 + (digest[0] % 80));
  }
  return {
    count: (name) => items.get(name),
    take(name, n) {
      if (!items.has(name) || items.get(name) < n) throw new Error(`not enough ${name}`);
      items.set(name, items.get(name) - n);
      return items.get(name);
    },
    add(name, n) {
      items.set(name, (items.get(name) ?? 0) + n);
      return items.get(name);
    },
    save(path) {
      fs.writeFileSync(path, JSON.stringify(Object.fromEntries(items), null, 2) + "\n");
    },
  };
}

module.exports = { load };
JS
chown -R agent:agent /home/agent/work
