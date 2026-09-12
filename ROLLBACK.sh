#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
git -C "$ROOT" revert --no-edit HEAD
printf 'PASS restored_behavior=previous-GitHub-Pages-commit\n'
