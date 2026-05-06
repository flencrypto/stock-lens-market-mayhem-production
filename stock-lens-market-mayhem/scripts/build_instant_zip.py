#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
DIST = ROOT / 'dist'
OUT = DIST / 'stock-lens-instant-game-upload.zip'
DIST.mkdir(exist_ok=True)

with ZipFile(OUT, 'w', compression=ZIP_DEFLATED, compresslevel=9) as z:
    for path in PUBLIC.rglob('*'):
        if path.is_file():
            z.write(path, path.relative_to(PUBLIC))
print(f'Wrote {OUT}')
