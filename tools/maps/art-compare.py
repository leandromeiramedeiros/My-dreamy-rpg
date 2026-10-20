# tools/maps/art-compare.py -- side-by-side PNGs of the art-audit sets (before | after | after-sea) -> tools/shots/world-art/compare/.
# Usage: python3 tools/maps/art-compare.py   (needs Pillow; run after tools/maps/art-audit.js before|after|after-sea)
# before | after (| after + render.js sea line) side by side, per fixed shot -> tools/shots/world-art/compare/
import os, sys
from PIL import Image, ImageDraw
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shots', 'world-art')
cols = [c for c in ['before', 'after', 'after-sea'] if os.path.isdir(os.path.join(R, c))]
out = os.path.join(R, 'compare'); os.makedirs(out, exist_ok=True)
for f in sorted(os.listdir(os.path.join(R, 'before'))):
    if not f.endswith('.png') or f.endswith('_sil.png'): continue
    ims = [Image.open(os.path.join(R, c, f)).convert('RGB') for c in cols if os.path.exists(os.path.join(R, c, f))]
    if len(ims) < 2: continue
    w, h = ims[0].size; can = Image.new('RGB', (w * len(ims) + 8 * (len(ims) - 1), h + 22), (16, 12, 24))
    d = ImageDraw.Draw(can)
    for k, (im, c) in enumerate(zip(ims, cols)):
        can.paste(im, (k * (w + 8), 22)); d.text((k * (w + 8) + 6, 5), c, fill=(240, 230, 255))
    can.save(os.path.join(out, f))
    sil = [Image.open(os.path.join(R, c, f.replace('.png', '_sil.png'))).convert('RGB') for c in cols if os.path.exists(os.path.join(R, c, f.replace('.png', '_sil.png')))]
    if len(sil) >= 2:
        sw, sh = sil[0].size; c2 = Image.new('RGB', (sw * len(sil) + 8 * (len(sil) - 1), sh), (16, 12, 24))
        for k, im in enumerate(sil): c2.paste(im, (k * (sw + 8), 0))
        c2.save(os.path.join(out, f.replace('.png', '_sil.png')))
print('compare images in', out, len(os.listdir(out)))
