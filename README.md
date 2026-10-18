# Malfoid Reader

An English comic collection illustrated by [Crepuscule3307](https://x.com/wanruochenhun).

- **Draconia Malfoy and the Boy Who Said No**, based on the [story by nomoontwo_](https://www.wattpad.com/story/416789252-draconia-malfoy-and-the-boy-who-said-no): Chapters **1, 1.1, 2, and 2.1**, with 137 comic pages and four covers.
- **Year 4**, featuring Lyra Malfoy, based on the [one-shot by DodgerWing](https://x.com/DodgerWing/status/2108657501407433152): the complete latest **nine-page** English edition.

Original stories are linked; their full text is not included. Chinese editions, drafts, and production references are excluded.

## Website

`site/` contains a complete static website. The homepage lists comics; `comic.html?comic=<id>` displays the selected comic and its chapters; `reader.html` opens its pages. Reading progress is saved independently for each comic. Page-by-page and scrolling reading, full-size enlargement, and light/dark backgrounds are supported.

Existing Draconia reader links without a `comic` parameter keep working, including their page numbers and original reading progress. Draconia page asset paths are preserved.

Published images are WebP quality 92 at the original 1024 × 1536 dimensions. Only the small chapter-list thumbnails are resized. Source PNGs remain in the local comic project and are not uploaded.

## Manual updates

There is no scheduled scraping, scheduled publishing, or automatic content synchronization. Run the exporter only when you want to publish new approved pages.

1. Keep approved English comic pages in their existing project and chapter folders.
2. Edit the selected comic in `catalog.source.json` to set its last approved page or add a chapter. To add another comic, add a separate entry with its own source folder, asset prefix, credits, and original-story link. This explicit list controls what becomes public; the exporter never discovers drafts automatically.
3. Install Pillow if needed: `python3 -m pip install -r requirements.txt`.
4. Run `python3 scripts/build.py --library-root "/absolute/path/to/novels"`. The library root is the folder containing the separate Draconia and Year 4 projects. The default matches the current local folder layout.
5. Run `python3 scripts/verify.py`.
6. Review the local preview, then commit and push changed files using GitHub Desktop or Git. If uploading through GitHub's website, keep each image in the exact relative folder generated under `site/comics/`, and replace `site/catalog.js` as well.
7. If the Pages deployment uses the manual workflow, run **Publish reader** under **Actions**, then **Run workflow**. The website is published only when you explicitly run it.

The exporter requires Python 3.9+ and Pillow. On this Mac, the Codex bundled Python can run the exporter without installing additional packages.

Year 4 uses original pages 1–4 followed by the latest English pages 5–9 in `中文原图对应版_第05-09页/`. These are English comic images despite the source-folder name. The old twelve-page edition is not part of the current reading sequence. Exact page overrides are recorded in `pageSources`.

## Local preview

Run `python3 -m http.server 8765 --bind 127.0.0.1 --directory site`, then open `http://127.0.0.1:8765/`.

GitHub Pages must publish the contents of `site/`. When using a custom workflow, configure the repository's **Settings → Pages → Source** as **GitHub Actions**.

## Credits

This is a noncommercial, AI-assisted Harry Potter fan comic adaptation. Artwork and story credits remain with their respective creators. No general reuse license is granted by this repository.
