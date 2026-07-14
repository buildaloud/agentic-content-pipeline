/**
 * Drip scheduler — keeps the blog's future queue on a steady cadence.
 *
 * Cadence: daily for the next DAILY_DAYS (4 weeks), then monthly for MONTHLY_SLOTS.
 * Timely posts take the earliest slots; posts marked `filler: true` sink to the tail.
 * Posts dated today-or-earlier are frozen (already published/publishing); only future
 * posts are re-slotted. Renames rewrite the pubDate, the file, and every internal
 * /blog/<slug> link that points at a moved post.
 *
 * Reads `contentDir` from content-pipeline.config.json (walking up from the
 * repo root; falls back to the schema default "src/content/blog" if no
 * config is present). Run from the consumer repo root:
 *
 *   npx tsx <skill-dir>/scripts/schedule.ts            # dry-run plan + coverage
 *   npx tsx <skill-dir>/scripts/schedule.ts --apply    # write the changes
 *   npx tsx <skill-dir>/scripts/schedule.ts --status   # coverage only, no plan
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from './lib/config-schema';

const DAILY_DAYS = 28;
const MONTHLY_SLOTS = 2;
const MONTHLY_GAP = 30;
const PUBLISH_TIME = 'T15:00:00Z';

export function resolveContentDir(repoRoot: string = process.cwd()): string {
  const { config, path: configPath } = loadConfig(repoRoot);
  const base = configPath ? path.dirname(configPath) : repoRoot;
  return path.join(base, config.contentDir);
}

type Post = {
  file: string; // on-disk identifier: 'YYYY-MM-DD-slug.md' for a flat post, or the bare 'YYYY-MM-DD-slug' folder name for a folder post
  isFolder: boolean;
  date: string; // YYYY-MM-DD from the filename/folder name
  body: string; // slug minus the date prefix (and, for flat posts, minus .md)
  title: string;
  filler: boolean;
  raw: string; // contents of the file carrying pubDate: the file itself (flat) or <folder>/blogpost.md (folder)
};

// Folder posts hold blogpost.md, linkedin.md, email.md, bluesky.md renditions;
// only blogpost.md carries the pubDate that drives scheduling and cross-linking.
const BLOGPOST_FILE = 'blogpost.md';
const DATE_RE = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/;
const DIR_DATE_RE = /^(\d{4}-\d{2}-\d{2})-(.+)$/;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildPost(file: string, isFolder: boolean, date: string, body: string, raw: string): Post {
  const title = raw.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] ?? body;
  const filler = /^filler:\s*true\s*$/m.test(raw);
  return { file, isFolder, date, body, title, filler, raw };
}

// A post is EITHER a flat yyyy-mm-dd-slug.md file OR a yyyy-mm-dd-slug/
// directory containing blogpost.md (plus optional linkedin.md/email.md/
// bluesky.md siblings). A dated directory missing blogpost.md is skipped —
// it's incomplete, not a post yet.
export function loadPosts(blogDir: string): Post[] {
  const posts: Post[] = [];
  for (const entry of fs.readdirSync(blogDir, { withFileTypes: true })) {
    if (entry.isFile()) {
      const m = entry.name.match(DATE_RE);
      if (!m) continue;
      const [, date, body] = m;
      const raw = fs.readFileSync(path.join(blogDir, entry.name), 'utf8');
      posts.push(buildPost(entry.name, false, date, body, raw));
    } else if (entry.isDirectory()) {
      const m = entry.name.match(DIR_DATE_RE);
      if (!m) continue;
      const blogpostPath = path.join(blogDir, entry.name, BLOGPOST_FILE);
      if (!fs.existsSync(blogpostPath)) continue;
      const [, date, body] = m;
      const raw = fs.readFileSync(blogpostPath, 'utf8');
      posts.push(buildPost(entry.name, true, date, body, raw));
    }
  }
  return posts;
}

export function assignSlots(future: Post[], today: string): Map<string, string> {
  // filler sinks to the tail; timely posts keep their relative order otherwise.
  const ordered = [...future].sort(
    (a, b) => Number(a.filler) - Number(b.filler) || a.date.localeCompare(b.date),
  );
  const plan = new Map<string, string>();
  ordered.forEach((post, i) => {
    let slot: string;
    if (i < DAILY_DAYS) {
      slot = addDays(today, i + 1);
    } else {
      const m = i - DAILY_DAYS; // 0-based overflow index
      slot = addDays(today, DAILY_DAYS + (m + 1) * MONTHLY_GAP);
    }
    plan.set(post.file, slot);
  });
  return plan;
}

function coverage(scheduled: string[], today: string): { dailyOut: number; last: string } {
  const set = new Set(scheduled);
  let dailyOut = 0;
  for (let d = 1; d <= 400; d++) {
    if (set.has(addDays(today, d))) dailyOut = d;
    else break;
  }
  const last = scheduled.length ? scheduled.slice().sort().at(-1)! : today;
  return { dailyOut, last };
}

export function apply(future: Post[], plan: Map<string, string>, blogDir: string): void {
  const renames = new Map<string, string>(); // old slug -> new slug (no .md, no trailing slash)
  for (const post of future) {
    const newDate = plan.get(post.file)!;
    if (newDate === post.date) continue;
    const oldSlug = post.isFolder ? post.file : post.file.replace(/\.md$/, '');
    const newSlug = `${newDate}-${post.body}`;
    renames.set(oldSlug, newSlug);

    const raw = post.raw.replace(
      /^pubDate:\s*.*$/m,
      `pubDate: "${newDate}${PUBLISH_TIME}"`,
    );

    if (post.isFolder) {
      // The folder rename IS the slot move; blogpost.md's pubDate is rewritten
      // in place first, sibling renditions (linkedin.md/email.md/bluesky.md)
      // travel with the folder untouched.
      fs.writeFileSync(path.join(blogDir, oldSlug, BLOGPOST_FILE), raw);
      fs.renameSync(path.join(blogDir, oldSlug), path.join(blogDir, newSlug));
    } else {
      fs.writeFileSync(path.join(blogDir, post.file), raw);
      fs.renameSync(path.join(blogDir, post.file), path.join(blogDir, `${newSlug}.md`));
    }
  }

  if (renames.size === 0) return;

  // Rewrite every internal link that points at a moved post — flat .md files
  // and each folder post's blogpost.md (the only rendition that carries
  // cross-post links).
  for (const target of linkBearingFiles(blogDir)) {
    let raw = fs.readFileSync(target, 'utf8');
    let changed = false;
    for (const [oldSlug, newSlug] of renames) {
      if (raw.includes(`/blog/${oldSlug}`)) {
        raw = raw.split(`/blog/${oldSlug}`).join(`/blog/${newSlug}`);
        changed = true;
      }
    }
    if (changed) fs.writeFileSync(target, raw);
  }
}

function linkBearingFiles(blogDir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(blogDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path.join(blogDir, entry.name));
    } else if (entry.isDirectory()) {
      const blogpostPath = path.join(blogDir, entry.name, BLOGPOST_FILE);
      if (fs.existsSync(blogpostPath)) files.push(blogpostPath);
    }
  }
  return files;
}

function main() {
  const blogDir = resolveContentDir();
  const APPLY = process.argv.includes('--apply');
  const STATUS_ONLY = process.argv.includes('--status');

  const today = todayUTC();
  const posts = loadPosts(blogDir);
  const future = posts.filter((p) => p.date > today);
  const plan = assignSlots(future, today);
  const scheduled = [...plan.values()];
  const { dailyOut, last } = coverage(scheduled, today);

  console.log(`today            ${today}`);
  console.log(`published        ${posts.length - future.length}`);
  console.log(`future (queued)  ${future.length}  (${future.filter((p) => p.filler).length} filler)`);
  console.log(`daily coverage   ${dailyOut} day(s) out${dailyOut >= DAILY_DAYS ? '  ✓ 4 weeks' : `  ⚠ under ${DAILY_DAYS}`}`);
  console.log(`last scheduled   ${last}`);
  if (dailyOut < DAILY_DAYS) {
    console.log(`\n⚠ queue runs dry before 4 weeks — write more posts or add filler (filler: true), then re-run.`);
  }
  if (STATUS_ONLY) return;

  const moves = future
    .filter((p) => plan.get(p.file) !== p.date)
    .sort((a, b) => plan.get(a.file)!.localeCompare(plan.get(b.file)!));
  console.log(`\n${moves.length} post(s) move:`);
  for (const p of moves) {
    console.log(`  ${p.date} → ${plan.get(p.file)}  ${p.filler ? '[filler] ' : ''}${p.title}`);
  }

  if (!APPLY) {
    console.log(`\n(dry-run — re-run with --apply to write)`);
    return;
  }
  apply(future, plan, blogDir);
  console.log(`\n✓ applied. Rebuild + verify links before committing.`);
}

if (process.argv[1]?.endsWith('schedule.ts')) {
  main();
}
