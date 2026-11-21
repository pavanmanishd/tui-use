import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const exact = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const bad = [];
for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
  for (const [name, version] of Object.entries(pkg[field] ?? {})) {
    if (!exact.test(version)) bad.push(`${field}.${name}: ${version}`);
  }
}
if (bad.length > 0) {
  console.error(`Dependencies must be pinned to exact versions:\n  ${bad.join("\n  ")}`);
  process.exit(1);
}
