const total = Number(process.argv[2] ?? 3);
const every = Number(process.argv[3] ?? 1000);
let n = 0;
const timer = setInterval(() => {
  n += 1;
  process.stdout.write(`tick ${n}\r\n`);
  if (n === total) {
    clearInterval(timer);
    process.stdout.write("done\r\n");
  }
}, every);
setInterval(() => {}, 1 << 30);
