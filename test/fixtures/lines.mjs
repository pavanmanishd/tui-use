const total = Number(process.argv[2] ?? 100);
let out = "";
for (let i = 1; i <= total; i++) out += `line ${i}${i === 120 || i === 121 ? " error" : ""}\r\n`;
process.stdout.write(out);
setInterval(() => {}, 1 << 30);
