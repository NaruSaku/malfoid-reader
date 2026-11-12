CREATE TABLE IF NOT EXISTS chapter_likes (
  chapter TEXT NOT NULL,
  visitor TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (chapter, visitor)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS chapter_like_totals (
  chapter TEXT PRIMARY KEY,
  total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0)
) WITHOUT ROWID;

CREATE TRIGGER IF NOT EXISTS chapter_like_added AFTER INSERT ON chapter_likes
BEGIN
  INSERT INTO chapter_like_totals (chapter, total) VALUES (NEW.chapter, 1)
  ON CONFLICT(chapter) DO UPDATE SET total = total + 1;
END;

CREATE TRIGGER IF NOT EXISTS chapter_like_removed AFTER DELETE ON chapter_likes
BEGIN
  UPDATE chapter_like_totals SET total = total - 1 WHERE chapter = OLD.chapter;
END;
