const app = process.argv[2] === "app";
process.stdin.setRawMode(true);
process.stdout.write(`${app ? "\x1b[?1h" : ""}ready\r\n`);
process.stdin.on("data", (d) => {
  process.stdout.write(`got ${JSON.stringify(d.toString())}\r\n`);
  if (d.includes(0x03)) process.exit(0);
});
