#!/bin/bash
set -euo pipefail
cd /home/agent/work
cat > new-service.py <<'PY'
#!/usr/bin/env python3
import json

import questionary

language = questionary.select(
    "Which language should the new service use?",
    choices=["Go", "Java", "Kotlin", "Python", "Rust", "TypeScript"],
).ask()
database = questionary.select(
    "Which database?",
    choices=["None", "MySQL", "PostgreSQL", "MongoDB", "ScyllaDB", "SQLite"],
).ask()
features = questionary.checkbox(
    "Which features should be scaffolded?",
    choices=[
        questionary.Choice("HTTP API", checked=True),
        questionary.Choice("gRPC API"),
        questionary.Choice("Kafka consumer"),
        questionary.Choice("Cron jobs"),
        questionary.Choice("Prometheus metrics", checked=True),
        questionary.Choice("Feature flags"),
        questionary.Choice("Admin UI"),
    ],
).ask()
if language is None or database is None or features is None:
    raise SystemExit("cancelled")
with open("/home/agent/work/service.json", "w") as f:
    json.dump({"language": language, "database": database, "features": features}, f, indent=2)
print("Saved /home/agent/work/service.json")
PY
chmod +x new-service.py
chown -R agent:agent /home/agent/work
