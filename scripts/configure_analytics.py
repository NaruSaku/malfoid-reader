#!/usr/bin/env python3
"""Install the public Cloudflare Web Analytics site token on all reader pages."""
import argparse
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
START = '<!-- Cloudflare Web Analytics -->'
END = '<!-- End Cloudflare Web Analytics -->'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--token', required=True, help='Public 32-character site token from the installation snippet, not an API key')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-fA-F0-9]{32}', args.token):
        parser.error('Use the public 32-character hexadecimal site token from data-cf-beacon.')
    # Count document visits, without treating comic-page navigation as new visits.
    settings = json.dumps({'token': args.token.lower(), 'spa': False}, separators=(',', ':'))
    snippet = f'{START}\n<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{settings}\'></script>\n{END}'
    changes = []
    for name in ('index.html', 'comic.html', 'reader.html'):
        path = ROOT / 'site' / name
        html = path.read_text()
        pattern = re.escape(START) + r'.*?' + re.escape(END)
        if START in html:
            if html.count(START) != 1 or html.count(END) != 1:
                raise ValueError(f'Unexpected analytics markers in {name}')
        unmanaged = re.sub(pattern, '', html, flags=re.S)
        if 'cloudflareinsights.com/beacon.min.js' in unmanaged:
            raise ValueError(f'Unmanaged Cloudflare snippet in {name}; review it before installing another')
        if html.count('</body>') != 1:
            raise ValueError(f'Expected one closing body tag in {name}')
        if START in html:
            html = re.sub(pattern, lambda match: snippet, html, flags=re.S)
        else:
            html = html.replace('</body>', snippet + '\n</body>')
        changes.append((path, html))
    for path, html in changes:
        path.write_text(html)
    print('Configured Cloudflare Web Analytics on all three HTML pages. Review and publish to start collection.')


if __name__ == '__main__':
    main()
