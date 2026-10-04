#!/usr/bin/env bash
# Regenerates every example PDF and its PNG preview.
#   ./examples/build.sh            → all examples, dated Sep 2026
#   ./examples/build.sh 2026-10    → all examples, dated Oct 2026
set -euo pipefail

cd "$(dirname "$0")"
DATE="${1:-2026-09}"

for dir in */; do
	name="${dir%/}"
	[ -f "$name/invoice.json" ] || continue
	../innnvoice "$DATE" --template "$name/invoice.json" --out "$name/invoice.pdf" --force

	# PNG preview (macOS: Quick Look renders the PDF at 1600px).
	if command -v qlmanage >/dev/null; then
		qlmanage -t -s 1600 -o "$name" "$name/invoice.pdf" >/dev/null 2>&1
		mv "$name/invoice.pdf.png" "$name/preview.png"
	fi
done

# Gallery banner for the README (needs ImageMagick).
if command -v magick >/dev/null; then
	magick \
		\( freelance-retainer/preview.png agency-project/preview.png partial-payment/preview.png draft-quote/preview.png \
			-resize 600x -bordercolor '#e4e4e7' -border 1 -bordercolor '#f4f4f5' -border 20 \) \
		+append -bordercolor '#f4f4f5' -border 20 \
		gallery.png
fi
