#!/usr/bin/env node
// Binary transport only: never opens or rewrites the PPTX's ZIP/XML contents.
import { createHash } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { link, lstat, mkdir, mkdtemp, open, readFile, realpath, rmdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const TARGET = 'public/downloads/huazhongren-project-introduction-updated.pptx';
export const ARCHIVE = 'release-assets/large-downloads';
export const CHUNK_BYTES = 40 * 1024 * 1024;
const FILE_NAME = TARGET.split('/').at(-1);
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HASH = /^[a-f0-9]{64}$/;
const READ_FLAGS = constants.O_RDONLY | (constants.O_NOFOLLOW || 0);
const partName = (index) => `${FILE_NAME}.part-${String(index + 1).padStart(3, '0')}`;
const fail = (message) => { throw new Error(message); };

async function maybeStat(path) {
  try { return await lstat(path); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// All relative paths come from constants, never manifest-controlled path joins.
// Check every existing component: a symlink must not redirect reads or writes.
async function fixedDirectory(root, relative, create = false, optional = false) {
  let current = await realpath(root);
  for (const segment of relative.split('/')) {
    current = join(current, segment);
    let stat = await maybeStat(current);
    if (!stat && optional) return null;
    if (!stat && create) {
      await mkdir(current).catch((error) => { if (error.code !== 'EEXIST') throw error; });
      stat = await lstat(current);
    }
    if (!stat?.isDirectory() || stat.isSymbolicLink()) fail(`Expected a real directory: ${current}`);
  }
  return current;
}

async function regularFile(path, optional = false) {
  const stat = await maybeStat(path);
  if (!stat && optional) return null;
  if (!stat?.isFile() || stat.isSymbolicLink()) fail(`Expected a regular non-symlink file: ${path}`);
  return stat;
}

async function fingerprint(path) {
  await regularFile(path);
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(path, { flags: READ_FLAGS })) {
    bytes += chunk.length;
    hash.update(chunk);
  }
  return { bytes, sha256: hash.digest('hex') };
}

const matches = (actual, expected) => actual.bytes === expected.bytes && actual.sha256 === expected.sha256;

export function validateManifest(manifest) {
  if (!manifest || manifest.version !== 1 || manifest.target !== TARGET
    || manifest.chunkBytes !== CHUNK_BYTES || !Number.isSafeInteger(manifest.bytes)
    || manifest.bytes <= 0 || typeof manifest.sha256 !== 'string' || !HASH.test(manifest.sha256)
    || !Array.isArray(manifest.parts) || manifest.parts.length !== Math.ceil(manifest.bytes / CHUNK_BYTES)) {
    fail('Invalid large-download manifest header or target');
  }
  manifest.parts.forEach((part, index) => {
    const expectedBytes = Math.min(CHUNK_BYTES, manifest.bytes - index * CHUNK_BYTES);
    if (!part || part.file !== partName(index) || part.bytes !== expectedBytes
      || typeof part.sha256 !== 'string' || !HASH.test(part.sha256)) {
      fail(`Invalid manifest part ${index + 1}: expected fixed name, size, and SHA256`);
    }
  });
  return manifest;
}

async function readManifest(root) {
  const directory = await fixedDirectory(root, ARCHIVE);
  const path = join(directory, 'manifest.json');
  const stat = await regularFile(path);
  if (stat.size > 64 * 1024) fail('Manifest exceeds the 64 KiB safety limit');
  return { directory, manifest: validateManifest(JSON.parse(await readFile(path, 'utf8'))) };
}

async function writeAll(handle, buffer) {
  let offset = 0;
  while (offset < buffer.length) {
    const { bytesWritten } = await handle.write(buffer, offset, buffer.length - offset, null);
    if (!bytesWritten) fail('Unable to finish writing binary data');
    offset += bytesWritten;
  }
}

async function inspectParts(directory, manifest, output) {
  const total = createHash('sha256');
  let totalBytes = 0;
  for (const [index, part] of manifest.parts.entries()) {
    const path = join(directory, partName(index));
    const stat = await regularFile(path);
    if (stat.size !== part.bytes) fail(`Part size mismatch: ${part.file}`);
    const hash = createHash('sha256');
    let bytes = 0;
    for await (const chunk of createReadStream(path, { flags: READ_FLAGS, highWaterMark: 1024 * 1024 })) {
      bytes += chunk.length;
      totalBytes += chunk.length;
      if (bytes > part.bytes) fail(`Part grew while reading: ${part.file}`);
      hash.update(chunk);
      total.update(chunk);
      if (output) await writeAll(output, chunk);
    }
    if (bytes !== part.bytes || hash.digest('hex') !== part.sha256) fail(`Part SHA256 mismatch: ${part.file}`);
  }
  if (totalBytes !== manifest.bytes || total.digest('hex') !== manifest.sha256) {
    fail('Combined download size or SHA256 mismatch');
  }
}

async function cleanTemporary(directory, names) {
  for (const name of names) await unlink(join(directory, name)).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  await rmdir(directory);
}

const summary = (status, manifest) => ({ status, target: TARGET, bytes: manifest.bytes, sha256: manifest.sha256, parts: manifest.parts.length });

// root is injectable only for isolated tests. The CLI accepts no path arguments.
export async function pack(root = PROJECT_ROOT) {
  const sourceDirectory = await fixedDirectory(root, 'public/downloads');
  const source = join(sourceDirectory, FILE_NAME);
  const original = await fingerprint(source);
  if (!original.bytes) fail('Refusing to pack an empty download');
  const directory = await fixedDirectory(root, ARCHIVE, true);
  if (await regularFile(join(directory, 'manifest.json'), true)) {
    const { manifest } = await readManifest(root);
    if (!matches(original, manifest)) fail('Existing bundle differs from source; refusing to replace it');
    await inspectParts(directory, manifest);
    return summary('already-packed', manifest);
  }

  const manifest = { version: 1, target: TARGET, ...original, chunkBytes: CHUNK_BYTES, parts: [] };
  const temporary = await mkdtemp(join(directory, '.pack-'));
  const temporaryNames = [];
  const installed = [];
  let sourceHandle;
  try {
    sourceHandle = await open(source, READ_FLAGS);
    const total = createHash('sha256');
    let remaining = original.bytes;
    while (remaining > 0) {
      const bytes = Math.min(CHUNK_BYTES, remaining);
      const buffer = Buffer.allocUnsafe(bytes);
      let offset = 0;
      while (offset < bytes) {
        const result = await sourceHandle.read(buffer, offset, bytes - offset, null);
        if (!result.bytesRead) fail('Source changed while packing');
        offset += result.bytesRead;
      }
      total.update(buffer);
      const file = partName(manifest.parts.length);
      temporaryNames.push(file);
      await writeFile(join(temporary, file), buffer, { flag: 'wx' });
      manifest.parts.push({ file, bytes, sha256: createHash('sha256').update(buffer).digest('hex') });
      remaining -= bytes;
    }
    const tail = await sourceHandle.read(Buffer.alloc(1), 0, 1, null);
    if (tail.bytesRead || total.digest('hex') !== original.sha256) fail('Source changed while packing');
    await sourceHandle.close();
    sourceHandle = null;
    validateManifest(manifest);
    await inspectParts(temporary, manifest);
    temporaryNames.push('manifest.json');
    await writeFile(join(temporary, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    // Hard links publish complete files without ever overwriting existing data.
    // Publish the manifest last, so an incomplete pack cannot appear valid.
    for (const name of temporaryNames) {
      const path = join(directory, name);
      await link(join(temporary, name), path);
      installed.push(path);
    }
    return summary('packed', manifest);
  } catch (error) {
    for (const path of installed) await unlink(path);
    throw error;
  } finally {
    await sourceHandle?.close();
    await cleanTemporary(temporary, temporaryNames);
  }
}

export async function verify(root = PROJECT_ROOT) {
  const { directory, manifest } = await readManifest(root);
  await inspectParts(directory, manifest);
  const sourceDirectory = await fixedDirectory(root, 'public/downloads', false, true);
  if (!sourceDirectory) return { ...summary('verified', manifest), targetExists: false };
  const target = join(sourceDirectory, FILE_NAME);
  const exists = Boolean(await regularFile(target, true));
  if (exists && !matches(await fingerprint(target), manifest)) fail('Existing download SHA256 mismatch');
  return { ...summary('verified', manifest), targetExists: exists };
}

export async function restore(root = PROJECT_ROOT) {
  const { directory, manifest } = await readManifest(root);
  const targetDirectory = await fixedDirectory(root, 'public/downloads', true);
  const target = join(targetDirectory, FILE_NAME);
  if (await regularFile(target, true)) {
    if (!matches(await fingerprint(target), manifest)) fail('Existing download differs; refusing to overwrite it');
    await inspectParts(directory, manifest);
    return summary('already-restored', manifest);
  }

  const temporary = await mkdtemp(join(targetDirectory, '.large-download-restore-'));
  const name = 'verified-download.pptx';
  let handle;
  try {
    handle = await open(join(temporary, name), 'wx');
    await inspectParts(directory, manifest, handle);
    await handle.sync();
    await handle.close();
    handle = null;
    try { await link(join(temporary, name), target); }
    catch (error) {
      // Another build may have installed the same verified file meanwhile.
      if (error.code !== 'EEXIST' || !matches(await fingerprint(target), manifest)) throw error;
      return summary('already-restored', manifest);
    }
    return summary('restored', manifest);
  } finally {
    await handle?.close();
    await cleanTemporary(temporary, [name]);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const [command, ...extra] = process.argv.slice(2);
  const commands = { pack, restore, verify };
  if (extra.length || !Object.hasOwn(commands, command)) {
    console.error('Usage: node scripts/large-downloads.mjs <pack|restore|verify> (fixed project paths; no additional arguments)');
    process.exitCode = 1;
  } else {
    try { console.log(JSON.stringify(await commands[command](), null, 2)); }
    catch (error) { console.error(`large-downloads: ${error.message}`); process.exitCode = 1; }
  }
}
