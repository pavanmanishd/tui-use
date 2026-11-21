import { readFileSync } from "node:fs";

const read = (name) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), "utf8"));
const pkg = read("package.json");
const server = read("server.json");
const problems = [];
const expect = (ok, message) => ok || problems.push(message);

expect(
  server.name === pkg.mcpName,
  `server.json name ${server.name} != package.json mcpName ${pkg.mcpName}`,
);
expect(server.version === pkg.version, `server.json version ${server.version} != ${pkg.version}`);
expect(
  server.description?.length > 0 && server.description.length <= 100,
  "description must be 1-100 characters",
);
const [npm] = server.packages ?? [];
expect(npm?.registryType === "npm", "first package must be npm");
expect(npm?.identifier === pkg.name, `package identifier ${npm?.identifier} != ${pkg.name}`);
expect(npm?.version === pkg.version, `package version ${npm?.version} != ${pkg.version}`);
expect(npm?.transport?.type === "stdio", "transport must be stdio");
expect(npm?.packageArguments?.[0]?.value === "mcp", "first package argument must be mcp");

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("server.json ok");
