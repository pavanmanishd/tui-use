process.on("SIGTERM", () => process.stdout.write("ignoring SIGTERM\r\n"));
process.stdout.write("ready\r\n");
setInterval(() => {}, 1 << 30);
