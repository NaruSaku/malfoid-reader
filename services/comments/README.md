# Anonymous comments for individual comic images

The existing `malfoid-reader-likes` Worker also serves `/v1/comments` using its existing D1 binding, `DB`. The additive `schema.sql` creates `page_comments` and its indexes. It does not alter likes, totals, or their triggers. The original GitHub/giscus discussions remain separate chapter/comic conversations.

The reader attaches a collapsible comment panel to every image, including covers, in both page and scroll modes. A conversation uses the stable comic ID, chapter ID, and `page.number` (cover 0, body pages 1 onward). Opening a panel loads only that image's comments, in batches of 20. Drafts and in-flight submissions stay with their image while the reader changes page or reading mode. Nicknames are optional and unverified; an empty name displays as Anonymous. Comments are plain text and appear immediately. Names allow 40 characters and bodies 2,000 characters. No email address or account is required.

Short Comics uses the same panels and database with independent `short-comics:<lowercase-bvid>` story keys. Comments retain each source's printed page number: the last story has pages 1–9 and 11–13, so its final image uses page 13 even though its reader URL has zero-based index 11.

## Owner moderation

Sign in to Cloudflare, open **Storage & databases → D1 → malfoid-reader-likes → Explore Data**, then select **page_comments**. Each row includes its `id`, `chapter`, `page`, `name`, `body`, and `status`.

To remove a comment from public view while retaining a reversible record, change its `status` from `visible` to `hidden` and save. Set it back to `visible` to restore it. The database owner can also delete a row through the database interface. There is no public moderation API and no administrator credential in the website.

For example, to inspect recent comments in the Console:

```sql
SELECT id, chapter, page, name, body, datetime(created_at, 'unixepoch') AS posted_utc, status
FROM page_comments ORDER BY id DESC LIMIT 100;
```

To hide a specific comment after checking its ID, run a targeted update such as `UPDATE page_comments SET status = 'hidden' WHERE id = 123;`, replacing 123 with that comment's ID. Never run a broad update or reset the database for moderation.

## Request handling and data

The API accepts writes only with the website Origin and JSON content type. It validates the chapter/page, lengths, UUIDs, and honeypot field. CORS is a browser boundary, not authentication. Indexed SQL limits each network to five comments per minute and thirty per hour, and each browser identifier to five per minute. The insert and its result are processed atomically; replaying a lost-response request ID does not create another comment. Moderated comments still count toward rate limits. This baseline throttling does not promise to prevent every form of spam.

The application stores the public nickname/text/time, page key, request UUID, SHA-256 hash of a random browser identifier, and a daily changing hash derived from the Cloudflare-provided connecting IP for rate limiting. Raw IPs, email addresses, and fingerprints are not stored by application code. The hashes are retained with the comment records and are never returned by the public API. Cloudflare's ordinary platform processing and the account's logging configuration still apply. This feature is login-free; it does not promise untraceable communications.

`site/page-comments.config.js` contains only the public endpoint URL. No secrets or account credentials are shipped to readers. Tests use in-memory SQLite and never post fixture messages to production.

## Deployment and checks

1. Apply `services/comments/schema.sql` to the existing D1 database.
2. Deploy the combined `services/likes/worker.mjs` while preserving the `DB` binding.
3. Verify `/v1/comments?target=draconia:chapter-1&page=1` and the existing `/v1/likes?target=draconia:chapter-1` remain available.
4. Publish the new page-comments assets and reader integration through the existing manual GitHub Pages workflow. Preserve unrelated local changes and all catalog/like/comment metadata.

Run `node --test services/likes/worker.test.mjs services/likes/frontend.test.mjs services/comments/worker.test.mjs`. These checks cover immediate publication, page isolation, literal HTML-looking text, privacy boundaries, duplicate requests, moderation visibility, rate limits, pagination, and existing likes. Validate browser inputs and reading-mode/page changes separately with a local-only database.

References: [D1 batches](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch), [Cloudflare request headers](https://developers.cloudflare.com/fundamentals/reference/http-request-headers/).
