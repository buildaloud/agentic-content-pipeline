import { describe, expect, it, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { resolveContentDir, assignSlots, apply, loadPosts } from './schedule';

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schedule-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('resolveContentDir', () => {
  it('falls back to the schema default when no config file is present', () => {
    const dir = makeTmpDir();
    expect(resolveContentDir(dir)).toBe(path.join(dir, 'src', 'content', 'blog'));
  });

  it('uses contentDir from content-pipeline.config.json when present', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'content-pipeline.config.json'), JSON.stringify({ contentDir: 'posts' }));
    expect(resolveContentDir(dir)).toBe(path.join(dir, 'posts'));
  });

  it('anchors contentDir relative to the directory the config file was found in', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'content-pipeline.config.json'), JSON.stringify({ contentDir: 'posts' }));
    const nested = path.join(dir, 'a', 'b');
    fs.mkdirSync(nested, { recursive: true });
    expect(resolveContentDir(nested)).toBe(path.join(dir, 'posts'));
  });
});

function post(file: string, filler = false, isFolder = false) {
  const date = file.slice(0, 10);
  const slugNoExt = file.replace(/\.md$/, '');
  return {
    file,
    date,
    body: slugNoExt.slice(11),
    title: file,
    filler,
    isFolder,
    raw: `---\npubDate: "${date}T15:00:00Z"\n---\nbody`,
  };
}

describe('loadPosts', () => {
  it('reads a flat post file', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(
      path.join(dir, '2026-08-01-flat-post.md'),
      '---\ntitle: "Flat Post"\npubDate: "2026-08-01T15:00:00Z"\n---\nbody\n',
    );
    const posts = loadPosts(dir);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      file: '2026-08-01-flat-post.md',
      isFolder: false,
      date: '2026-08-01',
      body: 'flat-post',
      title: 'Flat Post',
    });
  });

  it('reads a folder post from blogpost.md inside the directory, alongside sibling renditions', () => {
    const dir = makeTmpDir();
    const folder = path.join(dir, '2026-08-02-folder-post');
    fs.mkdirSync(folder);
    fs.writeFileSync(
      path.join(folder, 'blogpost.md'),
      '---\ntitle: "Folder Post"\npubDate: "2026-08-02T15:00:00Z"\n---\nbody\n',
    );
    fs.writeFileSync(path.join(folder, 'linkedin.md'), 'linkedin body');
    fs.writeFileSync(path.join(folder, 'email.md'), 'email body');
    fs.writeFileSync(path.join(folder, 'bluesky.md'), 'bluesky body');

    const posts = loadPosts(dir);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      file: '2026-08-02-folder-post',
      isFolder: true,
      date: '2026-08-02',
      body: 'folder-post',
      title: 'Folder Post',
    });
  });

  it('ignores a dated directory that has no blogpost.md', () => {
    const dir = makeTmpDir();
    fs.mkdirSync(path.join(dir, '2026-08-03-incomplete'));
    expect(loadPosts(dir)).toHaveLength(0);
  });

  it('reads mixed flat and folder posts from the same directory', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(
      path.join(dir, '2026-08-01-flat.md'),
      '---\ntitle: "Flat"\npubDate: "2026-08-01T15:00:00Z"\n---\nbody\n',
    );
    const folder = path.join(dir, '2026-08-02-folder');
    fs.mkdirSync(folder);
    fs.writeFileSync(
      path.join(folder, 'blogpost.md'),
      '---\ntitle: "Folder"\npubDate: "2026-08-02T15:00:00Z"\n---\nbody\n',
    );

    const posts = loadPosts(dir).sort((a, b) => a.date.localeCompare(b.date));
    expect(posts.map((p) => ({ file: p.file, isFolder: p.isFolder }))).toEqual([
      { file: '2026-08-01-flat.md', isFolder: false },
      { file: '2026-08-02-folder', isFolder: true },
    ]);
  });
});

describe('assignSlots', () => {
  const today = '2026-07-14';

  it('assigns consecutive daily slots in date order for non-filler posts', () => {
    const future = [post('2026-08-01-b.md'), post('2026-07-20-a.md')];
    const plan = assignSlots(future, today);
    expect(plan.get('2026-07-20-a.md')).toBe('2026-07-15');
    expect(plan.get('2026-08-01-b.md')).toBe('2026-07-16');
  });

  it('sinks filler posts to the tail regardless of their original date', () => {
    const future = [post('2026-07-16-filler.md', true), post('2026-08-01-real.md', false)];
    const plan = assignSlots(future, today);
    expect(plan.get('2026-08-01-real.md')).toBe('2026-07-15');
    expect(plan.get('2026-07-16-filler.md')).toBe('2026-07-16');
  });

  it('overflows past the 28-day daily window onto a monthly cadence', () => {
    const future = Array.from({ length: 29 }, (_, i) => post(`2026-08-${String(i + 1).padStart(2, '0')}-p${i}.md`));
    const plan = assignSlots(future, today);
    // slot 0-27 (28 posts) get daily days 1-28; slot 28 (the 29th post) overflows to the first monthly slot.
    expect(plan.get('2026-08-01-p0.md')).toBe('2026-07-15');
    expect(plan.get(future[27].file)).toBe('2026-08-11');
    expect(plan.get(future[28].file)).toBe('2026-09-10');
  });

  it('assigns a slot to a folder post alongside flat posts, keyed by folder name (no extension)', () => {
    const future = [post('2026-08-01-flat.md'), post('2026-07-20-folder', false, true)];
    const plan = assignSlots(future, today);
    expect(plan.get('2026-07-20-folder')).toBe('2026-07-15');
    expect(plan.get('2026-08-01-flat.md')).toBe('2026-07-16');
  });
});

describe('apply', () => {
  it('rewrites pubDate, renames the file, and rewrites internal links pointing at the moved post', () => {
    const dir = makeTmpDir();
    const oldSlug = '2026-08-01-old-slug';
    fs.writeFileSync(
      path.join(dir, `${oldSlug}.md`),
      '---\ntitle: "Moved Post"\npubDate: "2026-08-01T15:00:00Z"\n---\nbody text\n',
    );
    fs.writeFileSync(
      path.join(dir, '2026-06-01-other-post.md'),
      `---\ntitle: "Other"\npubDate: "2026-06-01T15:00:00Z"\n---\nSee [moved post](/blog/${oldSlug}) for more.\n`,
    );

    const future = [post(`${oldSlug}.md`)];
    const plan = new Map([[`${oldSlug}.md`, '2026-07-20']]);

    apply(future, plan, dir);

    const newSlug = '2026-07-20-old-slug';
    expect(fs.existsSync(path.join(dir, `${oldSlug}.md`))).toBe(false);
    const moved = fs.readFileSync(path.join(dir, `${newSlug}.md`), 'utf8');
    expect(moved).toContain('pubDate: "2026-07-20T15:00:00Z"');

    const other = fs.readFileSync(path.join(dir, '2026-06-01-other-post.md'), 'utf8');
    expect(other).toContain(`/blog/${newSlug}`);
    expect(other).not.toContain(`/blog/${oldSlug})`);
  });

  it('does nothing for a post whose planned slot equals its current date', () => {
    const dir = makeTmpDir();
    const slug = '2026-08-01-unchanged';
    fs.writeFileSync(path.join(dir, `${slug}.md`), '---\npubDate: "2026-08-01T15:00:00Z"\n---\nbody\n');

    const future = [post(`${slug}.md`)];
    const plan = new Map([[`${slug}.md`, '2026-08-01']]);

    apply(future, plan, dir);

    expect(fs.existsSync(path.join(dir, `${slug}.md`))).toBe(true);
  });
});

describe('apply — folder posts', () => {
  it('renames the folder (slot move), rewrites pubDate in blogpost.md, and preserves sibling renditions', () => {
    const dir = makeTmpDir();
    const oldSlug = '2026-08-01-old-folder';
    const folder = path.join(dir, oldSlug);
    fs.mkdirSync(folder);
    fs.writeFileSync(
      path.join(folder, 'blogpost.md'),
      '---\ntitle: "Old Folder"\npubDate: "2026-08-01T15:00:00Z"\n---\nbody\n',
    );
    fs.writeFileSync(path.join(folder, 'linkedin.md'), 'linkedin body');
    fs.writeFileSync(path.join(folder, 'email.md'), 'email body');
    fs.writeFileSync(path.join(folder, 'bluesky.md'), 'bluesky body');

    const future = [post(oldSlug, false, true)];
    const plan = new Map([[oldSlug, '2026-07-20']]);

    apply(future, plan, dir);

    const newSlug = '2026-07-20-old-folder';
    expect(fs.existsSync(folder)).toBe(false);
    const newFolder = path.join(dir, newSlug);
    expect(fs.existsSync(newFolder)).toBe(true);
    const blogpost = fs.readFileSync(path.join(newFolder, 'blogpost.md'), 'utf8');
    expect(blogpost).toContain('pubDate: "2026-07-20T15:00:00Z"');
    expect(fs.existsSync(path.join(newFolder, 'linkedin.md'))).toBe(true);
    expect(fs.existsSync(path.join(newFolder, 'email.md'))).toBe(true);
    expect(fs.existsSync(path.join(newFolder, 'bluesky.md'))).toBe(true);
  });

  it('rewrites cross-links (including /blog/<slug>/ trailing-slash form) pointing at a moved folder post', () => {
    const dir = makeTmpDir();
    const oldSlug = '2026-08-01-old-folder';
    const folder = path.join(dir, oldSlug);
    fs.mkdirSync(folder);
    fs.writeFileSync(
      path.join(folder, 'blogpost.md'),
      '---\ntitle: "Old Folder"\npubDate: "2026-08-01T15:00:00Z"\n---\nbody\n',
    );
    fs.writeFileSync(
      path.join(dir, '2026-06-01-other-post.md'),
      `---\ntitle: "Other"\npubDate: "2026-06-01T15:00:00Z"\n---\nSee [moved](/blog/${oldSlug}/) for more.\n`,
    );

    const future = [post(oldSlug, false, true)];
    const plan = new Map([[oldSlug, '2026-07-20']]);

    apply(future, plan, dir);

    const newSlug = '2026-07-20-old-folder';
    const other = fs.readFileSync(path.join(dir, '2026-06-01-other-post.md'), 'utf8');
    expect(other).toContain(`/blog/${newSlug}/`);
    expect(other).not.toContain(`/blog/${oldSlug}/`);
  });

  it('handles a mixed flat + folder directory: both move in the same apply call', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(
      path.join(dir, '2026-08-01-flat-move.md'),
      '---\ntitle: "Flat Move"\npubDate: "2026-08-01T15:00:00Z"\n---\nbody\n',
    );
    const folder = path.join(dir, '2026-08-02-folder-move');
    fs.mkdirSync(folder);
    fs.writeFileSync(
      path.join(folder, 'blogpost.md'),
      '---\ntitle: "Folder Move"\npubDate: "2026-08-02T15:00:00Z"\n---\nbody\n',
    );

    const future = [post('2026-08-01-flat-move.md'), post('2026-08-02-folder-move', false, true)];
    const plan = new Map([
      ['2026-08-01-flat-move.md', '2026-07-20'],
      ['2026-08-02-folder-move', '2026-07-21'],
    ]);

    apply(future, plan, dir);

    expect(fs.existsSync(path.join(dir, '2026-07-20-flat-move.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, '2026-07-21-folder-move'))).toBe(true);
    expect(fs.existsSync(path.join(dir, '2026-07-21-folder-move', 'blogpost.md'))).toBe(true);
  });
});
