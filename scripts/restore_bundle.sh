#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
restore_bundle.sh

Restores a git repository from a .bundle and .meta file.

Usage:
  ./restore_bundle.sh --bundle <path>.bundle --meta <path>.meta [--name <repo-dir>] [--force] [--update]

Defaults:
  - Repo name comes from REPO_NAME in .meta (fallback: bundle filename without .bundle)
  - Safe by default: aborts if target directory exists

Safety:
  - Never deletes anything.
  - --force only allows proceeding if the existing target directory is empty.
  - --update fetches from the bundle into an existing repo (does not merge/rebase).
EOF
}

err() { echo "ERROR: $*" >&2; }
info() { echo "$*"; }

verify_bundle() {
  local bundle_path="$1"
  local tmpdir=""
  tmpdir="$(mktemp -d 2>/dev/null || mktemp -d -t capsulo-bundle-verify)"
  (
    cd "${tmpdir}"
    git init -q
    git bundle verify "${bundle_path}" >/dev/null
  )
  rm -rf "${tmpdir}"
}

BUNDLE_PATH=""
META_PATH=""
TARGET_NAME=""
FORCE="0"
UPDATE="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --bundle) BUNDLE_PATH="${2:-}"; shift 2 ;;
    --meta) META_PATH="${2:-}"; shift 2 ;;
    --name) TARGET_NAME="${2:-}"; shift 2 ;;
    --force) FORCE="1"; shift ;;
    --update) UPDATE="1"; shift ;;
    *)
      err "Unknown argument: $1"
      usage
      exit 2
      ;;
  esac
done

if [[ -z "${BUNDLE_PATH}" || -z "${META_PATH}" ]]; then
  err "Missing required arguments --bundle and/or --meta."
  usage
  exit 2
fi

bundle_abs() {
  local p="$1"
  local d=""
  d="$(cd "$(dirname "$p")" && pwd)"
  printf "%s/%s" "${d}" "$(basename "$p")"
}

meta_abs() {
  local p="$1"
  local d=""
  d="$(cd "$(dirname "$p")" && pwd)"
  printf "%s/%s" "${d}" "$(basename "$p")"
}

if [[ -f "${BUNDLE_PATH}" ]]; then
  BUNDLE_PATH="$(bundle_abs "${BUNDLE_PATH}")"
fi
if [[ -f "${META_PATH}" ]]; then
  META_PATH="$(meta_abs "${META_PATH}")"
fi

if [[ ! -f "${BUNDLE_PATH}" ]]; then
  err "Bundle not found: ${BUNDLE_PATH}"
  exit 1
fi

if [[ ! -f "${META_PATH}" ]]; then
  err "Metadata file not found: ${META_PATH}"
  exit 1
fi

if ! verify_bundle "${BUNDLE_PATH}" >/dev/null 2>&1; then
  err "Bundle failed verification (corrupted or invalid): ${BUNDLE_PATH}"
  exit 1
fi

REPO_NAME_FROM_META=""
ORIGIN_FROM_META=""

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "${line}" ]] && continue
  case "${line}" in
    REPO_NAME=*) REPO_NAME_FROM_META="${line#REPO_NAME=}" ;;
    ORIGIN=*) ORIGIN_FROM_META="${line#ORIGIN=}" ;;
    TIMESTAMP=*) : ;;
    *) : ;;
  esac
done < "${META_PATH}"

if [[ -z "${TARGET_NAME}" ]]; then
  if [[ -n "${REPO_NAME_FROM_META}" ]]; then
    TARGET_NAME="${REPO_NAME_FROM_META}"
  else
    TARGET_NAME="$(basename "${BUNDLE_PATH}")"
    TARGET_NAME="${TARGET_NAME%.bundle}"
  fi
fi

info "Target directory: ${TARGET_NAME}"

if [[ -d "${TARGET_NAME}" ]]; then
  if [[ "${UPDATE}" == "1" ]]; then
    if [[ ! -d "${TARGET_NAME}/.git" ]]; then
      err "Target exists but is not a git repo: ${TARGET_NAME}"
      exit 1
    fi
    info "Update mode: fetching from bundle (no merge/rebase)"
    (
      cd "${TARGET_NAME}"
      git fetch "${BUNDLE_PATH}" "refs/heads/*:refs/remotes/bundle/*" "refs/tags/*:refs/tags/*" >/dev/null
      info "Fetched bundle refs into refs/remotes/bundle/* and tags."
      if [[ -n "${ORIGIN_FROM_META}" ]]; then
        git remote remove origin >/dev/null 2>&1 || true
        git remote add origin "${ORIGIN_FROM_META}"
        info "Origin restored: ${ORIGIN_FROM_META}"
      else
        info "Origin restore skipped (ORIGIN empty)."
      fi
      info "Next: inspect/merge from 'bundle/<branch>' as desired."
    )
    exit 0
  fi

  info "Directory already exists: ${TARGET_NAME}"
  if [[ "${FORCE}" != "1" ]]; then
    err "Aborting (safe default). Re-run with --force (only if directory is empty) or --update."
    exit 1
  fi

  if [[ -n "$(ls -A "${TARGET_NAME}" 2>/dev/null || true)" ]]; then
    err "--force is set, but directory is not empty. Refusing to overwrite."
    err "Please move/remove it manually, or use --update if it's a git repo."
    exit 1
  fi
fi

info "Cloning from bundle"
git clone "${BUNDLE_PATH}" "${TARGET_NAME}" >/dev/null

if [[ -n "${ORIGIN_FROM_META}" ]]; then
  (
    cd "${TARGET_NAME}"
    git remote remove origin >/dev/null 2>&1 || true
    git remote add origin "${ORIGIN_FROM_META}"
  )
  info "Origin restored: ${ORIGIN_FROM_META}"
else
  info "Origin restore skipped (ORIGIN empty)."
fi

info "Done. Repo restored at: ${TARGET_NAME}"
