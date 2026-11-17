# Malfoid Reader

An English comic collection illustrated by [Crepuscule3307](https://x.com/wanruochenhun).

- **Draconia Malfoy and the Boy Who Said No**, based on the [story by nomoontwo_](https://www.wattpad.com/story/416789252-draconia-malfoy-and-the-boy-who-said-no): Chapters **1, 1.1, 2, 2.1, 2.2, 2.3, 2.4, 3, 3.1, 3.2, 4, 4.1, 4.2, 5, 5.1, and 5.2**, with 695 numbered comic pages and sixteen covers.
- **Flirt** (formerly Year 4), featuring Lyra Malfoy, based on the [story by DodgerWing](https://x.com/DodgerWing/status/2108657501407433152): Chapters **1, 2, 3, 9, 13, 14, 15, 16, 17, 18, and 19**, with **247 English comic pages and eleven chapter covers**. Chapter 9 includes all 37 approved pages, including the restored dialogue and final page order. Chapters 3–8 and 10–12 have not been added to this website.

- **Harry Potter and the American Vacation**, based on the [story by ShamashAran](https://x.com/ShamashAran/status/2110889440096690327): Chapter **1**, with **46 English comic pages and its chapter cover**.

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

Draconia’s `novelOnlyChapters` records original chapters confirmed by the artist as not adapted into comics. A separate section below the comic chapter grid lists these chapters in natural order, only through the latest published comic chapter. Chapters 2.1b, 2.5, and 2.6 are currently marked; the notices link to the original novel and are excluded from comic counts, reader navigation, progress, and comments. The exporter preserves this metadata.

American Vacation Chapter 1 was published from the artist’s approved formal English files. Its cover uses the approved clear-face edition; pages 34 and 40 use the approved hand revisions, and pages 41, 45, and 46 use their saved final versions. The 2048×3072 cover is reduced proportionally to the website’s 1024×1536 reading size. New artwork X links are pending. The author’s original-story post is linked; no novel text is hosted.

Draconia Chapter 3.2, Ron’s List, includes 33 story pages, back cover 34, and its independent red-and-gold chapter cover. All 35 formal source images match their approved SHA-256 records. Artwork X links remain pending; the original chapter link uses locally archived Wattpad part 1662264139.

Draconia Chapter 4, Scared, Potter?, includes 54 story pages, back cover 55, and its independent chapter cover. The cover and pages 4, 12, 15, 19, 41, 42, and 55 match their latest approved save records. The original-story link points to the novel directory until its exact chapter URL is available. Artwork X links remain pending.

Draconia Chapter 4.1, You Should Have Been Ours, includes 58 story pages, back cover 59, and its approved independent cover. Pages 16–20 use the saved Luna earring revisions, pages 28/31 use the approved narration revisions, pages 43–57 use the current map classroom artwork, and page 58 uses the approved left-aligned narration. Superseded trophy-room artwork is excluded. Original-story and artwork X chapter links are pending.

All entries in the separate Novel-only chapters section below the adapted comics display the status Not Adapted, including Chapters 2.4a and 4.1b. Explicitly listed omitted chapters stay visible even when their number follows the latest published comic chapter.

Flirt Chapter 14 includes its independent approved cover and the complete 18-page English comic sequence. All 19 source images match the latest saved revision records, including the November 1 house-colour revisions. Artwork X links are pending; the original-story link uses the existing author post. Published at the artist’s explicit request on November 3, 2026.

Draconia Chapter 4.2, Visiting Hours, includes all 54 numbered English pages and its approved independent cover. Source hashes match the saved approval records, including the latest Flint revision on page 32 and height revision on page 53. Original-story and artwork X chapter links are pending. Published at the artist’s explicit request on November 5, 2026.

Draconia Chapter Five, Dementors, includes 76 story pages, back cover 77, and its approved independent movie-poster cover. All 78 source images match the formal approval records, including the approved hood continuity on pages 68–69 and silver phoenix on page 71. Separate unapproved revisions are excluded. Original-story and artwork X chapter links are pending. Published at the artist’s explicit request on November 9, 2026.

Flirt Chapter 15 includes its approved independent cover and the complete 19-page English comic sequence. All 20 source images match the latest saved November 11 versions, including the page 16/18 revisions and the platinum-hair cover. Artwork X links are pending; the original-story link uses the existing author post. Published at the artist’s explicit request on November 11, 2026.

## Chapter likes

Each chapter card also shows its shared like total beneath the cover, beside the chapter/page information. These read-only counts use the same API and stable chapter keys as the reader, refresh when readers return to the list, and do not create votes or browser identifiers. An unavailable count displays an em dash rather than zero.

Every chapter has an independent shared like count in the reader toolbar. Visitors can like or unlike without signing in. One random browser identifier is kept in localStorage, so refreshing, changing pages, and switching reading modes do not add extra votes. Counts are stored by the owner’s Cloudflare Worker and D1 database, separately from GitHub comments and reactions. Clearing browser storage or using another browser creates a different voter; this is a reaction counter rather than a count of verified unique people.

`site/likes.config.js` contains only the public API URL. The application stores a hash of the random identifier, the chapter key, and vote creation time, with no account details or application-level IP/fingerprint collection. Cloudflare’s ordinary platform processing still applies. Failed requests show a retry message rather than a fabricated count. Backend source, schema, deployment notes, and tests are in `services/likes/`.

## Anonymous page comments

Every comic image has its own collapsible, login-free comment panel beneath the caption in both reading modes. A name is optional; comments appear publicly immediately and are kept separate by comic, chapter, and numbered page. Existing GitHub comic/chapter discussions remain available. Comments are plain text, up to 2,000 characters, with basic rate limits and duplicate-request protection.

The owner can manage comments in Cloudflare D1 → malfoid-reader-likes → Explore Data → page_comments. Changing a row’s status to hidden removes it from public view without deleting the record. The application stores public comment data, a hashed random browser identifier, and a daily changing network hash for rate limiting; raw IPs and account details are not stored by application code. Cloudflare’s ordinary platform processing still applies. See services/comments/README.md for moderation, data handling, API details, and tests.

Draconia Chapter 5.1, Top of the Class, includes its approved independent cover and all 47 approved English pages. Source hashes match the formal records, including the latest November 10 revisions to pages 22, 30, and 32. Original artwork post links are pending; the original-story directory remains linked. Released under the artist’s November 12 scheduled publication authorization.

Flirt Chapter 16 includes its independent cover and complete 28-page English sequence, published at the artist’s November 13, 2026 request. It uses the current page 4 JPG replacement, the latest page 6 arm revision, the approved page 14 redraw, and page 28 with the ending marker. Original artwork post links remain pending. Chapter-list titles continue to display chapter numbers without summaries.

Draconia Chapter 5.2, The Firebolt Feud, includes its approved independent cover and all 39 approved English pages. Source hashes match the latest saved formal versions, including the November 12 chair revisions to pages 10–12 and November 13 caption revisions to pages 31–32. Original artwork post links remain pending. Published at the artist’s November 13, 2026 request.

Flirt Chapter 17 includes its newly designed cover and complete 24-page English sequence, published at the artist’s request. All source hashes match the current saved versions, including the latest revisions to pages 12, 22, and 24. Original artwork post links remain pending.

Flirt Chapter 18 includes its current series cover and complete 22-page English sequence, published at the artist’s November 15, 2026 request. Page 21 uses the current JPG with completed dialogue, replacing the blank-balloon PNG in the production index. Pages 18, 19, and 22 use the latest saved revisions. Original artwork post links remain pending.

Flirt Chapter 2 includes all 20 current English pages, inserted after Chapter 1 at the artist’s November 15, 2026 request. It uses the saved page 2/8/9/11 repairs and restored page 13/14/18 originals. Its approved independent cover and matching thumbnail are now included. Original artwork post links remain pending.

The artist approved Flirt Chapter 2’s entire freshly drawn cover on November 15, 2026. The exact approved PNG was saved locally before publishing web copies. Chapter 2 now uses edition 3 links; earlier edition 2 URLs and saved positions move forward by one image to preserve the same body page. Other Flirt chapters keep edition 2. Body page numbers and per-image comment keys remain unchanged.

Flirt Chapter 19 includes its independent cover and complete 26-page English sequence, published at the artist’s November 16, 2026 request. Every selected source matches the current production hashes, including the latest page 24 balloon revision and page 26 ending marker. Original artwork post links remain pending. Chapter 2’s approved cover, edition 3 links and progress compatibility are preserved.

Flirt Chapter 3 includes its independent cover and complete 18-page English sequence, published at the artist’s November 16, 2026 request. All 19 selected images match the current production hashes, including the latest page 1 revision and current-number-only page footers. It appears after Chapter 2 and before Chapter 9. Original artwork post links remain pending. Existing chapter covers, edition links, and progress compatibility are preserved.
