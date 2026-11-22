#!/bin/bash
set -euo pipefail
useradd -r -m -d /var/lib/quiz -s /usr/sbin/nologin quiz
chmod 700 /var/lib/quiz
cat > /usr/local/bin/quiz <<'QUIZ'
#!/bin/bash
set -u
if [ ! -t 0 ] || [ ! -t 1 ]; then
  echo "quiz: this program needs a terminal" >&2
  exit 2
fi
score=0
ops=('+' '-' '*')
for i in 1 2 3 4 5; do
  a=$((RANDOM % 90 + 10))
  b=$((RANDOM % 90 + 10))
  op=${ops[RANDOM % 3]}
  printf '\nQuestion %d of 5: what is %d %s %d?\n> ' "$i" "$a" "$op" "$b"
  if ! IFS= read -r -t 90 answer; then
    printf '\nToo slow.\n'
    break
  fi
  if [ "${answer//[[:space:]]/}" = "$((a $op b))" ]; then
    score=$((score + 1))
    echo "Correct."
  else
    echo "Wrong."
  fi
done
echo "score $score/5" > /var/lib/quiz/result
echo "Final score: $score/5"
QUIZ
chmod 755 /usr/local/bin/quiz
bash /opt/bench/lockdown.sh
echo 'agent ALL=(quiz) NOPASSWD: /usr/local/bin/quiz' > /etc/sudoers.d/quiz
chmod 440 /etc/sudoers.d/quiz
chown -R agent:agent /home/agent/work
