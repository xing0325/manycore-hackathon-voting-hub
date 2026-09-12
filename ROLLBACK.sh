#!/bin/sh
set -eu
BASELINE_COMMIT='6e4accc150da67938a025d3293fbed56c41480b8'
git rev-parse --is-inside-work-tree >/dev/null
added="$(git diff --name-only --diff-filter=A "$BASELINE_COMMIT"..HEAD)"
git restore --source="$BASELINE_COMMIT" --staged --worktree .
if [ -n "$added" ]; then printf '%s\n' "$added" | while IFS= read -r path; do rm -rf -- "$path"; done; fi
printf '%s\n' 'PASS restored_behavior=email-magic-link-auth restored_status=previous-deployment'
