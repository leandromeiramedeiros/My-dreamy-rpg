# REF EXTRACT: the SlyNyrd reference hero (Pixelblog 55 / 56 / 58) -> per-direction 1x crops + tools/forge/ref/SPEC.json.
# Everything it reads and writes stays in tools/forge/ref/ (git-ignored; the images are licensed for personal use only and
# are never committed). Run:   python -I tools/forge/ref-extract.py        (downloads the GIFs on the first run)
#   ref/img/*.gif             the blog images (4x)            ref/frames/<gif>/NNN.png   every GIF frame (4x)
#   ref/crops/<anim>/<D>_<k>.png  unique 48x48 1x poses per direction, feet at ORIGIN (idle / walk: k 0-5 full gear,
#                             6-11 base body; attack: 0-5 gear attack, 6-11 gear idle, 12-17 base attack, 18-23 base idle)
#   ref/crops/<anim>.rgba     the same crops as raw RGBA (board.js reads these), index in ref/crops/seq.json
#   ref/SPEC.json             measured proportions, palette ramps, timings, bob, smear, mirror and lint numbers
import os, sys, json, math, collections, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, 'ref')
CDN = 'https://images.squarespace-cdn.com/content/v1/551a19f8e4b0e8322a93850a/'
GIFS = {
    '162-Dummy_Idle': '93039d89-c8b8-4e18-9029-76f1f9935ed2',
    '164-Character_Idle_3': '450f175d-cf6b-4b73-ab4b-861e4e703072',
    '165-Dummy_Sword_Attack_6': '1e033903-61f7-4a3b-95a9-fefa47fc74d5',
    '171-Character_Run_Long': '3442bdd2-eb74-45eb-843b-900d67c2d665',
    '172-Character_Sword_Attack': '52812f4e-2e23-43b5-a483-2158b8b19191',
}
SCALE = 4                                   # every blog GIF is the 1x art at 4x (runs of 4 display px, grid at 0)
FW, FH, OX, OY = 48, 48, 24, 40             # crop = forge frame: feet centre at ORIGIN
ORDER = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW']
WHEEL_DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']        # screen angle 0 = right, +90 = down
BG = {(0x4b, 0x7c, 0x3f), (0x53, 0x87, 0x46), (0x3a, 0x5e, 0x60), (0x43, 0x6e, 0x70)}   # green field + wheel lines
# per animation: source GIF, wheel hub (1x), search box, which unique poses are the base body (anchor source)
CFG = {
    'idle': ('164-Character_Idle_3', (196, 104), (140, 30, 255, 150), range(6, 12)),
    'walk': ('171-Character_Run_Long', (56, 109), (4, 40, 108, 150), range(6, 12)),
    'attack': ('172-Character_Sword_Attack', (127, 104), (58, 26, 198, 152), range(18, 24)),
}
RING, LIFT = 36, 12                         # sprite centroid ~ hub + RING * dir - LIFT (assignment only)
NAMES = {  # the hero palette (exact hex) -> material
    '#1f2357': 'navy', '#104097': 'blue', '#217aa6': 'hairGlint',
    '#a64e21': 'rust', '#ba8a38': 'skin', '#cc7c52': 'tan', '#592104': 'bootDark',
    '#433a60': 'armour0', '#644f77': 'armour1', '#907ca1': 'armour2', '#b5a0ba': 'armour3',
    '#670948': 'red0', '#a62144': 'red1', '#e5e0ac': 'cream', '#fafaf6': 'white', '#bf993f': 'gold',
}
hx = lambda p: '#%02x%02x%02x' % tuple(p[:3])


def download():
    os.makedirs(os.path.join(REF, 'img'), exist_ok=True)
    for g, uid in GIFS.items():
        p = os.path.join(REF, 'img', g + '.gif')
        if os.path.exists(p): continue
        req = urllib.request.Request(f'{CDN}{uid}/{g}.gif?format=original', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as r, open(p, 'wb') as f: f.write(r.read())


def gif_frames(g):
    im = Image.open(os.path.join(REF, 'img', g + '.gif')); out = []
    d = os.path.join(REF, 'frames', g); os.makedirs(d, exist_ok=True)
    for i in range(im.n_frames):
        im.seek(i); f = im.convert('RGB')
        p = os.path.join(d, '%03d.png' % i)
        if not os.path.exists(p): f.save(p)
        w, h = f.size
        out.append((f.resize((w // SCALE, h // SCALE), Image.NEAREST, box=(0, 0, w, h)), im.info.get('duration')))
    return out


def slot_centres(cx, cy):
    return {d: (cx + RING * math.cos(math.radians(i * 45)), cy + RING * math.sin(math.radians(i * 45)) - LIFT) for i, d in enumerate(WHEEL_DIRS)}


def wheel(img, hub, box):
    """non-background pixels of the 8-direction wheel, grouped per direction (component -> nearest slot)"""
    cx, cy = hub; x0, y0, x1, y1 = box; px = img.load(); sc = slot_centres(cx, cy)
    near = lambda x, y: min(sc, key=lambda d: (sc[d][0] - x) ** 2 + (sc[d][1] - y) ** 2)
    mask = {(x, y): px[x, y][:3] for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if px[x, y][:3] not in BG and math.hypot(x - cx, y - cy) >= 3}
    seen, by = set(), collections.defaultdict(dict)
    for k in mask:
        if k in seen: continue
        st, cc = [k], []; seen.add(k)
        while st:
            q = st.pop(); cc.append(q)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    n = (q[0] + dx, q[1] + dy)
                    if n in mask and n not in seen: seen.add(n); st.append(n)
        cnt = collections.Counter(near(*q) for q in cc); top, n = cnt.most_common(1)[0]
        for q in cc: by[top if n >= 0.8 * len(cc) else near(*q)][q] = mask[q]
    return by


def extract():
    seqs, BW = {}, 96
    for anim, (g, hub, box, base) in CFG.items():
        frames = gif_frames(g); per = {d: [] for d in ORDER}
        for img, du in frames:
            by = wheel(img, hub, box)
            for d in ORDER:
                a = math.radians(WHEEL_DIRS.index(d) * 45); fx, fy = round(hub[0] + RING * math.cos(a)), round(hub[1] + RING * math.sin(a))
                im = Image.new('RGBA', (BW, BW), (0, 0, 0, 0))
                for (x, y), p in by.get(d, {}).items():
                    X, Y = x - fx + BW // 2, y - fy + BW // 2
                    if 0 <= X < BW and 0 <= Y < BW: im.putpixel((X, Y), p + (255,))
                per[d].append((im, du))
        seqs[anim] = {}
        for d in ORDER:
            poses, run = [], []                                   # unique poses in first-seen order; run = [(pose, ms)]
            for im, du in per[d]:
                b = im.tobytes()
                if b not in poses: poses.append(b)
                k = poses.index(b)
                if run and run[-1][0] == k: run[-1][1] += du
                else: run.append([k, du])
            # anchor: feet = lowest row of the base-body poses, x = their mean bbox centre
            bx = [Image.frombytes('RGBA', (BW, BW), poses[k]).getbbox() for k in base]
            ax = round(sum((b[0] + b[2] - 1) / 2 for b in bx) / len(bx)); ay = max(b[3] - 1 for b in bx)
            crops = [Image.frombytes('RGBA', (BW, BW), b).crop((ax - OX, ay - OY, ax - OX + FW, ay - OY + FH)) for b in poses]
            os.makedirs(os.path.join(REF, 'crops', anim), exist_ok=True)
            for k, c in enumerate(crops): c.save(os.path.join(REF, 'crops', anim, f'{d}_{k}.png'))
            seqs[anim][d] = {'poses': len(poses), 'run': run[:24], 'crops': crops}
    return seqs


def lint(im):
    """build.js lint on one crop: colours and lone pixels (no 4-neighbour of the same colour)"""
    px = im.load(); w, h = im.size; cols, lone = set(), 0
    for y in range(h):
        for x in range(w):
            if not px[x, y][3]: continue
            c = px[x, y][:3]; cols.add(c)
            if not any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] and px[x + dx, y + dy][:3] == c for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): lone += 1
    return len(cols), lone


def rows(im, x0=8, x1=40, y0=12, y1=43):
    px = im.load(); code = {'navy': 'N', 'blue': 'b', 'hairGlint': 'c', 'rust': 's', 'skin': 'S', 'tan': 'o', 'bootDark': 'B', 'armour0': 'd', 'armour1': 'a',
                             'armour2': 'A', 'armour3': 'L', 'red0': 'r', 'red1': 'R', 'cream': 'Y', 'white': 'W', 'gold': 'g'}
    return [''.join(code.get(NAMES.get(hx(px[x, y]), ''), '?') if px[x, y][3] else '.' for x in range(x0, x1)) for y in range(y0, y1)]


def bbox(im, excl=()):
    px = im.load(); pts = [(x, y) for y in range(FH) for x in range(FW) if px[x, y][3] and hx(px[x, y]) not in excl]
    if not pts: return None
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return {'x': min(xs), 'y': min(ys), 'w': max(xs) - min(xs) + 1, 'h': max(ys) - min(ys) + 1}


def spec(seqs):
    C = lambda a, d, k: seqs[a][d]['crops'][k]
    S = {'source': 'SlyNyrd Pixelblog 55 / 56 / 58 (client Patreon licence, personal projects); measured at 1x', 'scale': SCALE,
         'frame': [FW, FH], 'origin': [OX, OY]}
    # dummy (Pixelblog 55): front figure on the left grid of 162
    dm = gif_frames('162-Dummy_Idle')[0][0]; px = dm.load(); bgd = {(0x2f, 0x32, 0x57), (0x4b, 0x40, 0x6a)}
    pts = [(x, y) for x in range(68, 88) for y in range(45, 73) if px[x, y][:3] not in bgd]
    S['dummyFront'] = {'w': max(p[0] for p in pts) - min(p[0] for p in pts) + 1, 'h': max(p[1] for p in pts) - min(p[1] for p in pts) + 1,
                       'note': 'blog text says 26x32 px; the 1x images measure this (the 26x32 is not the figure bbox)'}
    # hero body box (base body, no gear) and gear box, per direction, idle frame 0
    S['bodyBox'] = {d: bbox(C('idle', d, 6)) for d in ORDER}
    S['gearBox'] = {d: bbox(C('idle', d, 0)) for d in ORDER}
    S['gearBoxNoSword'] = {d: bbox(C('idle', d, 0), ('#fafaf6',)) for d in ORDER}
    S['rowsS'] = {'base': rows(C('idle', 'S', 6)), 'gear': rows(C('idle', 'S', 0)), 'rowY0': 12, 'colX0': 8,
                  'legend': 'N navy, b blue, c hair glint, S skin, s rust, o tan, B boot dark, d/a/A/L armour 0-3, r/R red 0-1, Y cream, W white'}
    # proportions from the S base rows (y in crop space; feet row = 40)
    S['proportions'] = {'top': 14, 'hair': [14, 22], 'face': [21, 23], 'head': [14, 23], 'shoulders': [23, 26], 'torso': [24, 31], 'belt': [30, 31],
                        'hands': [31, 32], 'legs': [32, 40], 'boots': [37, 40], 'heights': {'head': 10, 'torso': 8, 'legs': 9, 'total': 27},
                        'note': 'rows in crop space (feet row 40); head includes the 1 px top spike (row 14)',
                        'widths': {'shoulders': 16, 'hips': 9, 'head': 13, 'hairSpan': 13, 'withGear': bbox(C('idle', 'S', 0))['w']},
                        'heads': round(27 / 10, 2)}
    # palette: every colour of the full-gear hero over all crops, grouped into ramps (dark -> light)
    cnt = collections.Counter()
    for a in seqs:
        for d in ORDER:
            for c in seqs[a][d]['crops'][:6]:
                for p in c.getdata():
                    if p[3]: cnt[hx(p)] += 1
    S['palette'] = {k: {'n': v, 'name': NAMES.get(k, '?')} for k, v in cnt.most_common()}
    S['ramps'] = {'hair': ['#1f2357', '#104097', '#217aa6'], 'skin': ['#a64e21', '#ba8a38'], 'hand': ['#ba8a38', '#cc7c52'],
                  'armour': ['#433a60', '#644f77', '#907ca1', '#b5a0ba'], 'sleeve': ['#1f2357', '#104097'], 'pants': ['#1f2357', '#104097'],
                  'boots': ['#592104', '#a64e21'], 'cloth': ['#670948', '#a62144'], 'shieldRim': ['#a64e21', '#cc7c52', '#e5e0ac'],
                  'sword': ['#fafaf6'], 'hilt': ['#a64e21', '#ba8a38'], 'smear': ['#fafaf6']}
    # outline: none. Which colours sit on the silhouette edge?
    edge = collections.Counter(); total = 0
    for d in ORDER:
        im = C('idle', d, 0); p = im.load()
        for y in range(FH):
            for x in range(FW):
                if p[x, y][3] and any(not (0 <= x + dx < FW and 0 <= y + dy < FH) or not p[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    edge[NAMES.get(hx(p[x, y]), hx(p[x, y]))] += 1; total += 1
    S['outline'] = {'outer': None, 'silhouetteColours': {k: round(v / total, 3) for k, v in edge.most_common()},
                    'rule': 'no outer outline; navy #1f2357 (the hair / pants dark) carries most edges and the seams between parts; light materials (sword, armour highlight, shield rim) touch the background directly'}
    # timing: (unique pose, ms) runs straight from the GIF delays
    S['timing'] = {a: {'frames': 6, 'ms': [r[1] for r in seqs[a]['S']['run'][:6]], 'cycle': sum(r[1] for r in seqs[a]['S']['run'][:6])} for a in seqs}
    S['timing']['spear'] = {'frames': 6, 'ms': [200, 50, 50, 50, 150, 50], 'cycle': 550}
    S['timing']['hammer'] = {'frames': 6, 'ms': [250, 50, 50, 50, 300, 100], 'cycle': 800}
    S['posesPerDirection'] = {a: seqs[a]['S']['poses'] for a in seqs}
    # bob: top (hair) and bottom (feet) rows of the base body per frame, per direction
    def tb(a, d, k):
        b = bbox(C(a, d, k), ('#fafaf6',)); return [b['y'], b['y'] + b['h'] - 1]
    S['bob'] = {a: {d: [tb(a, d, k) for k in rng] for d in ORDER} for a, rng in (('idle', range(6, 12)), ('walk', range(6, 12)), ('attack', range(12, 18)))}
    # smear: white pixels per attack frame (sword + smear, gear poses 0-5)
    S['smear'] = {d: [sum(1 for p in C('attack', d, k).getdata() if p[3] and hx(p) == '#fafaf6') for k in range(6)] for d in ORDER}
    # mirror check: is W the flip of E? (no: all 8 are drawn)
    mir = {}
    for a1, a2 in (('E', 'W'), ('NE', 'NW'), ('SE', 'SW')):
        A, B = C('idle', a1, 0), C('idle', a2, 0).transpose(Image.FLIP_LEFT_RIGHT)
        same = sum(1 for p, q in zip(A.getdata(), B.getdata()) if p[3] and p == q); tot = sum(1 for p in A.getdata() if p[3])
        mir[a1 + '/' + a2] = round(same / tot, 2)
    S['mirrorMatch'] = mir
    S['refLint'] = {a: {d: [lint(C(a, d, k)) for k in range(6)] for d in ORDER} for a in seqs}
    lone = [l for a in S['refLint'].values() for d in a.values() for _, l in d]
    S['refLintSummary'] = {'lonePixelsPerFrame': {'min': min(lone), 'max': max(lone), 'mean': round(sum(lone) / len(lone), 1)}}
    return S


def main():
    download(); seqs = extract(); S = spec(seqs)
    with open(os.path.join(REF, 'SPEC.json'), 'w') as f: json.dump(S, f, indent=1)
    # raw RGBA atlases for board.js (gear poses 0-5, then base 6-11; attack also 12-23)
    idx = {}
    for a in seqs:
        buf = bytearray(); idx[a] = {}
        for d in ORDER:
            idx[a][d] = {'first': len(buf) // (FW * FH * 4), 'poses': seqs[a][d]['poses'], 'run': seqs[a][d]['run']}
            for c in seqs[a][d]['crops']: buf += c.tobytes()
        with open(os.path.join(REF, 'crops', a + '.rgba'), 'wb') as f: f.write(buf)
    with open(os.path.join(REF, 'crops', 'seq.json'), 'w') as f: json.dump({'frame': [FW, FH], 'origin': [OX, OY], 'anims': idx}, f)
    print(json.dumps({k: S[k] for k in ('dummyFront', 'proportions', 'timing', 'mirrorMatch', 'refLintSummary')}))
    print('smear S', S['smear']['S'], 'bob walk S', S['bob']['walk']['S'], 'bob walk E', S['bob']['walk']['E'], 'bob idle S', S['bob']['idle']['S'])
    print('outline', S['outline']['silhouetteColours'])


if __name__ == '__main__':
    main()
