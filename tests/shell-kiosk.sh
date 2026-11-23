#!/bin/bash
set -euo pipefail

repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

project="$tmp_root/project with spaces"
bin="$tmp_root/bin"
mkdir -p "$project/assets" "$bin"
cp "$repo_dir/cds-start.sh" "$repo_dir/chresolution.sh" "$project/"
cp "$repo_dir/assets/app.in.js" "$project/assets/"

cat > "$bin/xrandr" <<'MOCK'
#!/bin/bash
printf '%s\n' "$*" >> "$XRANDR_LOG"
if [ "${XRANDR_FAIL:-0}" = 1 ]; then
    echo "mock xrandr failure" >&2
    exit 19
fi
MOCK
cat > "$bin/chromium" <<'MOCK'
#!/bin/bash
printf '%s\n' "$*" >> "$CHROMIUM_LOG"
MOCK
chmod +x "$bin/xrandr" "$bin/chromium"
export PATH="$bin:$PATH" XRANDR_LOG="$tmp_root/xrandr.log" CHROMIUM_LOG="$tmp_root/chromium.log"

fail() {
    echo "FAIL: $*" >&2
    exit 1
}
printf 'AVIA_URL=https://example.invalid/path?x="quoted"\n' > "$project/.env"
if bash "$project/cds-start.sh"; then fail "query-bearing URL unexpectedly accepted"; fi
test ! -e "$project/assets/app.js" || fail "invalid config generated app.js"

printf 'AVIA_URL=https://example.invalid/path/"quoted"\n' > "$project/.env"
bash "$project/cds-start.sh"
grep -Fq 'const url = "https://example.invalid/path/\"quoted\"";' "$project/assets/app.js" || fail "URL not safely generated"
grep -Fq -- '--output LVDS1 --scale-from 1280x1024 --mode 1280x800 --output VGA1 --mode 1280x1024 --primary' "$XRANDR_LOG" || fail "calibrated mirror mode not applied"
grep -Fq 'file://' "$CHROMIUM_LOG" || fail "Chromium did not receive file URI"
grep -Fq '%20' "$CHROMIUM_LOG" || fail "file URI did not encode spaces"

rm "$project/.env"
if bash "$project/cds-start.sh"; then fail "missing .env unexpectedly accepted"; fi
test "$(wc -l < "$CHROMIUM_LOG")" -eq 1 || fail "Chromium ran after missing .env"

printf 'AVIA_URL=https://example.invalid/path\n' > "$project/.env"
if XRANDR_FAIL=1 bash "$project/cds-start.sh"; then fail "xrandr failure was not propagated"; fi
test "$(wc -l < "$CHROMIUM_LOG")" -eq 1 || fail "Chromium ran after helper failure"

echo "shell kiosk tests passed"
