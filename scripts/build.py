#!/usr/bin/env python3
"""Manually export an explicit selection of approved English comic pages."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sys

from PIL import Image, ImageOps

REPO = Path(__file__).resolve().parent.parent


def page_posts(chapter):
    """Resolve curated ranges; explicitly pending URLs stay absent until supplied."""
    first = 0 if chapter.get('cover') else 1
    expected = set(range(first, chapter['lastPage'] + 1))
    result = {}
    for post in chapter['posts']:
        if post.get('pending') is True:
            if post.get('url') is not None:
                raise ValueError('A pending original post must have a null URL.')
        elif not isinstance(post.get('url'), str) or not re.fullmatch(r'https://x\.com/wanruochenhun/status/[0-9]+', post['url']):
            raise ValueError(f'Invalid original artwork post: {post.get("url")}')
        if not re.fullmatch(r'[IVXLCDM]+', post['part']):
            raise ValueError('A post part must be a Roman numeral.')
        numbers = set(range(post['firstPage'], post['lastPage'] + 1))
        if not numbers or not numbers <= expected or numbers & result.keys():
            raise ValueError(f'Overlapping or invalid original-post range: {chapter["id"]}')
        result.update({number: post for number in numbers})
    if result.keys() != expected:
        raise ValueError(f'Every published page needs a confirmed or explicitly pending post range: {chapter["id"]}')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--library-root', type=Path, default=REPO.parent.parent,
                        help='Folder containing the separate novel/comic projects')
    parser.add_argument('--workers', type=int, default=4)
    args = parser.parse_args()
    library_root = args.library_root.resolve()
    config = json.loads((REPO / 'catalog.source.json').read_text())
    cache_path = REPO / '.build-cache.json'
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    site = REPO / 'site'
    jobs, comics, expected = [], [], set()
    quality = config['quality']
    if not 85 <= quality <= 100:
        raise ValueError('Use a WebP quality between 85 and 100 for readable comic text.')

    for comic in config['comics']:
        source_root = (library_root / comic['sourceRoot']).resolve()
        if not source_root.is_relative_to(library_root):
            raise ValueError('A project must be inside the library root.')
        chapters = []
        for item in comic['chapters']:
            directory = (source_root / item['source']).resolve()
            if not directory.is_relative_to(source_root) or any(
                name in directory.parts for name in ('待确认', '历史版本', '中文版')
            ):
                raise ValueError(f'Not an approved English source directory: {directory}')
            if item['lastPage'] < 1:
                raise ValueError('A chapter must contain at least one approved page.')
            posts = page_posts(item)
            prefix = Path('comics') / comic['assetPrefix'] / item['id']
            pages, entries = [], []
            if item.get('cover'):
                entries.append((0, item['cover']))
            for number in range(1, item['lastPage'] + 1):
                name = item.get('pageSources', {}).get(str(number)) or item['filenamePattern'].format(page=number)
                entries.append((number, name))
            first_source = None
            for number, name in entries:
                source = (directory / name).resolve()
                if not source.is_relative_to(source_root) or any(
                    part in source.parts for part in ('待确认', '历史版本', '中文版')
                ):
                    raise ValueError(f'Not an approved English page: {source}')
                if not source.is_file():
                    raise FileNotFoundError(f'Approved page is missing: {source}')
                first_source = first_source or source
                relative = (prefix / ('cover.webp' if number == 0 else f'{number:03d}.webp')).as_posix()
                target = site / relative
                expected.add(target)
                stat = source.stat()
                signature = f'{source}:{stat.st_size}:{stat.st_mtime_ns}:{quality}:v1'
                jobs.append((source, target, signature, False))
                pages.append({
                    'src': relative, 'label': 'Cover' if number == 0 else f'Page {number}', 'number': number,
                    'originalPost': posts[number]['url'], 'postPart': posts[number]['part']
                })
            thumb = (prefix / 'thumbnail.webp').as_posix()
            target = site / thumb
            expected.add(target)
            stat = first_source.stat()
            jobs.append((first_source, target, f'{first_source}:{stat.st_size}:{stat.st_mtime_ns}:thumb:v1', True))
            chapters.append({key: item[key] for key in ('id', 'number', 'title', 'description', 'storyUrl')} | {
                'pages': pages, 'pageCount': item['lastPage'], 'thumbnail': thumb, 'hasCover': bool(item.get('cover'))
            })
        public_comic = {key: value for key, value in comic.items()
                        if key not in ('sourceRoot', 'assetPrefix', 'chapters')}
        public_comic['chapters'] = chapters
        public_comic['totalPages'] = sum(ch['pageCount'] for ch in chapters)
        public_comic['totalImages'] = sum(len(ch['pages']) for ch in chapters)
        public_comic['throughChapter'] = chapters[-1]['number']
        public_comic['thumbnail'] = chapters[0]['thumbnail']
        public_comic['preview'] = chapters[0]['pages'][0]['src']
        comics.append(public_comic)

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
                if image.width >= 1024 and image.height >= 1536 and image.width * 3 == image.height * 2:
                    image = image.resize((1024, 1536), Image.Resampling.LANCZOS)
                else:
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
    public = {key: config[key] for key in ('title', 'artist')}
    public['comics'] = comics
    public['totalPages'] = sum(comic['totalPages'] for comic in comics)
    public['totalImages'] = sum(comic['totalImages'] for comic in comics)
    public['updated'] = datetime.now(timezone.utc).date().isoformat()
    payload = json.dumps(public, ensure_ascii=False, separators=(',', ':'))
    (site / 'catalog.js').write_text('window.MALFOID = ' + payload + ';\n')
    (site / '.nojekyll').touch()
    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2))
    size = sum(p.stat().st_size for p in expected)
    print(f'{len(comics)} comics · {public["totalPages"]} comic pages · {public["totalImages"]} reading images · {size / 1048576:.1f} MiB · {changed} converted')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError) as error:
        print(f'Build stopped: {error}', file=sys.stderr)
        sys.exit(1)
