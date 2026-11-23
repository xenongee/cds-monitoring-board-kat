#!/bin/bash
project_dir="$HOME/cds-monitoring-board-kat"
python3 - "$project_dir" <<'PY'
import json
import os
import pathlib
import sys
from urllib.parse import urlparse

root = pathlib.Path(sys.argv[1])
values = {}
for raw in (root / ".env").read_text(encoding="utf-8").splitlines():
    line = raw.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    values[key.strip()] = value.strip().strip('"').strip("'")

url = values.get("AVIA_URL", "")
parsed = urlparse(url)
if parsed.scheme != "https" or not parsed.netloc or parsed.query or parsed.fragment:
    raise SystemExit("Invalid AVIA_URL in .env")

marker = "__AVIA_URL__"
template = (root / "assets/app.in.js").read_text(encoding="utf-8")
if template.count(marker) != 1:
    raise SystemExit("Expected exactly one URL marker in assets/app.in.js")

target = root / "assets/app.js"
tmp = target.with_name("app.js.tmp")
tmp.write_text(template.replace(marker, json.dumps(url)[1:-1]), encoding="utf-8")
os.replace(tmp, target)
PY
if [ $? -ne 0 ]; then
    echo 'Kiosk start aborted: failed to generate assets/app.js from .env' >&2
    exit 1
fi
sleep 60s
bash ~/chresolution.sh mirror-sxga
cds_url="file:///home/adminl/cds-monitoring-board-kat/index.html"
x=1
while [ $x -le 5 ]; do
#     --no-first-run
    echo 'start CDS'
    chromium --kiosk --disable-translate $cds_url
    sleep 7s
    x=$(( $x + 1 ))
done
