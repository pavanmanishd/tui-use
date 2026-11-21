const frames = ["|", "/", "-", "\\"];
let i = 0;
process.stdout.write("Installing ");
setInterval(() => {
  process.stdout.write(`\x1b[1D${frames[i++ % frames.length]}`);
}, 80);
