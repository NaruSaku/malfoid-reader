# Malfoid Reader

The English comic adaptation of **Draconia Malfoy and the Boy Who Said No**, illustrated by [Crepuscule3307](https://x.com/wanruochenhun), based on the [original story by nomoontwo_](https://www.wattpad.com/story/416789252-draconia-malfoy-and-the-boy-who-said-no).

Initial publication: Chapters **1, 1.1, 2, and 2.1** — 137 comic pages and four covers. The novel is linked on Wattpad; its text is not included. Later chapters, Chinese editions, drafts, and production references are excluded.

## Website

`site/` contains a complete static website. It supports chapter navigation, page-by-page and scrolling reading, full-size enlargement, light/dark reading backgrounds, and reading progress saved in the visitor's browser.

Published images are WebP quality 92 at the original 1024 × 1536 dimensions. Only the small chapter-list thumbnails are resized. Source PNGs remain in the local comic project and are not uploaded.

## Manual updates

There is no scheduled scraping, scheduled publishing, or automatic content synchronization. Run the exporter only when you want to publish new approved pages.

1. Keep approved English comic pages in their existing chapter folders.
2. Edit `catalog.source.json` to set the last approved page or add the next chapter. This explicit list controls what becomes public; the exporter never discovers drafts automatically.
3. Install Pillow if needed: `python3 -m pip install -r requirements.txt`.
4. Run `python3 scripts/build.py --source-root "/absolute/path/to/the/comic/project"`.
5. Run `python3 scripts/verify.py`.
6. Review the local preview, then commit and push the changed website files using GitHub Desktop or Git. If uploading through GitHub's website, put each chapter's WebP files in its matching `site/comics/<chapter-id>/` folder, and replace `site/catalog.js` as well.
7. If the Pages deployment uses the manual workflow, run **Publish reader** under **Actions**, then **Run workflow**. The website is published only when you explicitly run it.

The exporter requires Python 3.9+ and Pillow. On this Mac, the Codex bundled Python can run the exporter without installing additional packages.

## Local preview

Run `python3 -m http.server 8765 --bind 127.0.0.1 --directory site`, then open `http://127.0.0.1:8765/`.

GitHub Pages must publish the contents of `site/`. When using a custom workflow, configure the repository's **Settings → Pages → Source** as **GitHub Actions**.

## Credits

This is a noncommercial, AI-assisted Harry Potter fan comic adaptation. Artwork and story credits remain with their respective creators. No general reuse license is granted by this repository.
