#!/usr/bin/env bash
# Called from Vercel → Project → Settings → Git → Ignored Build Step.
#
# Vercel semantics: exit 0 = skip this deployment (no build). exit 1 = run the build.
#
# Use the SAME command on both projects if you want no PR/preview builds—only
# merges to each project’s Production Branch (e.g. dev vs main) trigger builds:
#
#   bash scripts/vercel-ignored-build-step.sh production-only
#
# Next: In Vercel → Project → Settings → Deployment checks, add the GitHub checks
# that must pass before promoting production to your domain (see .github comment
# in ci.yml).
#
set -euo pipefail

mode="${1:-}"

if [[ "$mode" != "production-only" ]]; then
  echo "vercel-ignored-build-step: unknown or missing mode (use: production-only)"
  exit 1
fi

if [[ "${VERCEL_ENV:-}" != "production" ]]; then
  echo "Skipping Vercel build: VERCEL_ENV=${VERCEL_ENV:-} (only production merges are built)."
  exit 0
fi

echo "Proceeding with production build for ${VERCEL_GIT_COMMIT_REF:-unknown}."
exit 1
