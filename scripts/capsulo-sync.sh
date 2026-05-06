#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
capsulo-sync.sh

Lightweight wrapper around export_bundle.sh / restore_bundle.sh.

Usage:
  ./capsulo-sync.sh export
  ./capsulo-sync.sh import --bundle <path>.bundle --meta <path>.meta [--name <repo-dir>] [--force] [--update]
EOF
}

cmd="${1:-}"
shift || true

case "${cmd}" in
  -h|--help|"")
    usage
    exit 0
    ;;
  export)
    exec "$(dirname "$0")/export_bundle.sh"
    ;;
  import)
    exec "$(dirname "$0")/restore_bundle.sh" "$@"
    ;;
  *)
    echo "ERROR: Unknown command: ${cmd}" >&2
    usage
    exit 2
    ;;
esac
