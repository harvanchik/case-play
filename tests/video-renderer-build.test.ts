import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { buildVideoRendererSource } from '../scripts/video-renderer-plugin';

test('renderer bundles on a clean checkout without generated SvelteKit aliases', async () => {
 const root = process.cwd();
 const directory = await mkdtemp(join(tmpdir(), 'caseplay-clean-renderer-'));
 try {
  await cp(join(root, 'src/lib'), join(directory, 'src/lib'), { recursive: true });
  await cp(join(root, 'tsconfig.json'), join(directory, 'tsconfig.json'));
  process.chdir(directory);
  await buildVideoRendererSource();
  const generated = await readFile('.svelte-kit/video-renderer-source.js', 'utf8');
  assert.match(generated, /^export default /);
  assert.match(generated, /evaluateAnimation/);
  assert.doesNotMatch(generated, /from ['"]\$lib\//);
 } finally {
  process.chdir(root);
  assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + '/caseplay-clean-renderer-') || resolve(directory).startsWith(join(resolve(tmpdir()), 'caseplay-clean-renderer-')));
  await rm(directory, { recursive: true, force: true });
 }
});
