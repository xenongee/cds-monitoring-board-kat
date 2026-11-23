#!/bin/bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

python3 - "$project_dir" <<'PY'
import json
import os
import pathlib
import sys
from urllib.parse import urlparse

root = pathlib.Path(sys.argv[1])
try:
    raw_env = (root / ".env").read_text(encoding="utf-8")
except OSError as error:
    raise SystemExit(f"Cannot read {root / '.env'}: {error}")

values = {}
for raw in raw_env.splitlines():
    line = raw.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    values[key.strip()] = value

url = values.get("AVIA_URL", "")
parsed = urlparse(url)
if parsed.scheme != "https" or not parsed.hostname or parsed.query or parsed.fragment:
    raise SystemExit("Invalid AVIA_URL in .env")

template_path = root / "assets/app.in.js"
template = template_path.read_text(encoding="utf-8")
marker = '"__AVIA_URL__"'
if template.count(marker) != 1:
    raise SystemExit("Expected exactly one URL marker in assets/app.in.js")

target = root / "assets/app.js"
tmp = target.with_name("app.js.tmp")
try:
    tmp.write_text(template.replace(marker, json.dumps(url)), encoding="utf-8")
    os.replace(tmp, target)
finally:
    tmp.unlink(missing_ok=True)
PY

bash "$project_dir/chresolution.sh" mirror-sxga
exec chromium --kiosk --disable-translate "$(python3 - "$project_dir/index.html" <<'PY'
import pathlib
import sys

print(pathlib.Path(sys.argv[1]).resolve().as_uri())
PY
)"
