#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cp "$ROOT/index.original.html" "$ROOT/index.html"
printf 'PASS restored_field=index.html restored_behavior=original-Stitch-title-and-metadata\n'
