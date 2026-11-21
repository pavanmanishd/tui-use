#!/bin/bash
set -euo pipefail
cd /home/agent/work
rm -f acc.txt
cat > hist.c <<'C'
#include <stdint.h>
#include <stdio.h>

static unsigned counts[255];

static unsigned *bucket(unsigned char b)
{
    if (b == 255)
        return NULL;
    return &counts[b];
}

int main(void)
{
    static unsigned char buf[4096];
    FILE *f = fopen("/home/agent/work/data.bin", "rb");
    if (!f) {
        perror("data.bin");
        return 1;
    }
    size_t n = fread(buf, 1, sizeof buf, f);
    fclose(f);

    uint32_t acc = 17;
    for (size_t i = 0; i < n; i++) {
        acc = acc * 31 + buf[i];
        unsigned *slot = bucket(buf[i]);
        (*slot)++;
    }
    printf("checksum %u\n", acc);
    return 0;
}
C
gcc -g -O0 -o hist hist.c
python3 - <<'PY'
import secrets

data = bytearray(secrets.randbelow(255) for _ in range(4096))
crash = 1500 + secrets.randbelow(2000)
data[crash] = 255
open("/home/agent/work/data.bin", "wb").write(data)
acc = 17
for b in data[: crash + 1]:
    acc = (acc * 31 + b) % 2**32
with open("/root/gdb-expected-acc", "w") as f:
    f.write(f"{acc}\n")
PY
chown -R agent:agent /home/agent/work
