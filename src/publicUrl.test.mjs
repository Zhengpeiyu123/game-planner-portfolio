import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { publicUrl } from './publicUrl.js';
import { caseStudies } from './content.js';

test('public files work at the origin root and at a Pages repository prefix', () => {
  for (const path of [
    '/assets/storybook/pastel-cat-atlas.png',
    '/downloads/zheng-peiyu-resume.docx',
    '/downloads/huazhongren-project-introduction-updated.pptx',
    '/prototypes/huazhongren/index.html',
    '/favicon.svg',
  ]) {
    assert.equal(publicUrl(path, '/'), path);
    assert.equal(publicUrl(path, '/game-planner-portfolio/'), `/game-planner-portfolio${path}`);
    assert.equal(publicUrl(path, 'game-planner-portfolio'), `/game-planner-portfolio${path}`);
    assert.equal(publicUrl(path, '/portfolio/nested/'), `/portfolio/nested${path}`);
  }
});

test('relative public filenames, query strings, fragments and Unicode are preserved', () => {
  assert.equal(publicUrl('assets/封面.png', '/portfolio/'), '/portfolio/assets/封面.png');
  assert.equal(publicUrl('./assets/cover.png?v=2#preview', '/portfolio/'), '/portfolio/assets/cover.png?v=2#preview');
  assert.equal(publicUrl('/downloads/design%20notes.md?download=1', '/portfolio/'), '/portfolio/downloads/design%20notes.md?download=1');
});

test('external URLs, hash navigation and non-HTTP schemes are untouched', () => {
  for (const path of [
    'https://vibe-games.yoroll.ai/games/h5/example/index.html',
    'http://example.com/assets/cover.png',
    '//cdn.example.com/assets/cover.png',
    'mailto:15528165282@163.com',
    'tel:+8615528165282',
    'data:image/png;base64,abcd',
    'blob:https://example.com/123',
    '#project/huazhongren',
    '#reading/process',
    '?view=gallery',
    '', undefined, null,
  ]) assert.equal(publicUrl(path, '/portfolio/'), path);
});

test('already-prefixed content is not doubled; similarly named paths are distinct', () => {
  const once = publicUrl('/assets/cover.png', '/portfolio/');
  assert.equal(publicUrl(once, '/portfolio/'), once);
  assert.equal(publicUrl('/portfolio', '/portfolio/'), '/portfolio');
  assert.equal(publicUrl('/portfolio-old/assets/cover.png', '/portfolio/'), '/portfolio/portfolio-old/assets/cover.png');
});

test('Node can import project data without import.meta.env for download generation', () => {
  assert.equal(publicUrl('/assets/test.png'), '/assets/test.png');
  assert.equal(caseStudies.length, 3);
  assert.equal(caseStudies[0].image, '/assets/project-huazhongren-pdf-cover.png');
  assert.ok(caseStudies[0].materials.some(({ href }) => href === '/prototypes/huazhongren/index.html'));
  const hostedPrototype = caseStudies[2].materials.find(({ href }) => href.startsWith('https://'));
  assert.ok(hostedPrototype);
  assert.equal(publicUrl(hostedPrototype.href, '/portfolio/'), hostedPrototype.href);
});

test('all project image/material URLs can be resolved under a deployment prefix', () => {
  const paths = [];
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['image', 'src', 'href'].includes(key) && typeof child === 'string') paths.push(child);
      else if (typeof child === 'object') visit(child);
    }
  };
  visit(caseStudies);
  assert.ok(paths.length >= 14);
  for (const path of paths) {
    const resolved = publicUrl(path, '/portfolio/');
    if (path.startsWith('/')) assert.equal(resolved, `/portfolio${path}`);
    else assert.equal(resolved, path);
  }
});

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = await Promise.all(entries.map(async (entry) => {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:js|jsx|mjs)$/.test(entry.name) && !entry.name.endsWith('.test.mjs') ? [path] : [];
  }));
  return results.flat();
}

test('JS/JSX root-absolute public assets must go through the shared helper', async () => {
  const violations = [];
  let checked = 0;
  for (const path of await sourceFiles(new URL('./', import.meta.url))) {
    const source = await readFile(path, 'utf8');
    for (const match of source.matchAll(/(['"`])\/(?:assets|downloads|prototypes)\//g)) {
      checked += 1;
      if (!/publicUrl\(\s*$/.test(source.slice(0, match.index))) {
        const line = source.slice(0, match.index).split('\n').length;
        violations.push(`${fileURLToPath(path)}:${line}`);
      }
    }
  }
  assert.ok(checked >= 30, 'The guard should inspect all current runtime public paths.');
  assert.deepEqual(violations, []);
});

test('HTML public metadata uses BASE_URL and lets Vite own the module entry', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /href="%BASE_URL%favicon\.svg"/);
  assert.match(html, /content="%BASE_URL%assets\/hero-painted-world\.png"/);
  assert.match(html, /type="module" src="\/src\/main\.jsx"/);
  assert.doesNotMatch(html, /(?:href|content)="\/(?:assets|downloads|prototypes)\//);
});
