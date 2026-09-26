import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const banned = [
  /\b(?:adaptResult|LiveGraphicState|liveGraphicStateZod|fromLegacyPlaybackState|graphicsStateMapAtom|liveGraphicStateAtom|GraphicsQueueSocketEvent|queueNext|queueGo|loadQueue|queueEntriesFromShow)\b/,
  /['"]graphics:(?:state|load|advance|previous|go|take|clear|preview|queue|queueNext)['"]/
];
const failures = [];
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (!['tests', 'test', 'node_modules', 'build', 'dist', '.git'].includes(entry.name)) inspect(path);
    } else if (/\.(ts|tsx|mjs)$/.test(entry.name) && !/\.(test|selftest)\./.test(entry.name)) {
      const source = readFileSync(path, 'utf8');
      if (banned.some(pattern => pattern.test(source))) failures.push(relative(root, path));
      if (path.endsWith('realtime\\src\\Server.ts') || path.endsWith('realtime/src/Server.ts')) {
        if (/app\.post\("\/graphics\/:eventKey\/(?:live\/|queue\/)/.test(source)) failures.push(relative(root, path) + ': obsolete command route');
      }
    }
  }
}
for (const directory of ['apps', 'libs']) inspect(resolve(root, directory));
if (failures.length) throw new Error('Banned graphics contracts: ' + failures.join(', '));
console.log('Graphics legacy contract check passed');
