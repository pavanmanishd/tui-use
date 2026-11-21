const items = ["apple", "banana", "cherry"];
const bar = process.argv[2] === "bar";
let sel = 0;
const on = bar ? "\x1b[48;5;24m" : "\x1b[7m";
function draw() {
  process.stdout.write("\x1b[H\x1b[2J");
  process.stdout.write("Pick a fruit:\r\n");
  for (const [i, item] of items.entries()) {
    const line = `${i === sel ? ">" : " "} ${item}`;
    const text = bar ? line.padEnd(process.stdout.columns) : line;
    process.stdout.write(i === sel ? `${on}${text}\x1b[0m\r\n` : `${text}\r\n`);
  }
}
process.stdin.setRawMode(true);
process.stdout.write("\x1b[?1049h\x1b[?1h\x1b[?25l");
draw();
process.stdin.on("data", (d) => {
  const s = d.toString();
  if (s === "\x1bOA" || s === "\x1b[A" || s === "k") sel = Math.max(0, sel - 1);
  else if (s === "\x1bOB" || s === "\x1b[B" || s === "j") sel = Math.min(items.length - 1, sel + 1);
  else if (s === "\r") {
    process.stdout.write("\x1b[?1049l\x1b[?25h");
    process.stdout.write(`chose ${items[sel]}\r\n`);
    process.exit(0);
  }
  draw();
});
