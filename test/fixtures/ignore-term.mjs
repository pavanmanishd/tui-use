process.on("SIGTERM", () => process.stdout.write("ignoring SIGTERM\r\n"));
process.stdout.write(`ready ${process.pid}\r\n`);
setInterval(() => {}, 1 << 30);
