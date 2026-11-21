---
category: pickers
---
`/home/agent/work` holds a Kconfig project for an edge proxy, with its current configuration in `/home/agent/work/.config`.

Run `menuconfig` in `/home/agent/work` and change two settings: turn on "Export Prometheus metrics" (in the Observability menu), and set "Response cache size (MB)" (in the Caching menu) to `256`. Leave every other setting at its current value, save the configuration to `/home/agent/work/.config`, and quit. Do not edit `.config` by hand.
