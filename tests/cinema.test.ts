import test from 'node:test';
import assert from 'node:assert/strict';
import { chapterAt, chapters } from '../src/cinema.ts';

test('chapter navigation wraps at both ends and rejects fractional indices', () => {
  assert.equal(chapterAt(-1).id, 'sky');
  assert.equal(chapterAt(3).id, 'arrival');
  assert.equal(chapterAt(1).id, 'garden');
  for (const index of [NaN, Infinity, 1.2]) assert.equal(chapterAt(index).id, 'arrival');
});
test('cinematic camera endpoints remain outside the tower and use bounded lenses', () => {
  assert.equal(new Set(chapters.map(chapter => chapter.id)).size, 3);
  for (const chapter of chapters) {
    assert.ok(chapter.position.every(Number.isFinite));
    assert.ok(chapter.target.every(Number.isFinite));
    assert.ok(Math.abs(chapter.position[0]) > 8 && chapter.position[2] > 8);
    assert.ok(chapter.fov >= 35 && chapter.fov <= 50);
  }
});
