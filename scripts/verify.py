#!/usr/bin/env python3
"""Check every exported page and every local HTML asset before publishing."""
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import urlsplit
from PIL import Image
from build import page_posts

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / 'site'
data = json.loads((SITE / 'catalog.js').read_text().removeprefix('window.MALFOID = ').strip().removesuffix(';'))
source = json.loads((ROOT / 'catalog.source.json').read_text())
assert [item['id'] for item in data['comics']] == [item['id'] for item in source['comics']]
assert len({item['id'] for item in data['comics']}) == len(data['comics'])
assert data['totalPages'] == sum(item['lastPage'] for comic in source['comics'] for item in comic['chapters'])
all_images = set()
for comic, original in zip(data['comics'], source['comics']):
    assert [ch['id'] for ch in comic['chapters']] == [ch['id'] for ch in original['chapters']]
    assert comic['totalPages'] == sum(ch['lastPage'] for ch in original['chapters'])
    assert comic['totalImages'] == sum(len(ch['pages']) for ch in comic['chapters'])
    assert comic['throughChapter'] == original['chapters'][-1]['number']
    for chapter, source_chapter in zip(comic['chapters'], original['chapters']):
        posts = page_posts(source_chapter)
        assert len(chapter['pages']) == chapter['pageCount'] + int(bool(source_chapter.get('cover')))
        start = 0 if chapter['hasCover'] else 1
        assert [page['number'] for page in chapter['pages']] == list(range(start, chapter['pageCount'] + 1))
        assert chapter['storyUrl'].startswith('https://')
        for page in chapter['pages']:
            post = posts[page['number']]
            assert page['originalPost'] == post['url']
            assert page['postPart'] == post['part']
            path = SITE / page['src']
            assert path not in all_images, 'Two comics must not share page assets'
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
assert data['totalImages'] == sum(comic['totalImages'] for comic in data['comics'])
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

for name in ('index.html', 'comic.html', 'reader.html'):
    html = (SITE / name).read_text()
    AssetCheck().feed(html)
    assert '<html lang="en">' in html
assert not list(SITE.rglob('*.png')), 'Original PNGs should not be published'
assert not list(SITE.rglob('*.txt')), 'Novel text and source notes should not be published'
size = sum(path.stat().st_size for path in SITE.rglob('*') if path.is_file())
assert size < 950_000_000, 'Approaching the GitHub Pages size limit'
print(f'PASS: {len(data["comics"])} separate comics, {data["totalImages"]} full-size English images and corresponding original X posts, chapter order, HTML assets, and publication size ({size / 1048576:.1f} MiB).')
