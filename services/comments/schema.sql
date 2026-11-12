CREATE TABLE IF NOT EXISTS page_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  chapter TEXT NOT NULL,
  page INTEGER NOT NULL CHECK(page >= 0 AND page <= 1000),
  name TEXT NOT NULL,
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
  visitor_hash TEXT NOT NULL,
  network_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  status TEXT NOT NULL DEFAULT 'visible' CHECK(status IN ('visible', 'hidden'))
);
CREATE INDEX IF NOT EXISTS page_comments_public ON page_comments(chapter, page, status, id DESC);
CREATE INDEX IF NOT EXISTS page_comments_network ON page_comments(network_hash, created_at);
CREATE INDEX IF NOT EXISTS page_comments_visitor ON page_comments(visitor_hash, created_at);
