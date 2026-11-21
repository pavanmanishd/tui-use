process.stdin.setRawMode(true);
process.stdout.write("Password: ");
let value = "";
process.stdin.on("data", (d) => {
  for (const ch of d.toString()) {
    if (ch === "\r") {
      process.stdout.write(`\r\nyou typed: ${value}\r\n`);
      value = "";
      process.stdout.write("Password: ");
    } else if (ch === "\x03") {
      process.exit(0);
    } else {
      value += ch;
    }
  }
});
