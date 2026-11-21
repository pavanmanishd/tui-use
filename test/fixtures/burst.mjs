let n = 0;
const timer = setInterval(() => {
  n += 1;
  process.stdout.write(`burst ${n}\r\n`);
  if (n === 5) clearInterval(timer);
}, 100);
setInterval(() => {}, 1 << 30);
