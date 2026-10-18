#!/usr/bin/env python3
"""Check every exported page and every local HTML asset before publishing."""
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import urlsplit
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / 'site'
data = json.loads((SITE / 'catalog.js').read_text().removeprefix('window.MALFOID = ').strip().removesuffix(';'))
source = json.loads((ROOT / 'catalog.source.json').read_text())
assert [item['id'] for item in data['chapters']] == [item['id'] for item in source['chapters']]
assert data['totalPages'] == sum(item['lastPage'] for item in source['chapters'])
assert data['throughChapter'] == source['chapters'][-1]['number']
assert data['totalImages'] == data['totalPages'] + len(data['chapters'])
all_images = set()
for chapter in data['chapters']:
    assert len(chapter['pages']) == chapter['pageCount'] + 1
    assert [page['number'] for page in chapter['pages']] == list(range(chapter['pageCount'] + 1))
    assert chapter['storyUrl'].startswith('https://www.wattpad.com/')
    for page in chapter['pages']:
        path = SITE / page['src']
        assert path.is_relative_to(SITE)
        with Image.open(path) as image:
            assert image.format == 'WEBP'
            assert image.size == (1024, 1536), str(path)
            image.verify()
        all_images.add(path)
    path = SITE / chapter['thumbnail']
    with Image.open(path) as image:
        assert image.size == (480, 720)
        image.verify()
    all_images.add(path)
assert set((SITE / 'comics').rglob('*.webp')) == all_images, 'Unexpected or stale comic export'

class AssetCheck(HTMLParser):
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key not in ('src', 'href') or not value:
                continue
            parsed = urlsplit(value)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            target = (SITE / parsed.path).resolve()
            assert target.is_relative_to(SITE), value
            assert target.exists(), value

for name in ('index.html', 'reader.html'):
    html = (SITE / name).read_text()
    AssetCheck().feed(html)
    assert '<html lang="en">' in html
assert not list(SITE.rglob('*.png')), 'Original PNGs should not be published'
assert not list(SITE.rglob('*.txt')), 'Novel text and source notes should not be published'
size = sum(path.stat().st_size for path in SITE.rglob('*') if path.is_file())
assert size < 950_000_000, 'Approaching the GitHub Pages size limit'
print(f'PASS: {data["totalImages"]} full-size English images, {len(data["chapters"])} thumbnails, chapter order, HTML assets, and publication size ({size / 1048576:.1f} MiB).')
