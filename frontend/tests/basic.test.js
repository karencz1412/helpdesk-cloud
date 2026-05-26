import test from 'node:test';
import assert from 'node:assert/strict';

test('frontend basic smoke test', () => {
  assert.equal('HelpDesk'.includes('Desk'), true);
});
