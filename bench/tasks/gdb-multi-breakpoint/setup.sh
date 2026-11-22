#!/bin/bash
set -euo pipefail
cd /home/agent/work
rm -f answer.txt receipt.txt
cat > vault.c <<'C'
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <sys/random.h>

struct vault {
    uint32_t h;
    unsigned rounds;
};

static uint32_t origin;

static void mix(struct vault *v, const char *word)
{
    for (const char *p = word; *p; p++) {
        v->h ^= (unsigned char)*p;
        v->h *= 16777619u;
        v->h = (v->h << 7) | (v->h >> 25);
    }
    v->rounds++;
}

static uint32_t receipt(uint32_t a, uint32_t b)
{
    uint32_t x = a * 0x85ebca6bu ^ b;
    x ^= x >> 13;
    x *= 0xc2b2ae35u;
    return x ^ (x >> 16);
}

static void finalize(struct vault *v)
{
    v->h ^= v->rounds * 0x9e3779b9u;
}

int main(void)
{
    FILE *tty = fopen("/dev/tty", "r+");
    if (!tty) {
        fputs("vault: this program needs a terminal\n", stderr);
        return 1;
    }
    struct vault v = {0, 0};
    if (getrandom(&v.h, sizeof v.h, 0) != sizeof v.h)
        return 1;
    origin = v.h;
    char word[64];
    for (int i = 1; i <= 3; i++) {
        fprintf(tty, "word %d of 3: ", i);
        fflush(tty);
        if (!fgets(word, sizeof word, tty))
            return 1;
        word[strcspn(word, "\r\n")] = 0;
        mix(&v, word);
    }
    FILE *out = fopen("/home/agent/work/receipt.txt", "w");
    if (out) {
        fprintf(out, "%08x\n", receipt(origin, v.h));
        fclose(out);
    }
    finalize(&v);
    fprintf(tty, "vault sealed\n");
    return 0;
}
C
gcc -g -O0 -o vault vault.c
cat > /root/vault-check.c <<'C'
#include <stdint.h>
#include <stdio.h>

static uint32_t mix(uint32_t h, const char *word)
{
    for (const char *p = word; *p; p++) {
        h ^= (unsigned char)*p;
        h *= 16777619u;
        h = (h << 7) | (h >> 25);
    }
    return h;
}

int main(void)
{
    unsigned long seed, final;
    unsigned got;
    FILE *a = fopen("/home/agent/work/answer.txt", "r");
    FILE *r = fopen("/home/agent/work/receipt.txt", "r");
    if (!a || !r || fscanf(a, "%lu %lu", &seed, &final) != 2 || fscanf(r, "%x", &got) != 1)
        return 1;
    uint32_t h = mix(mix(mix((uint32_t)seed, "amber"), "basalt"), "cobalt");
    uint32_t x = (uint32_t)seed * 0x85ebca6bu ^ h;
    x ^= x >> 13;
    x *= 0xc2b2ae35u;
    x ^= x >> 16;
    return h == final && x == got ? 0 : 1;
}
C
gcc -O2 -o /root/vault-check /root/vault-check.c
chmod 700 /root/vault-check
bash /opt/bench/lockdown.sh gdb
chown -R agent:agent /home/agent/work
