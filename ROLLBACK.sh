#!/bin/sh
set -eu
BASELINE_COMMIT='0ea65a4074b10dd52d0b006e60fbb8944db22c74'
git rev-parse --is-inside-work-tree >/dev/null
added="$(git diff --name-only --diff-filter=A "$BASELINE_COMMIT"..HEAD)"
git restore --source="$BASELINE_COMMIT" --staged --worktree .
if [ -n "$added" ]; then
  printf '%s\n' "$added" | while IFS= read -r path; do rm -rf -- "$path"; done
fi
printf '%s\n' 'PASS restored_behavior=static-Stitch-prototype restored_status=baseline-files'
