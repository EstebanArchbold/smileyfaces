import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { initDatabase, getDatabase } from '../config/database';
import { compressToWebp, MAX_WIDTH, WEBP_QUALITY } from '../config/images';

/**
 * One-off backfill for images uploaded before the upload pipeline compressed
 * anything. Re-encodes each referenced file to WebP and repoints the database
 * row at the new filename.
 *
 * Runs as a dry run unless --apply is passed. Originals are moved into
 * uploads/originals/ rather than deleted, so a bad run can be undone by moving
 * them back and reverting the paths.
 *
 *   docker exec smileyfaces-api node dist/scripts/compress-uploads.js
 *   docker exec smileyfaces-api node dist/scripts/compress-uploads.js --apply
 */

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const ORIGINALS_DIR = path.join(UPLOADS_DIR, 'originals');

/** Below this the re-encode is not worth the churn of rewriting the row. */
const MIN_SAVING_RATIO = 0.9;

interface Reference {
  /** Stored value, e.g. /uploads/abc.JPG */
  storedPath: string;
  describe: string;
  repoint: (newStoredPath: string) => Promise<void>;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function collectReferences(): Promise<Reference[]> {
  const db = getDatabase();
  const references: Reference[] = [];

  const gallery = await db.query('SELECT id, title, image_path FROM gallery');
  for (const row of gallery.rows) {
    references.push({
      storedPath: row.image_path,
      describe: `gallery "${row.title || row.id}"`,
      repoint: async (newStoredPath) => {
        await db.query('UPDATE gallery SET image_path = $1 WHERE id = $2', [newStoredPath, row.id]);
      },
    });
  }

  const settings = await db.query(
    "SELECT key, value FROM settings WHERE key IN ('hero_image', 'about_image')",
  );
  for (const row of settings.rows) {
    references.push({
      storedPath: row.value,
      describe: `setting ${row.key}`,
      repoint: async (newStoredPath) => {
        await db.query('UPDATE settings SET value = $1 WHERE key = $2', [newStoredPath, row.key]);
      },
    });
  }

  return references;
}

async function processReference(reference: Reference, apply: boolean) {
  const sourcePath = path.join(__dirname, '../../', reference.storedPath);

  if (!fs.existsSync(sourcePath)) {
    console.log(`  MISSING  ${reference.describe} → ${reference.storedPath}`);
    return { before: 0, after: 0, changed: false };
  }

  const before = fs.statSync(sourcePath).size;
  const basename = path.basename(sourcePath);
  // Always encode to a temp name first: when the source is already .webp the
  // destination would otherwise be the file sharp is reading from.
  const tempPath = path.join(UPLOADS_DIR, `.compress-tmp-${basename}.webp`);

  try {
    await compressToWebp(sourcePath, tempPath);
  } catch (err) {
    console.log(`  FAILED   ${reference.describe} → ${(err as Error).message}`);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    return { before, after: before, changed: false };
  }

  const after = fs.statSync(tempPath).size;

  if (after >= before * MIN_SAVING_RATIO) {
    console.log(`  SKIP     ${reference.describe} — ${formatBytes(before)}, sin ganancia`);
    fs.unlinkSync(tempPath);
    return { before, after: before, changed: false };
  }

  const percent = (100 - (after / before) * 100).toFixed(0);
  console.log(
    `  ${apply ? 'OK      ' : 'DRY-RUN '} ${reference.describe} — ${formatBytes(before)} → ${formatBytes(after)} (-${percent}%)`,
  );

  if (!apply) {
    fs.unlinkSync(tempPath);
    return { before, after, changed: true };
  }

  const finalName = `${path.parse(basename).name}.webp`;
  const finalPath = path.join(UPLOADS_DIR, finalName);
  const backupPath = path.join(ORIGINALS_DIR, basename);

  // Order matters: stash the original, put the new file in place, then update
  // the row. If the update throws we can still walk all of it back.
  fs.renameSync(sourcePath, backupPath);
  fs.renameSync(tempPath, finalPath);

  try {
    await reference.repoint(`/uploads/${finalName}`);
  } catch (err) {
    fs.unlinkSync(finalPath);
    fs.renameSync(backupPath, sourcePath);
    console.log(`  REVERTED ${reference.describe} → ${(err as Error).message}`);
    return { before, after: before, changed: false };
  }

  return { before, after, changed: true };
}

function reportOrphans(references: Reference[]) {
  const referenced = new Set(references.map((r) => path.basename(r.storedPath)));
  const orphans = fs
    .readdirSync(UPLOADS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .filter((entry) => !referenced.has(entry.name));

  if (orphans.length === 0) return;

  const total = orphans.reduce((sum, e) => sum + fs.statSync(path.join(UPLOADS_DIR, e.name)).size, 0);
  console.log(
    `\n${orphans.length} archivo(s) en uploads/ que ninguna fila referencia, ${formatBytes(total)}.`,
  );
  console.log('No se tocaron. Revisalos antes de borrar:');
  for (const orphan of orphans) console.log(`  ${orphan.name}`);
}

async function main() {
  const apply = process.argv.includes('--apply');

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error(`No existe ${UPLOADS_DIR}`);
    process.exit(1);
  }
  if (apply && !fs.existsSync(ORIGINALS_DIR)) {
    fs.mkdirSync(ORIGINALS_DIR);
  }

  await initDatabase();
  const references = await collectReferences();

  console.log(
    `${apply ? 'APLICANDO' : 'SIMULACRO (agregá --apply para escribir)'} — ${references.length} imagen(es) referenciadas, max ${MAX_WIDTH}px, WebP q${WEBP_QUALITY}\n`,
  );

  let totalBefore = 0;
  let totalAfter = 0;
  let changed = 0;

  for (const reference of references) {
    const result = await processReference(reference, apply);
    totalBefore += result.before;
    totalAfter += result.after;
    if (result.changed) changed += 1;
  }

  console.log(
    `\n${changed} imagen(es) ${apply ? 'convertidas' : 'a convertir'}: ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)}`,
  );
  if (apply) console.log(`Originales guardados en ${ORIGINALS_DIR}`);

  reportOrphans(references);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
