import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterModelOptions,
  getModelPickerViewport,
  moveModelPickerSelection,
  modelInfosFromIds,
  parseModelPickerWheelReports,
  type ModelInfo,
} from './ModelPicker.js';

test('filters provider models by name, id, tier, and description', () => {
  const models: ModelInfo[] = [
    { id: 'claude-sonnet', name: 'Claude Sonnet', tier: 'pro', desc: 'reasoning' },
    { id: 'gpt-fast', name: 'GPT Fast', tier: 'free', desc: 'quick coding' },
  ];
  assert.deepEqual(filterModelOptions(models, 'SONNET').map((model) => model.id), ['claude-sonnet']);
  assert.deepEqual(filterModelOptions(models, 'free').map((model) => model.id), ['gpt-fast']);
  assert.deepEqual(filterModelOptions(models, 'quick coding').map((model) => model.id), ['gpt-fast']);
});

test('provider catalogs become searchable model rows without fabricated tier labels', () => {
  const models = modelInfosFromIds(['  claude-sonnet-4-5 ', 'gpt-5', 'gpt-5'], 'Configured provider');
  assert.deepEqual(models.map((model) => model.id), ['claude-sonnet-4-5', 'gpt-5']);
  assert.equal(models[0]?.name, 'claude-sonnet-4-5');
  assert.equal(models[0]?.tier, 'available');
  assert.equal(models[0]?.desc, 'Available from Configured provider');
  assert.deepEqual(modelInfosFromIds([], 'Configured provider'), []);
});

test('a 120-model list scrolls to and selects the final model without leaving the viewport', () => {
  const models: ModelInfo[] = Array.from({ length: 120 }, (_, index) => ({
    id: `mock-model-${index + 1}`,
    name: `Pretend Model ${index + 1}`,
    tier: 'test',
    desc: `Long-list model ${index + 1}`,
  }));
  const visibleCount = 5;
  let selectedIndex = 0;

  for (let i = 0; i < models.length - 1; i += 1) {
    selectedIndex = moveModelPickerSelection(selectedIndex, 'down', models.length, visibleCount);
  }

  const viewport = getModelPickerViewport(models.length, selectedIndex, visibleCount);
  const visible = models.slice(viewport.start, viewport.end);
  const picked = models[selectedIndex];
  assert.equal(selectedIndex, 119);
  assert.equal(viewport.end, models.length);
  assert.ok(visible.some((model) => model.id === 'mock-model-120'));
  assert.equal(picked?.id, 'mock-model-120');
});

test('mouse-wheel reports scroll in both directions, including across input chunks', () => {
  const first = parseModelPickerWheelReports('typed text\u001b[<64;12;');
  assert.deepEqual(first.directions, []);
  const second = parseModelPickerWheelReports('8M\u001b[<65;12;8M', first.pending);
  assert.deepEqual(second.directions, ['up', 'down']);
  assert.equal(second.pending, '');

  const models: ModelInfo[] = Array.from({ length: 120 }, (_, index) => ({
    id: `mock-model-${index + 1}`,
    name: `Pretend Model ${index + 1}`,
    tier: 'test',
    desc: `Long-list model ${index + 1}`,
  }));
  let selectedIndex = 0;
  for (let index = 0; index < models.length - 1; index += 1) {
    selectedIndex = moveModelPickerSelection(selectedIndex, 'down', models.length, 5);
  }
  selectedIndex = moveModelPickerSelection(selectedIndex, second.directions[0]!, models.length, 5);
  selectedIndex = moveModelPickerSelection(selectedIndex, second.directions[1]!, models.length, 5);
  assert.equal(models[selectedIndex]?.id, 'mock-model-120');
});

test('mouse-wheel parser ignores non-wheel clicks and unrelated keyboard escape sequences', () => {
  const parsed = parseModelPickerWheelReports('x\u001b[A\u001b[<0;8;4M\u001b[<32;8;4M');
  assert.deepEqual(parsed.directions, []);
  assert.equal(parsed.pending, '');
});

test('page and end navigation remain clamped when a list shrinks after loading', () => {
  assert.equal(moveModelPickerSelection(2, 'page-down', 5, 10), 4);
  assert.equal(moveModelPickerSelection(4, 'down', 5, 3), 4);
  assert.equal(moveModelPickerSelection(0, 'last', 120, 5), 119);
  assert.equal(moveModelPickerSelection(119, 'first', 120, 5), 0);
  assert.deepEqual(getModelPickerViewport(2, 4, 10), { start: 0, end: 2 });
});
