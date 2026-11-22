# Chapter likes

An anonymous, shared like count for each comic chapter. The reader stays on GitHub Pages; a Cloudflare Worker and D1 database store votes. GitHub comments remain separate.

The browser creates a random UUID on the first like and keeps it in localStorage. The server stores only its SHA-256 hash, the chapter key, and the creation time. No email, GitHub login, IP address, or browser fingerprint is stored by this application. Each browser can like/unlike each chapter once; retries are idempotent. Clearing browser storage or using another browser creates a different voter. This is a lightweight reaction counter, not proof of unique people or a fraud-resistant poll. Cloudflare's ordinary platform processing still applies.

## Deployment

Use the owner's existing Cloudflare account and free Workers/D1 plan. Do not upgrade billing or create credentials in public files. The owner deployed this backend at `https://malfoid-reader-likes.yuji-4ef.workers.dev`. The `/v1/likes` read endpoint was verified on November 11, 2026. Worker changes must preserve the existing D1 database and its vote data.

1. Create a D1 database named `malfoid-reader-likes`. Run `schema.sql` once in its SQL console (or through an already authenticated Wrangler CLI). The schema is safe to run again and never resets existing counts.
2. Create a Worker named `malfoid-reader-likes`, upload `worker.mjs`, and bind that D1 database as `DB`. `wrangler.example.jsonc` records the equivalent configuration. Disable Worker invocation logs; no logging is required for the feature. Use the existing free plan.
3. Check that `GET https://<worker-host>/v1/likes?target=draconia:chapter-1` returns `{"target":"draconia:chapter-1","count":0,"liked":false}`. Verify CORS from `https://narusaku.github.io`, then test like/retry/unlike with a temporary browser identifier and leave no test votes behind.
4. Set the full `/v1/likes` URL in `site/likes.config.js`. The setting is public and contains no secret. The widget stays hidden when this URL is empty. Do not deploy a placeholder URL.
5. Publish the likes frontend files, the changes to `site/reader.html` and `site/assets/reader.js`, and the documentation. Backend source and tests live in `services/likes/` outside the public `site/` directory. Preserve catalog changes from subsequent chapter releases and unrelated local work. Run the existing manual `Publish reader` workflow after the GitHub commit, then verify real counts across separate browsers.

The Worker allows requests from the website origin, validates chapter keys and JSON, and keeps CORS responses uncached. Writes require the website Origin and JSON Content-Type. CORS is a browser restriction, not protection against determined scripted voters. Votes have a composite primary key; SQLite triggers update totals only for actual insertions/deletions, and D1 batches write/read operations in one transaction. No credentials are shipped to readers. An unavailable service shows an error, never a fabricated zero or a browser-only count.

The six published Short Comics entries also use this service, under `short-comics:<lowercase-bvid>`. The Worker explicitly accepts those six IDs. Each story has its own shared total in the collection listing and reader. When adding another short comic, extend the Worker target validation before enabling its controls. No separate database or schema change is required.

## Checks

Run `node --test services/likes/worker.test.mjs services/likes/frontend.test.mjs` with Node 24. The Worker tests execute the actual schema in in-memory SQLite and check duplicate requests, independent voters and chapters, unlikes, CORS/input errors, and backend outages. Frontend tests cover stale chapter responses, mode/page changes, failed writes and reload-before-retry, and unavailable browser storage. Local tests do not change production votes.

Deployment reference: [D1 batches](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).
