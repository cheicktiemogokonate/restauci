#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: bash scripts/geo/extract-admin-boundaries.sh input.osm.pbf output.geojson" >&2
  exit 2
fi

if ! command -v osmium >/dev/null 2>&1; then
  echo "osmium-tool est requis (logiciel open source)." >&2
  exit 1
fi

input_path="$1"
output_path="$2"
work_dir="$(mktemp -d)"
filtered_path="$work_dir/admin-boundaries.osm.pbf"
trap 'rm -rf "$work_dir"' EXIT

osmium tags-filter "$input_path" r/boundary=administrative -o "$filtered_path"
osmium export "$filtered_path" --geometry-types=polygon -f geojson -o "$output_path"
echo "Frontières administratives exportées : $output_path"
