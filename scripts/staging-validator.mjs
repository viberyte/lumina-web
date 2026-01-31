#!/usr/bin/env node
import sqlite3 from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = "/opt/viberyte/lumina-web/data/lumina.db";
const LOG_PATH = "/opt/viberyte/logs/staging-validator.log";
const db = sqlite3(DB_PATH);

// helper logger
function log(line) {
  const time = new Date().toISOString();
  fs.appendFileSync(LOG_PATH, `[${time}] ${line}\n`);
}

// move clean rows to venues
try {
  const total = db.prepare("SELECT COUNT(*) AS n FROM venues_staging").get().n;
  const ready = db.prepare("SELECT COUNT(*) AS n FROM staging_ready").get().n;
  const bad = db.prepare("SELECT COUNT(*) AS n FROM staging_violations").get().n;

  if (ready > 0) {
    const rows = db.prepare("SELECT * FROM staging_ready").all();
    const insert = db.prepare(`
      INSERT INTO venues (
        name, city, state, address_line, postal_code, category,
        cuisine_types, music_genres, vibe_tags,
        rating, user_ratings_total, price_level, price_text,
        website, phone, photo_url, photo_urls_json, has_photo,
        why_recommended, exclusion_reason
      ) VALUES (
        @name, @city, @state, @address_line, @postal_code, @category,
        @cuisine_types, @music_genres, @vibe_tags,
        @rating, @user_ratings_total, @price_level, @price_text,
        @website, @phone, @photo_url, @photo_urls_json, 1,
        @why_recommended, NULL
      )
    `);

    const txn = db.transaction((batch) => {
      for (const row of batch) insert.run(row);
      db.prepare("DELETE FROM venues_staging WHERE id IN (SELECT id FROM staging_ready)").run();
    });

    txn(rows);
    log(`Moved ${rows.length} new venues → main table`);
  }

  if (bad > 0) {
    log(`Skipped ${bad} invalid rows (see staging_violations view)`);
  }

  if (total === 0) {
    log(`No new staging rows`);
  }
} catch (err) {
  log(`ERROR: ${err.message}`);
  process.exit(1);
}

db.close();
