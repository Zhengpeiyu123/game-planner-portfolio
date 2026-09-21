import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARCHIVE, CHUNK_BYTES, TARGET, pack, restore, validateManifest, verify } from './large-downloads.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const manifestPath = (root) => join(root, ARCHIVE, 'manifest.json');
const readManifest = async (root) => JSON.parse(await readFile(manifestPath(root), 'utf8'));

async function fixture(t, bytes = Buffer.from('An opaque binary download\x00\xff')) {
  const root = await mkdtemp(join(tmpdir(), 'portfolio-large-downloads-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(dirname(join(root, TARGET)), { recursive: true });
  await writeFile(join(root, TARGET), bytes);
  return root;
}

test('binary round-trip crosses the 40 MiB boundary; correct outputs are not rewritten', async (t) => {
  const bytes = Buffer.alloc(CHUNK_BYTES + 31, 0x97);
  bytes.write('binary fixture, not a parsed presentation');
  const root = await fixture(t, bytes);
  const before = await lstat(join(root, TARGET));
  assert.equal((await pack(root)).status, 'packed');
  assert.equal((await lstat(join(root, TARGET))).mtimeMs, before.mtimeMs);
  const manifest = await readManifest(root);
  assert.deepEqual(manifest.parts.map((part) => part.bytes), [CHUNK_BYTES, 31]);
  assert.equal(manifest.sha256, sha256(bytes));
  assert.equal((await pack(root)).status, 'already-packed');
  assert.equal((await restore(root)).status, 'already-restored');
  assert.equal((await lstat(join(root, TARGET))).mtimeMs, before.mtimeMs);
  await unlink(join(root, TARGET));
  assert.equal((await verify(root)).targetExists, false);
  assert.equal((await restore(root)).status, 'restored');
  assert.deepEqual(await readFile(join(root, TARGET)), bytes);
  assert.equal((await verify(root)).targetExists, true);
  assert.deepEqual((await readdir(join(root, ARCHIVE))).sort(), ['manifest.json', ...manifest.parts.map((part) => part.file)].sort());
});

test('exactly 40 MiB produces one full-size part', async (t) => {
  const root = await fixture(t, Buffer.alloc(CHUNK_BYTES, 0x3a));
  await pack(root);
  assert.deepEqual((await readManifest(root)).parts.map((part) => part.bytes), [CHUNK_BYTES]);
});

test('empty input is rejected without writing an archive', async (t) => {
  const root = await fixture(t, Buffer.alloc(0));
  await assert.rejects(pack(root), /empty/);
  await assert.rejects(lstat(join(root, ARCHIVE)), { code: 'ENOENT' });
});

test('damaged or missing chunks are rejected, with no partial restore left behind', async (t) => {
  for (const damage of ['same-size', 'short', 'missing']) {
    await t.test(damage, async (t) => {
      const root = await fixture(t);
      await pack(root);
      const manifest = await readManifest(root);
      const part = join(root, ARCHIVE, manifest.parts[0].file);
      if (damage === 'missing') await unlink(part);
      else await writeFile(part, Buffer.alloc(damage === 'same-size' ? manifest.parts[0].bytes : 1, 0));
      await unlink(join(root, TARGET));
      await assert.rejects(restore(root), /mismatch|regular/);
      assert.deepEqual(await readdir(dirname(join(root, TARGET))), []);
    });
  }
});

test('valid chunk hashes cannot bypass the combined SHA256 check', async (t) => {
  const root = await fixture(t);
  await pack(root);
  const manifest = await readManifest(root);
  manifest.sha256 = '0'.repeat(64);
  await writeFile(manifestPath(root), JSON.stringify(manifest));
  await unlink(join(root, TARGET));
  await assert.rejects(restore(root), /Combined/);
  assert.deepEqual(await readdir(dirname(join(root, TARGET))), []);
});

test('manifest validation rejects traversal, arbitrary targets, changed sizes, and malformed hashes', async (t) => {
  const root = await fixture(t);
  await pack(root);
  const original = await readManifest(root);
  const mutations = [
    (m) => { m.target = '../outside.pptx'; },
    (m) => { m.target = '/tmp/outside.pptx'; },
    (m) => { m.parts[0].file = '../../outside'; },
    (m) => { m.parts[0].file = '/tmp/outside'; },
    (m) => { m.parts.push(m.parts[0]); },
    (m) => { m.parts[0].bytes += 1; },
    (m) => { m.parts[0].sha256 = 'invalid'; },
    (m) => { m.sha256 = null; },
    (m) => { m.sha256 = [m.sha256]; },
    (m) => { m.parts[0].sha256 = [m.parts[0].sha256]; },
    (m) => { m.chunkBytes += 1; },
    (m) => { m.bytes = 0; },
    (m) => { m.version = 2; },
  ];
  for (const mutate of mutations) {
    const manifest = structuredClone(original);
    mutate(manifest);
    assert.throws(() => validateManifest(manifest), /Invalid/);
    await writeFile(manifestPath(root), JSON.stringify(manifest));
    await assert.rejects(restore(root), /Invalid/);
  }
  assert.deepEqual(await readFile(join(root, TARGET)), Buffer.from('An opaque binary download\x00\xff'));
});

test('mismatching existing downloads are preserved, never overwritten', async (t) => {
  const root = await fixture(t);
  await pack(root);
  const replacement = Buffer.from('Existing work must stay intact');
  await writeFile(join(root, TARGET), replacement);
  await assert.rejects(restore(root), /refusing to overwrite/);
  await assert.rejects(verify(root), /mismatch/);
  await assert.rejects(pack(root), /refusing to replace/);
  assert.deepEqual(await readFile(join(root, TARGET)), replacement);
});

test('correct existing output does not bypass damaged archive verification', async (t) => {
  const root = await fixture(t);
  await pack(root);
  const manifest = await readManifest(root);
  await writeFile(join(root, ARCHIVE, manifest.parts[0].file), Buffer.alloc(manifest.parts[0].bytes));
  await assert.rejects(restore(root), /SHA256 mismatch/);
});

test('symlink targets, chunks, and directories cannot redirect operations', async (t) => {
  await t.test('target file', async (t) => {
    const root = await fixture(t);
    await pack(root);
    const saved = join(root, 'saved-original');
    await copyFile(join(root, TARGET), saved);
    await unlink(join(root, TARGET));
    await symlink(saved, join(root, TARGET));
    await assert.rejects(restore(root), /non-symlink/);
  });
  await t.test('part file', async (t) => {
    const root = await fixture(t);
    await pack(root);
    const manifest = await readManifest(root);
    const part = join(root, ARCHIVE, manifest.parts[0].file);
    await unlink(part);
    await symlink(join(root, TARGET), part);
    await assert.rejects(verify(root), /non-symlink/);
  });
  await t.test('archive directory', async (t) => {
    const root = await fixture(t);
    const elsewhere = join(root, 'unrelated');
    await mkdir(elsewhere);
    await symlink(elsewhere, join(root, 'release-assets'));
    await assert.rejects(pack(root), /real directory/);
    assert.deepEqual(await readdir(elsewhere), []);
  });
});

test('an orphan pre-existing chunk is not overwritten by pack', async (t) => {
  const root = await fixture(t);
  const directory = join(root, ARCHIVE);
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${TARGET.split('/').at(-1)}.part-001`);
  await writeFile(path, 'preserve me');
  await assert.rejects(pack(root), { code: 'EEXIST' });
  assert.equal(await readFile(path, 'utf8'), 'preserve me');
  assert.deepEqual(await readdir(directory), [path.split('/').at(-1)]);
});

test('pack rolls back only its own installed chunks after a later collision', async (t) => {
  const root = await fixture(t, Buffer.alloc(CHUNK_BYTES + 1, 0x35));
  const directory = join(root, ARCHIVE);
  await mkdir(directory, { recursive: true });
  const name = `${TARGET.split('/').at(-1)}.part-002`;
  await writeFile(join(directory, name), 'preserve the pre-existing second part');
  await assert.rejects(pack(root), { code: 'EEXIST' });
  assert.equal(await readFile(join(directory, name), 'utf8'), 'preserve the pre-existing second part');
  assert.deepEqual(await readdir(directory), [name]);
});

test('verify works before the public output directory has been created', async (t) => {
  const root = await fixture(t);
  await pack(root);
  await rm(join(root, 'public'), { recursive: true });
  assert.equal((await verify(root)).targetExists, false);
  assert.equal((await restore(root)).status, 'restored');
});

test('checked-in production fragments restore the original binary in isolation', async (t) => {
  const productionRoot = fileURLToPath(new URL('../', import.meta.url));
  const manifest = validateManifest(await readManifest(productionRoot));
  const root = await fixture(t);
  await unlink(join(root, TARGET));
  await mkdir(join(root, ARCHIVE), { recursive: true });
  for (const name of ['manifest.json', ...manifest.parts.map((part) => part.file)]) {
    await copyFile(join(productionRoot, ARCHIVE, name), join(root, ARCHIVE, name));
  }
  const result = await restore(root);
  const recovered = await readFile(join(root, TARGET));
  assert.equal(result.status, 'restored');
  assert.equal(recovered.length, manifest.bytes);
  assert.equal(sha256(recovered), manifest.sha256);
  assert.equal((await verify(root)).targetExists, true);
  assert.equal((await restore(root)).status, 'already-restored');
});

test('CLI rejects missing or extra arguments without accepting arbitrary paths', () => {
  const script = fileURLToPath(new URL('./large-downloads.mjs', import.meta.url));
  for (const args of [[], ['unknown'], ['restore', '../other']]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage:/);
  }
});
