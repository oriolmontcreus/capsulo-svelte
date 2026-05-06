#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
export_bundle.sh

Exports the current git repository to:
  <repo-name>.bundle
  <repo-name>.meta

Usage:
  ./export_bundle.sh

Notes:
  - Does not modify the git working tree.
  - Does not require network access.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: Not inside a git repository." >&2
  exit 1
fi

REPO_NAME="$(basename "$(pwd)")"
BUNDLE_PATH="${REPO_NAME}.bundle"
META_PATH="${REPO_NAME}.meta"

ORIGIN=""
if git remote get-url origin >/dev/null 2>&1; then
  ORIGIN="$(git remote get-url origin)"
fi

TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "Repo name: ${REPO_NAME}"
if [[ -n "${ORIGIN}" ]]; then
  echo "Origin detected: ${ORIGIN}"
else
  echo "Origin detected: (none)"
fi

echo "Creating bundle: ${BUNDLE_PATH}"
git bundle create "${BUNDLE_PATH}" --all

echo "Verifying bundle integrity"
BUNDLE_ABS="$(pwd)/${BUNDLE_PATH}"
tmpdir="$(mktemp -d 2>/dev/null || mktemp -d -t capsulo-bundle-verify)"
(
  cd "${tmpdir}"
  git init -q
  git bundle verify "${BUNDLE_ABS}" >/dev/null
)
rm -rf "${tmpdir}"

echo "Writing metadata: ${META_PATH}"
{
  printf "REPO_NAME=%s\n" "${REPO_NAME}"
  printf "ORIGIN=%s\n" "${ORIGIN}"
  printf "TIMESTAMP=%s\n" "${TIMESTAMP}"
} > "${META_PATH}"

echo "Done."
