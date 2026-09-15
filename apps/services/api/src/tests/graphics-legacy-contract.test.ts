import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('production sources cannot reintroduce removed graphics authority/events/routes', () => {
  const output = execFileSync(process.execPath, ['../../../scripts/check-graphics-contract.mjs'], { encoding: 'utf8', windowsHide: true });
  assert.match(output, /Graphics legacy contract check passed/);
});
