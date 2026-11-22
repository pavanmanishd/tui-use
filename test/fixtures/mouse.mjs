const sgr = process.argv[2] === "sgr";
process.stdin.setRawMode(true);
process.stdout.write(`\x1b[?1000h${sgr ? "\x1b[?1006h" : ""}ready\r\n`);
process.stdin.on("data", (d) => {
  process.stdout.write(`got ${JSON.stringify(d.toString("latin1"))}\r\n`);
  if (d.includes(0x03)) process.exit(0);
});
