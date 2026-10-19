# Malfoid Reader

An English comic collection illustrated by [Crepuscule3307](https://x.com/wanruochenhun).

- **Draconia Malfoy and the Boy Who Said No**, based on the [story by nomoontwo_](https://www.wattpad.com/story/416789252-draconia-malfoy-and-the-boy-who-said-no): Chapters **1, 1.1, 2, and 2.1**, with 137 comic pages and four covers.
- **Year 4**, featuring Lyra Malfoy, based on the [one-shot by DodgerWing](https://x.com/DodgerWing/status/2108657501407433152): the complete latest **nine-page** English edition.

Original stories are linked; their full text is not included. Chinese editions, drafts, and production references are excluded.

## Website

`site/` contains a complete static website. The homepage lists comics; `comic.html?comic=<id>` displays the selected comic and its chapters; `reader.html` opens its pages. Reading progress is saved independently for each comic. Page-by-page and scrolling reading, full-size enlargement, and light/dark backgrounds are supported.

Each image has a compact caption with its chapter and page number on the left, and **Original post on X** on the right. The link opens the corresponding artwork post in a new tab. Scrolling mode keeps only a narrow caption strip and a small gap between images.

Existing Draconia reader links without a `comic` parameter keep working, including their page numbers and original reading progress. Draconia page asset paths are preserved.

Published images are WebP quality 92 at the original 1024 × 1536 dimensions. Only the small chapter-list thumbnails are resized. Source PNGs remain in the local comic project and are not uploaded.

## Manual updates

There is no scheduled scraping, scheduled publishing, or automatic content synchronization. Run the exporter only when you want to publish new approved pages.

1. Keep approved English comic pages in their existing project and chapter folders.
2. Edit the selected comic in `catalog.source.json` to set its last approved page or add a chapter. To add another comic, add a separate entry with its own source folder, asset prefix, credits, and original-story link. This explicit list controls what becomes public; the exporter never discovers drafts automatically.
   Add the matching artwork posts to the chapter's `posts` list: each entry has a Roman-numeral `part`, `firstPage`, `lastPage`, and the artist's exact X post `url`. Page zero means the cover; body pages start at one even for a comic without a cover. Ranges must cover every published image exactly once. The builder rejects missing or overlapping mappings. Post links are curated manually; building never fetches X or adds new pages automatically.
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

## Website analytics

Cloudflare Web Analytics can be added without moving this site or changing its URL. In your Cloudflare account, open **Observability → Analytics → Web analytics**, add the hostname `narusaku.github.io`, then copy the installation snippet. Use its public `data-cf-beacon` site token with `python3 scripts/configure_analytics.py --token <public-site-token>`. This installs the beacon on the collection, comic, and reader pages. Review and run the normal manual publishing workflow. An account API key is not needed and must never be put into the website.

Statistics start after installation and publication; earlier visits cannot be recovered through this integration. The dashboard reports visits, page views, referrers, country, device/browser, and performance. Cloudflare does not expose individual visitor identities or raw GitHub Pages server logs here. It omits query strings, so these basic reports do not separate comics or chapters selected through `?comic=...&chapter=...`. SPA measurement is disabled so reading navigation does not inflate document page-view counts. Browser blockers can prevent measurement, and these numbers are estimates rather than a complete request log.

Cloudflare Web Analytics was enabled on all three page types on October 18, 2026. View the reports in your Cloudflare account under **Observability → Analytics → Web analytics → narusaku.github.io**. The dashboard is private to your account. Changing the token requires running the configuration helper and manually publishing again.

## Reader comments

Comments and reactions use [giscus](https://giscus.app/) and the repository's GitHub Discussions. Reading comments does not require an account; posting requires signing in with GitHub. Each comic's introduction page has a general conversation, and each chapter has its own conversation at the bottom of scrolling mode or after its last page in page mode. Different comics and chapters are kept separate; changing pages or reading mode within a chapter keeps the same discussion.

Public widget settings live in `site/comments.config.js`. Stable discussion keys use the comic/chapter IDs, rather than page URLs or titles. Strict matching prevents similarly named chapters from sharing comments. The iframe loads near the comment section, follows the reading background, and offers a GitHub link if it cannot load. `giscus.json` restricts allowed embedding origins to this site, the giscus configurator, and the local preview. Moderation is done in the repository's **Discussions** tab.

The giscus GitHub App needs metadata read access and Discussions read/write access for `NaruSaku/malfoid-reader`. No personal access token is placed in the website. New discussion threads are created by giscus when the first reader leaves a comment or reaction; installation testing should not post sample comments.

## Credits

This is a noncommercial, AI-assisted Harry Potter fan comic adaptation. Artwork and story credits remain with their respective creators. No general reuse license is granted by this repository.
