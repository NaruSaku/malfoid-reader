# Malfoid Reader

An English comic collection illustrated by [Crepuscule3307](https://x.com/wanruochenhun).

- **Draconia Malfoy and the Boy Who Said No**, based on the [story by nomoontwo_](https://www.wattpad.com/story/416789252-draconia-malfoy-and-the-boy-who-said-no): Chapters **1, 1.1, 2, 2.1, 2.2, 2.3, 2.4, 3, and 3.1**, with 330 numbered comic pages and nine covers.
- **Flirt** (formerly Year 4), featuring Lyra Malfoy, based on the [story by DodgerWing](https://x.com/DodgerWing/status/2108657501407433152): Chapters **1, 9, and 13**, with **72 English comic pages and three chapter covers**. Chapter 9 includes all 37 approved pages, including the restored dialogue and final page order. Chapters 2–8 and 10–12 have not been added to this website.

Original stories are linked; their full text is not included. Chinese editions, drafts, and production references are excluded.

## Website

`site/` contains a complete static website. The homepage lists comics; `comic.html?comic=<id>` displays the selected comic and its chapters; `reader.html` opens its pages. Reading progress is saved independently for each comic. Page-by-page and scrolling reading, full-size enlargement, and light/dark backgrounds are supported.

Each image has a compact caption with its chapter and page number on the left, and **Original post on X** on the right when the exact post is known. The link opens the corresponding artwork post in a new tab. Pages awaiting a post URL remain readable and omit that link. Scrolling mode keeps only a narrow caption strip and a small gap between images.

Existing Draconia reader links without a `comic` parameter keep working, including their page numbers and original reading progress. Draconia page asset paths are preserved.

Published images are WebP quality 92 at 1024 × 1536. Larger approved 2:3 images are reduced proportionally to this reading size. Only the small chapter-list thumbnails are resized. Source PNGs remain in the local comic project and are not uploaded.

## Manual updates

There is no scheduled scraping, scheduled publishing, or automatic content synchronization. Run the exporter only when you want to publish new approved pages.

1. Keep approved English comic pages in their existing project and chapter folders.
2. Edit the selected comic in `catalog.source.json` to set its last approved page or add a chapter. To add another comic, add a separate entry with its own source folder, asset prefix, credits, and original-story link. This explicit list controls what becomes public; the exporter never discovers drafts automatically.
   Add the matching artwork posts to the chapter's `posts` list: each entry has a Roman-numeral `part`, `firstPage`, `lastPage`, and the artist's exact X post `url`. Page zero means the cover; body pages start at one even for a comic without a cover. Ranges must cover every published image exactly once. If the artist authorizes publishing before a URL is available, mark only those ranges with `"url": null, "pending": true`; their pages omit the X link. Once verified, replace null with the exact URL and remove `pending`, rebuild and manually publish. The builder rejects unmarked missing URLs and overlapping mappings. Post links are curated manually; building never fetches X or adds new pages automatically.
3. Install Pillow if needed: `python3 -m pip install -r requirements.txt`.
4. Run `python3 scripts/build.py --library-root "/absolute/path/to/novels"`. The library root is the folder containing the separate Draconia and Year 4 projects. The default matches the current local folder layout.
5. Run `python3 scripts/verify.py`.
6. Review the local preview, then commit and push changed files using GitHub Desktop or Git. If uploading through GitHub's website, keep each image in the exact relative folder generated under `site/comics/`, and replace `site/catalog.js` as well.
7. If the Pages deployment uses the manual workflow, run **Publish reader** under **Actions**, then **Run workflow**. The website is published only when you explicitly run it.

The exporter requires Python 3.9+ and Pillow. On this Mac, the Codex bundled Python can run the exporter without installing additional packages.

Flirt Chapter 1 uses original pages 1–4 followed by the latest English pages 5–9 in `中文原图对应版_第05-09页/`. These are English comic images despite the source-folder name. The old twelve-page edition is not part of the current reading sequence. Exact page overrides are recorded in `pageSources`. Flirt Chapter 9 uses the final 37-page sequence in `Year 4/漫画制作/Chapter9/英文彩色漫画/`; page 24 is the approved JPG. The stable `year-4` comic ID, asset paths, reading progress, and comment keys are retained after the rename. New chapter X artwork links are pending and omitted until verified. The original-story link remains the existing DodgerWing source link.

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

Flirt chapter covers were added on October22,2026. New links include `edition=2`; old body-page links and saved reading positions are translated once to preserve the same comic page after each cover was inserted. Body page numbering, artwork X links and discussion keys are unchanged.

The approved Flirt Chapter1 left-hand cover repair was saved on October22,2026. Its `coverRevision` selects versioned cover and thumbnail filenames so readers receive the corrected artwork without a stale cached image. The exporter retains this version on subsequent manual builds.

Draconia Chapter3, The Catch, includes46 approved story pages, back cover47 and the independent chapter cover. Page35 uses the formal JPG. Its X artwork URLs are pending; the original chapter link comes from the locally archived Wattpad part1660851417.

Flirt Chapter 13 includes the complete 26-page English sequence and its independent cover, published at the artist’s explicit request on October 25, 2026. Page 20 uses the approved facial revision, page 23 the artist’s selected image, and page 26 the latest END version. Missing X artwork links are pending. The chapter links to the existing original-story source.

Draconia Chapter 3.1, Earmuffs, includes 40 story pages, back cover 41, and its independent chapter cover. Pages 24, 32, 34, and 35 use the latest approved revisions. X artwork links remain pending; the original chapter link uses part 1661375623 from the locally archived Wattpad source.

Draconia’s `novelOnlyChapters` records original chapters confirmed by the artist as not adapted into comics. The directory places these notices in natural chapter order, only through the latest published comic chapter. Chapters 2.1b, 2.5, and 2.6 are currently marked; the notices link to the original novel and are excluded from comic counts, reader navigation, progress, and comments. The exporter preserves this metadata.
