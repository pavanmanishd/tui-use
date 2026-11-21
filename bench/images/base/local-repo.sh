set -eu
pkg=/tmp/hello-tui
mkdir -p "$pkg/DEBIAN" "$pkg/usr/local/bin"
cat > "$pkg/DEBIAN/control" <<CONTROL
Package: hello-tui
Version: 1.0.0
Architecture: all
Maintainer: TUI-Bench <bench@example.com>
Depends: cowsay
Description: Prints a greeting for TUI-Bench.
CONTROL
printf '#!/bin/sh\necho "hello from hello-tui"\n' > "$pkg/usr/local/bin/hello-tui"
chmod 755 "$pkg/usr/local/bin/hello-tui"
mkdir -p /opt/local-repo
dpkg-deb --build "$pkg" /opt/local-repo/hello-tui_1.0.0_all.deb
apt-get update
apt-get download cowsay
mv cowsay_*.deb /opt/local-repo/
cd /opt/local-repo && apt-ftparchive packages . > Packages
echo "deb [trusted=yes] file:/opt/local-repo ./" > /etc/apt/sources.list.d/local.list
rm -rf /var/lib/apt/lists/* "$pkg"
