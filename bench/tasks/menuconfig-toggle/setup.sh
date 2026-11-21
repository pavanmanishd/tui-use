#!/bin/bash
set -euo pipefail
cd /home/agent/work
cat > Kconfig <<'KC'
mainmenu "Edge proxy configuration"

menu "Networking"

config LISTEN_PORT
	int "Listen port"
	default 8080

config ENABLE_TLS
	bool "Enable TLS"
	default y

config HTTP2
	bool "Enable HTTP/2"
	default y
	depends on ENABLE_TLS

endmenu

menu "Observability"

config ACCESS_LOG
	bool "Write access logs"
	default y

config METRICS
	bool "Export Prometheus metrics"
	default n

config METRICS_PORT
	int "Metrics port"
	default 9100
	depends on METRICS

endmenu

menu "Caching"

config CACHE
	bool "Enable response cache"
	default y

config CACHE_SIZE_MB
	int "Response cache size (MB)"
	default 64
	depends on CACHE

config CACHE_TTL_SECONDS
	int "Default cache TTL (seconds)"
	default 300
	depends on CACHE

endmenu
KC
python3 -c 'import kconfiglib; kconfiglib.Kconfig("Kconfig").write_config(".config")' >/dev/null
chown -R agent:agent /home/agent/work
