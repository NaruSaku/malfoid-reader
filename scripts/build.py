#!/usr/bin/env python3
"""Manually export an explicit selection of approved English comic pages."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

from PIL import Image, ImageOps

REPO = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, default=REPO.parent)
    parser.add_argument('--workers', type=int, default=4)
    args = parser.parse_args()
    source_root = args.source_root.resolve()
    config = json.loads((REPO / 'catalog.source.json').read_text())
    cache_path = REPO / '.build-cache.json'
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    site = REPO / 'site'
    jobs, chapters, expected = [], [], set()
    quality = config['quality']
    if not 85 <= quality <= 100:
        raise ValueError('Use a WebP quality between 85 and 100 for readable comic text.')

    for item in config['chapters']:
        directory = (source_root / item['source']).resolve()
        # Only explicitly approved directories and exact filenames can be exported.
        if not directory.is_relative_to(source_root) or any(
            name in directory.parts for name in ('待确认', '历史版本', '中文版')
        ):
            raise ValueError(f'Not an approved English source directory: {directory}')
        if item['lastPage'] < 1:
            raise ValueError('A chapter must contain at least one approved page.')
        pages = []
        filenames = [item['cover']] + [f'第{n:02d}页_英文版.png' for n in range(1, item['lastPage'] + 1)]
        for index, name in enumerate(filenames):
            source = directory / name
            if not source.is_file():
                raise FileNotFoundError(f'Approved page is missing: {source}')
            relative = f'comics/{item["id"]}/{"cover" if index == 0 else f"{index:03d}"}.webp'
            target = site / relative
            expected.add(target)
            stat = source.stat()
            signature = f'{source}:{stat.st_size}:{stat.st_mtime_ns}:{quality}:v1'
            jobs.append((source, target, signature, False))
            pages.append({'src': relative, 'label': 'Cover' if index == 0 else f'Page {index}', 'number': index})
        thumb = f'comics/{item["id"]}/thumbnail.webp'
        target = site / thumb
        expected.add(target)
        source = directory / item['cover']
        stat = source.stat()
        jobs.append((source, target, f'{source}:{stat.st_size}:{stat.st_mtime_ns}:thumb:v1', True))
        chapters.append({key: item[key] for key in ('id', 'number', 'title', 'description', 'storyUrl')} | {
            'pages': pages, 'pageCount': item['lastPage'], 'thumbnail': thumb
        })

    def convert(job):
        source, target, signature, thumbnail = job
        key = str(target.relative_to(REPO))
        if cache.get(key) == signature and target.exists():
            return key, signature, False
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as original:
            original.load()
            image = ImageOps.exif_transpose(original).convert('RGB')
            if not thumbnail and image.size != (1024, 1536):
                raise ValueError(f'Unexpected comic dimensions {image.size}: {source}')
            if thumbnail:
                image.thumbnail((480, 720), Image.Resampling.LANCZOS)
            temporary = target.with_suffix('.tmp')
            image.save(temporary, format='WEBP', quality=86 if thumbnail else quality, method=6)
            temporary.replace(target)
        return key, signature, True

    changed = 0
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        for index, future in enumerate(as_completed(pool.submit(convert, job) for job in jobs), 1):
            key, signature, converted = future.result()
            cache[key] = signature
            changed += converted
            if index % 20 == 0 or index == len(jobs):
                print(f'Prepared {index}/{len(jobs)} images', flush=True)

    # Remove only stale generated derivatives, never source images.
    for path in (site / 'comics').rglob('*.webp'):
        if path not in expected:
            path.unlink()
    public = {key: config[key] for key in ('title', 'subtitle', 'artist', 'author', 'storyUrl')}
    public['chapters'] = chapters
    public['totalPages'] = sum(ch['pageCount'] for ch in chapters)
    public['totalImages'] = sum(len(ch['pages']) for ch in chapters)
    public['throughChapter'] = chapters[-1]['number']
    public['updated'] = datetime.now(timezone.utc).date().isoformat()
    payload = json.dumps(public, ensure_ascii=False, separators=(',', ':'))
    (site / 'catalog.js').write_text('window.MALFOID = ' + payload + ';\n')
    (site / '.nojekyll').touch()
    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2))
    size = sum(p.stat().st_size for p in expected)
    print(f'{len(chapters)} chapters · {public["totalPages"]} comic pages + {len(chapters)} covers · {size / 1048576:.1f} MiB · {changed} converted')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError) as error:
        print(f'Build stopped: {error}', file=sys.stderr)
        sys.exit(1)
