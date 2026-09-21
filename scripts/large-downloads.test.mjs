import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARCHIVE, CHUNK_BYTES, TARGETS, pack, restore, validateManifest, verify } from './large-downloads.mjs';

const [TARGET, SECOND_TARGET] = TARGETS;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const manifestPath = (root) => join(root, ARCHIVE, 'manifest.json');
const readManifest = async (root) => JSON.parse(await readFile(manifestPath(root), 'utf8'));
const partNames = (manifest) => manifest.files.flatMap((file) => file.parts.map((part) => part.file));
const removeTargets = (root) => Promise.all(TARGETS.map((target) => unlink(join(root, target))));

async function fixture(t, bytes = Buffer.from('An opaque binary download\x00\xff')) {
  const root = await mkdtemp(join(tmpdir(), 'portfolio-large-downloads-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(dirname(join(root, TARGET)), { recursive: true });
  await writeFile(join(root, TARGET), bytes);
  await writeFile(join(root, SECOND_TARGET), Buffer.from('A second opaque binary download\x00\xff'));
  return root;
}

test('binary round-trip crosses the 16 MiB boundary; correct outputs are not rewritten', async (t) => {
  const bytes = Buffer.alloc(CHUNK_BYTES + 31, 0x97);
  bytes.write('binary fixture, not a parsed presentation');
  const root = await fixture(t, bytes);
  const before = await lstat(join(root, TARGET));
  assert.equal((await pack(root)).status, 'packed');
  assert.equal((await lstat(join(root, TARGET))).mtimeMs, before.mtimeMs);
  const manifest = await readManifest(root);
  assert.deepEqual(manifest.files.map((file) => file.target), TARGETS);
  assert.deepEqual(manifest.files[0].parts.map((part) => part.bytes), [CHUNK_BYTES, 31]);
  assert.equal(manifest.files[0].sha256, sha256(bytes));
  assert.equal((await pack(root)).status, 'already-packed');
  assert.equal((await restore(root)).status, 'already-restored');
  assert.equal((await lstat(join(root, TARGET))).mtimeMs, before.mtimeMs);
  await unlink(join(root, TARGET));
  assert.deepEqual((await verify(root)).files.map((file) => file.targetExists), [false, true]);
  const restored = await restore(root);
  assert.equal(restored.status, 'restored');
  assert.deepEqual(restored.files.map((file) => file.status), ['restored', 'already-restored']);
  assert.deepEqual(await readFile(join(root, TARGET)), bytes);
  assert.deepEqual((await verify(root)).files.map((file) => file.targetExists), [true, true]);
  assert.deepEqual((await readdir(join(root, ARCHIVE))).sort(), ['manifest.json', ...partNames(manifest)].sort());
});

test('exactly 16 MiB produces one full-size part', async (t) => {
  const root = await fixture(t, Buffer.alloc(CHUNK_BYTES, 0x3a));
  await pack(root);
  assert.deepEqual((await readManifest(root)).files[0].parts.map((part) => part.bytes), [CHUNK_BYTES]);
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
      const firstPart = manifest.files[0].parts[0];
      const part = join(root, ARCHIVE, firstPart.file);
      if (damage === 'missing') await unlink(part);
      else await writeFile(part, Buffer.alloc(damage === 'same-size' ? firstPart.bytes : 1, 0));
      await removeTargets(root);
      await assert.rejects(restore(root), /mismatch|regular/);
      assert.deepEqual(await readdir(dirname(join(root, TARGET))), []);
    });
  }
});

test('valid chunk hashes cannot bypass the combined SHA256 check', async (t) => {
  const root = await fixture(t);
  await pack(root);
  const manifest = await readManifest(root);
  manifest.files[0].sha256 = '0'.repeat(64);
  await writeFile(manifestPath(root), JSON.stringify(manifest));
  await removeTargets(root);
  await assert.rejects(restore(root), /Combined/);
  assert.deepEqual(await readdir(dirname(join(root, TARGET))), []);
});

test('manifest validation rejects traversal, arbitrary targets, changed sizes, and malformed hashes', async (t) => {
  const root = await fixture(t);
  await pack(root);
  const original = await readManifest(root);
  const mutations = [
    (m) => { m.files[0].target = '../outside.pptx'; },
    (m) => { m.files[1].target = '/tmp/outside.pptx'; },
    (m) => { m.files[0].parts[0].file = '../../outside'; },
    (m) => { m.files[1].parts[0].file = '/tmp/outside'; },
    (m) => { m.files[0].parts.push(m.files[0].parts[0]); },
    (m) => { m.files[0].parts[0].bytes += 1; },
    (m) => { m.files[1].parts[0].sha256 = 'invalid'; },
    (m) => { m.files[0].sha256 = null; },
    (m) => { m.files[0].sha256 = [m.files[0].sha256]; },
    (m) => { m.files[0].parts[0].sha256 = [m.files[0].parts[0].sha256]; },
    (m) => { m.chunkBytes += 1; },
    (m) => { m.files[0].bytes = 0; },
    (m) => { m.version = 1; },
    (m) => { m.files.reverse(); },
    (m) => { m.files[1] = m.files[0]; },
    (m) => { m.files.pop(); },
    (m) => { m.files[0].parts[0].file = m.files[1].parts[0].file; },
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
  const part = manifest.files[0].parts[0];
  await writeFile(join(root, ARCHIVE, part.file), Buffer.alloc(part.bytes));
  await assert.rejects(restore(root), /SHA256 mismatch/);
});

test('second-file corruption is detected before publishing the missing first file', async (t) => {
  const root = await fixture(t);
  await pack(root);
  const manifest = await readManifest(root);
  const part = manifest.files[1].parts[0];
  await writeFile(join(root, ARCHIVE, part.file), Buffer.alloc(part.bytes));
  await removeTargets(root);
  await assert.rejects(restore(root), /SHA256 mismatch/);
  assert.deepEqual(await readdir(dirname(join(root, TARGET))), []);
});

test('a mismatching second target blocks both restores without changing either target', async (t) => {
  const root = await fixture(t);
  await pack(root);
  await unlink(join(root, TARGET));
  const replacement = Buffer.from('Preserve the second existing presentation');
  await writeFile(join(root, SECOND_TARGET), replacement);
  await assert.rejects(restore(root), /refusing to overwrite/);
  await assert.rejects(lstat(join(root, TARGET)), { code: 'ENOENT' });
  assert.deepEqual(await readFile(join(root, SECOND_TARGET)), replacement);
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
    const part = join(root, ARCHIVE, manifest.files[0].parts[0].file);
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
  assert.deepEqual((await verify(root)).files.map((file) => file.targetExists), [false, false]);
  assert.equal((await restore(root)).status, 'restored');
});

test('checked-in production fragments restore both original binaries in isolation', async (t) => {
  const productionRoot = fileURLToPath(new URL('../', import.meta.url));
  const manifest = validateManifest(await readManifest(productionRoot));
  const root = await fixture(t);
  await removeTargets(root);
  await mkdir(join(root, ARCHIVE), { recursive: true });
  for (const name of ['manifest.json', ...partNames(manifest)]) {
    await copyFile(join(productionRoot, ARCHIVE, name), join(root, ARCHIVE, name));
  }
  const result = await restore(root);
  assert.equal(result.status, 'restored');
  for (const file of manifest.files) {
    const recovered = await readFile(join(root, file.target));
    assert.equal(recovered.length, file.bytes);
    assert.equal(sha256(recovered), file.sha256);
  }
  assert.deepEqual((await verify(root)).files.map((file) => file.targetExists), [true, true]);
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
