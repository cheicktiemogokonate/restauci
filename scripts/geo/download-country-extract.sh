#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SOURCE_URL:-}" || -z "${EXPECTED_SHA256:-}" || -z "${OUTPUT_PATH:-}" ]]; then
  echo "Usage: SOURCE_URL=https://... EXPECTED_SHA256=... OUTPUT_PATH=data/ci-YYYY-MM-DD.osm.pbf bash scripts/geo/download-country-extract.sh" >&2
  exit 2
fi

case "$SOURCE_URL" in
  *latest*)
    echo "Refus d'une URL 'latest' : utilisez un snapshot explicitement daté." >&2
    exit 2
    ;;
esac

mkdir -p "$(dirname "$OUTPUT_PATH")"
temporary_path="${OUTPUT_PATH}.partial"
curl --fail --location --retry 3 --output "$temporary_path" "$SOURCE_URL"

actual_sha256="$(shasum -a 256 "$temporary_path" | awk '{print $1}')"
if [[ "$actual_sha256" != "$EXPECTED_SHA256" ]]; then
  echo "Checksum invalide : attendu $EXPECTED_SHA256, obtenu $actual_sha256" >&2
  exit 1
fi

mv "$temporary_path" "$OUTPUT_PATH"
echo "Snapshot vérifié : $OUTPUT_PATH ($actual_sha256)"
