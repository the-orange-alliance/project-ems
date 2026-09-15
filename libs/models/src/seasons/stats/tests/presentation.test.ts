import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogue } from '../catalogue.js';
import { familyFor } from '../presentation/families.js';
import { presentationFor } from '../presentation/presentation.js';
import { semanticRegistrationFor, FGC2026_SEASON_KEY } from '../presentation/semantic-registry.js';

test('producer presentation metadata covers every shipped catalogue id and agrees with semantic kinds', () => {
  for (const row of catalogue) {
    assert.ok(familyFor(row.catalogueId));
    const presentation = presentationFor(row.catalogueId);
    const semantic = semanticRegistrationFor(FGC2026_SEASON_KEY, row.catalogueId)!;
    assert.equal(presentation.defaultKind, semantic.metadata.defaultKind);
    assert.deepEqual(presentation.allowedKinds, [...semantic.metadata.supportedKinds]);
  }
});
test('presentationFor throws on an unknown catalogue id', () => {
  assert.throws(() => presentationFor('ZZ999'));
});
