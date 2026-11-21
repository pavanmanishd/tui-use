ARG BASE=tui-bench-base
FROM ${BASE}
COPY tui-use.tgz /tmp/tui-use.tgz
RUN npm install -g --no-fund --no-audit /tmp/tui-use.tgz && rm /tmp/tui-use.tgz && tui-use --version
