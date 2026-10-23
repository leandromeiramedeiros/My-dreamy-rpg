# Builds the interactive Booklet page (tools/out/booklet/site/index.html) from docs/booklet/booklet.md and
# docs/GLOSSARY.md. Every glossary term in the booklet links to its glossary row; images come from tools/out/booklet/img.
# Usage: python tools/booklet/build.py
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MD = os.path.join(ROOT, 'docs', 'booklet', 'booklet.md')
GL = os.path.join(ROOT, 'docs', 'GLOSSARY.md')
OUT = os.path.join(ROOT, 'tools', 'out', 'booklet', 'site')
TPL = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'page.html')


def glossary():
    sec, sub, rows, secs = '', '', [], []
    for line in open(GL, encoding='utf8'):
        line = line.rstrip('\n')
        m = re.match(r'^## (\d+)\. (.+)', line)
        if m:
            sec, sub = m.group(1), ''
            secs.append({'id': sec, 'title': m.group(2)})
            continue
        m = re.match(r'^### (\d+\.\d+) (.+)', line)
        if m:
            sub = m.group(1)
            secs.append({'id': sub, 'title': m.group(2), 'sub': True})
            continue
        if not sec or not line.startswith('| ') or line.startswith('| Term') or line.startswith('|---'):
            continue
        cells = [c.strip() for c in re.split(r'(?<!\\)\|', line.strip().strip('|'))]
        if len(cells) < 5:
            continue
        term, meaning, code, nots, status = cells[:5]
        rows.append({'t': term, 'm': meaning, 'c': code, 'n': nots, 's': status, 'sec': sub or sec})
    return secs, rows


def booklet():
    md = open(MD, encoding='utf8').read()
    # storyboard panels: "N. `file.jpg` caption" -> a figure
    def panel(m):
        n, img, cap = m.group(1), m.group(2), m.group(3)
        return f'<figure class="panel"><img src="img/{img}" alt="" loading="lazy"><figcaption><b class="pn">{n}</b> {cap}</figcaption></figure>\n'
    md = re.sub(r'^(\d+)\. `([\w-]+\.(?:jpg|png))` (.+)$', panel, md, flags=re.M)
    # zone headings carrying a map: "### ... · `map-x.jpg`" -> heading + figure
    def zone(m):
        head, img = m.group(1).rstrip(' ·'), m.group(2)
        return f'{head}\n\n<figure class="map"><img src="img/{img}" alt="" loading="lazy"></figure>\n'
    md = re.sub(r'^(#{2,3} .+?)\s*·?\s*`([\w-]+\.(?:jpg|png))`\s*$', zone, md, flags=re.M)
    # any other lone image reference
    md = re.sub(r'`([\w-]+\.(?:jpg|png))`', r'<figure class="extra"><img src="img/\1" alt="" loading="lazy"></figure>', md)
    if 'cover.jpg' not in md:
        cover = '<figure class="cover"><img src="img/cover.jpg" alt="Karea and Pip under the dream sky"></figure>'
        md = re.sub(r'^(# .+)$', lambda m: m.group(1) + '\n\n' + cover, md, count=1, flags=re.M)
    return md


def main():
    secs, rows = glossary()
    page = open(TPL, encoding='utf8').read()
    data = json.dumps({'md': booklet(), 'secs': secs, 'rows': rows}, ensure_ascii=False)
    page = page.replace('/*__DATA__*/null', data.replace('</', '<\\/'))
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf8').write(page)
    print(f'booklet: {len(rows)} glossary rows, {len(secs)} sections -> {os.path.relpath(OUT, ROOT)}/index.html')


main()
