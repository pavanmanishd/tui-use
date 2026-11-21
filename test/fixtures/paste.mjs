process.stdin.setRawMode(true);
process.stdout.write("\x1b[?2004hready\r\n");
process.stdin.on("data", (d) => {
  process.stdout.write(`got ${JSON.stringify(d.toString())}\r\n`);
  if (d.includes(0x03)) process.exit(0);
});
