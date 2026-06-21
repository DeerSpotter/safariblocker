#!/usr/bin/env bash
set -euo pipefail

root="${1:-package}"
hex_dir="assets/hex"

restore_hex_parts() {
  local prefix="$1"
  local output="$2"
  mkdir -p "$(dirname "$output")"
  python3 - "$hex_dir" "$prefix" "$output" <<'PY'
from pathlib import Path
import sys
hex_dir = Path(sys.argv[1])
prefix = sys.argv[2]
output = Path(sys.argv[3])
hex_text = ''
for part in sorted(hex_dir.glob(f'{prefix}.part*.hex')):
    hex_text += ''.join(part.read_text().split())
if not hex_text:
    raise SystemExit(f'No hex parts found for {prefix}')
output.write_bytes(bytes.fromhex(hex_text))
PY
}

restore_hex_parts "SafariBlocker.dylib" "$root/var/jb/Library/MobileSubstrate/DynamicLibraries/SafariBlocker.dylib"
restore_hex_parts "SafariBlocker.bundle.SafariBlocker" "$root/var/jb/Library/PreferenceBundles/SafariBlocker.bundle/SafariBlocker"
restore_hex_parts "icon@2x.png" "$root/var/jb/Library/PreferenceBundles/SafariBlocker.bundle/icon@2x.png"

chmod 0755 "$root/var/jb/Library/MobileSubstrate/DynamicLibraries/SafariBlocker.dylib"
chmod 0755 "$root/var/jb/Library/PreferenceBundles/SafariBlocker.bundle/SafariBlocker"
chmod 0644 "$root/var/jb/Library/PreferenceBundles/SafariBlocker.bundle/icon@2x.png"
