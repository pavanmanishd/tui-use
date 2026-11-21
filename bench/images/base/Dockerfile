FROM node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee

ARG LAZYGIT_VERSION=0.66.3
ARG GUM_VERSION=2.0.2

RUN apt-get update && apt-get install -y --no-install-recommends \
      vim nano emacs-nox less git python3 python3-pip gdb gcc libc6-dev make \
      htop mc fzf ncdu tig sqlite3 postgresql postgresql-client \
      openssh-server openssh-client sudo whiptail openssl adduser \
      apt-utils dpkg-dev procps curl ca-certificates file locales \
 && rm -rf /var/lib/apt/lists/* \
 && sed -i 's/^# *en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen && locale-gen

RUN arch="$(dpkg --print-architecture)" \
 && case "$arch" in amd64) la=x86_64; ga=x86_64 ;; arm64) la=arm64; ga=arm64 ;; esac \
 && curl -fsSL "https://github.com/jesseduffield/lazygit/releases/download/v${LAZYGIT_VERSION}/lazygit_${LAZYGIT_VERSION}_Linux_${la}.tar.gz" \
    | tar xz -C /usr/local/bin lazygit \
 && curl -fsSL "https://github.com/charmbracelet/gum/releases/download/v${GUM_VERSION}/gum_${GUM_VERSION}_Linux_${ga}.tar.gz" \
    | tar xz -C /tmp && find /tmp -name gum -type f -exec mv {} /usr/local/bin/gum \; \
 && gum --version && lazygit --version

RUN pip3 install --no-cache-dir --break-system-packages kconfiglib==14.1.0 questionary==2.1.0

RUN npm install -g --no-fund --no-audit \
      @anthropic-ai/claude-code@2.1.329 @google/gemini-cli@0.37.1 opencode-ai@1.19.6 \
 && npm cache add create-vite@6.5.0

COPY local-repo.sh /opt/bench/local-repo.sh
RUN sh /opt/bench/local-repo.sh

RUN useradd -m -s /bin/bash agent \
 && echo "agent ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/agent \
 && mkdir -p /run/sshd /home/agent/work && chown agent:agent /home/agent/work \
 && git config --system user.name "Bench Agent" && git config --system user.email agent@example.com \
 && git config --system init.defaultBranch main

ENV LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 TERM=xterm-256color EDITOR=vim
WORKDIR /home/agent/work
CMD ["sleep", "infinity"]
