"""Build small gallery previews; keep the full-size backgrounds unchanged.

Requires Pillow with WebP support in the local build environment.
"""
import json
from pathlib import Path

from PIL import Image, ImageOps

project = Path(__file__).resolve().parents[1]
destination = project / "public/gallery-thumbs"
destination.mkdir(parents=True, exist_ok=True)
entries = []
for name in ("generated-backgrounds",):
    entries.extend(json.loads((project / f"src/{name}.json").read_text()))

for entry in entries:
    source = project / "public" / entry["src"].lstrip("/")
    with Image.open(source) as image:
        thumbnail = ImageOps.fit(image.convert("RGB"), (192, 192), method=Image.Resampling.LANCZOS)
        thumbnail.save(destination / f'{entry["id"]}.webp', "WEBP", quality=68, method=6)

print(f"Built {len(entries)} gallery thumbnails; original backgrounds unchanged.")
