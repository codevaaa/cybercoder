import assert from 'node:assert/strict';
import test from 'node:test';
import { getModelPlanRestrictionMessage } from './model-access.js';

test('plan-restricted models point to Codeva pricing and show available free models', () => {
  const message = getModelPlanRestrictionMessage('madhav');
  assert.match(message, /madhav/);
  assert.match(message, /Codeva plan/);
  assert.match(message, /https:\/\/www\.cybermindcli\.info\/pricing/);
  assert.match(message, /Trinity or Kali/);
  assert.doesNotMatch(message, /opencode|zen/i);
});
