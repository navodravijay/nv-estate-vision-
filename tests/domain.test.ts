import test from 'node:test';
import assert from 'node:assert/strict';
import { contactLink, filterUnits, parsePreference, unitsForFloor, validFloor } from '../src/domain.ts';

test('floor boundaries reject fractions, non-finite and untrusted values', () => {
  for (const value of [0, 33, 1.5, NaN, Infinity, '18', null, undefined]) assert.equal(validFloor(value), false);
  assert.equal(validFloor(1), true); assert.equal(validFloor(32), true);
  assert.deepEqual(unitsForFloor(-1), []);
});
test('all floors have unique stable inventory with consistent availability', () => {
  const ids = new Set<string>();
  for (let floor = 1; floor <= 32; floor++) {
    const units = unitsForFloor(floor);
    assert.equal(units.length, 3);
    for (const unit of units) { assert.equal(unit.floor, floor); assert.ok(unit.area > 0); assert.ok(!ids.has(unit.id)); ids.add(unit.id); }
    assert.deepEqual(units, unitsForFloor(floor));
  }
  assert.equal(ids.size, 96);
});
test('combined filters include only matching residences and support empty results', () => {
  const units = unitsForFloor(18);
  assert.equal(filterUnits(units, 'all', 'all').length, 3);
  assert.deepEqual(filterUnits(units, '2', 'available').map(unit => unit.id), ['18B']);
  assert.equal(filterUnits(units, '3', 'available').length, 0);
  assert.equal(filterUnits(units, 'all', 'reserved')[0].id, '18C');
  assert.deepEqual(filterUnits(units, '<script>', 'all'), []);
});
test('saved preferences accept only allowlisted fields and discard extra data', () => {
  assert.deepEqual(parsePreference({ bedrooms: 2, floor: 18, priority: 'layout', email: 'discard' }), { bedrooms: 2, floor: 18, priority: 'layout' });
  for (const value of [null, '{}', { bedrooms: '2', floor: 18, priority: 'layout' }, { bedrooms: 2, floor: 33, priority: 'layout' }, { bedrooms: 1, floor: 1, priority: '<img>' }]) assert.equal(parsePreference(value), null);
});
test('contact actions require verification and reject URL or header injection', () => {
  assert.equal(contactLink({ verified: false, email: 'sales@example.com', whatsapp: '' }), null);
  assert.equal(contactLink({ verified: true, email: 'sales@example.com', whatsapp: '' }), 'mailto:sales@example.com');
  assert.equal(contactLink({ verified: true, email: 'sales@example.com?bcc=attacker@example.com', whatsapp: '' }), null);
  assert.equal(contactLink({ verified: true, email: 'a\r\nb@example.com', whatsapp: 'javascript:alert(1)' }), null);
  assert.equal(contactLink({ verified: true, email: 'sales%0d%0aBcc:injected@example.com', whatsapp: '' }), null);
  assert.equal(contactLink({ verified: true, email: '', whatsapp: '94712345678' }), 'https://wa.me/94712345678');
});
