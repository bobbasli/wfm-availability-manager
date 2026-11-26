import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { join } from 'node:path';

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
const sources = files('src');
for (const path of sources) {
  assert.doesNotMatch(path, /\.jsx?$/, `${path}: application source must be TypeScript`);
  const source = readFileSync(path, 'utf8');
  if (path.endsWith('.vue')) assert.match(source, /<script setup lang="ts">/, path);
  if (!path.startsWith('src/services/'))
    assert.doesNotMatch(source, /\bfetch\s*\(/, `${path}: HTTP belongs in services`);
  assert.doesNotMatch(
    source,
    /@ts-(?:ignore|nocheck)|\bas any\b/,
    `${path}: do not suppress type safety`,
  );
}
const config = JSON.parse(readFileSync('tsconfig.json', 'utf8'));
assert.equal(config.compilerOptions.strict, true);
assert.equal(config.compilerOptions.allowJs, false);
assert.match(readFileSync('src/App.vue', 'utf8'), /CalendarView/);
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
assert.ok(readFileSync('src/components/AppHeader.vue', 'utf8').includes(`v${version}`));
assert.match(readFileSync('src/services/genesysApi.ts', 'utf8'), /onUnauthorized/);
console.log(
  'Architecture checks passed: typed Vue/TS, strict configuration, central HTTP boundary.',
);
