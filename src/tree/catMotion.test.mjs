import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAT_MOTION, createCatMotion, createCatMotionState, stepCatMotion, catMotionSnapshot,
} from './catMotion.js';

const sample = (gallery, dt = 0.05, extra = {}) => ({ gallery, dt, ...extra });
function tick(cat, gallery, seconds, extra = {}) {
  let result;
  let remaining = seconds;
  while (remaining > 1e-8) {
    const dt = Math.min(0.05, remaining);
    result = cat.update(sample(gallery, dt, extra));
    remaining -= dt;
  }
  return result ?? cat.update(sample(gallery, 0, extra));
}
function trigger(cat, gallery, extra = {}) {
  cat.update(sample(gallery, 0, extra));
  return tick(cat, gallery, CAT_MOTION.settleDuration, extra);
}
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('waits for gallery entrance and a continuous frontal dwell', () => {
  const cat = createCatMotion();
  assert.equal(tick(cat, 0, 0.2, { entrance: 0.8 }).visible, false);
  assert.equal(tick(cat, 0, 0.2, { galleryOpacity: 0.7 }).visible, false);
  cat.update(sample(0, 0));
  assert.equal(tick(cat, 0, 0.05).phase, 'hidden');
  const result = tick(cat, 0, 0.05);
  assert.equal(result.phase, 'jump');
  assert.equal(result.cardIndex, 0);
  assert.equal(result.frame, 4);
});

test('does not use rounded activeIndex at the halfway switch', () => {
  const cat = createCatMotion();
  assert.equal(tick(cat, 0.13, 0.5).phase, 'hidden'); // round(.13 * 4) is 1.
  assert.equal(trigger(cat, (1 - CAT_MOTION.frontThreshold) / 4).cardIndex, 1);
  cat.reset();
  assert.equal(tick(cat, (1 - CAT_MOTION.frontThreshold - 0.0001) / 4, 0.5).phase, 'hidden');
});

test('an interrupted or changed candidate must settle again', () => {
  const cat = createCatMotion();
  cat.update(sample(0, 0));
  tick(cat, 0, 0.05);
  cat.update(sample(0.1));
  cat.update(sample(0, 0));
  assert.equal(tick(cat, 0, 0.05).phase, 'hidden');
  cat.update(sample(0.25, 0));
  assert.equal(tick(cat, 0.25, 0.05).phase, 'hidden');
  assert.equal(tick(cat, 0.25, 0.05).cardIndex, 1);
});

test('ordinary card crouches, jumps, walks left, and waits', () => {
  const cat = createCatMotion();
  const launch = trigger(cat, 0);
  assert.equal(launch.pose, 'crouch');
  near(launch.localX, CAT_MOTION.startX);
  const airborne = tick(cat, 0, 0.22);
  assert.equal(airborne.pose, 'airborne');
  assert.equal(airborne.frame, 5);
  assert.ok(airborne.jumpHeight > 0);
  const landed = tick(cat, 0, 0.7);
  assert.equal(landed.phase, 'walk');
  near(landed.localX, CAT_MOTION.rightX);
  near(landed.jumpHeight, 0);
  const walking = tick(cat, 0, 0.8);
  near(walking.progress, 0.5);
  assert.ok(walking.frame >= 0 && walking.frame <= 3);
  assert.ok(walking.localX < CAT_MOTION.rightX && walking.localX > CAT_MOTION.leftX);
  const waiting = tick(cat, 0, 0.8);
  assert.equal(waiting.phase, 'wait');
  assert.equal(waiting.frame, 6);
  near(waiting.localX, CAT_MOTION.leftX);
});

test('last card lands centrally then sits, never walking', () => {
  const cat = createCatMotion();
  trigger(cat, 1);
  const observed = [];
  for (let i = 0; i < 30; i++) observed.push(cat.update(sample(1)).phase);
  assert.equal(observed.includes('walk'), false);
  const result = cat.update(sample(1));
  assert.equal(result.cardIndex, 4);
  assert.equal(result.phase, 'sit');
  assert.equal(result.frame, 7);
  near(result.localX, CAT_MOTION.finalX);
});

test('same-card jitter cannot restart an animation or waiting pose', () => {
  const cat = createCatMotion();
  trigger(cat, 0);
  const progressed = tick(cat, 0, 0.4);
  tick(cat, 0.1, 0.1); // Leave the frontal window but not the gallery.
  const returned = tick(cat, 0, 0.2);
  assert.equal(returned.cardIndex, 0);
  assert.ok(returned.progress > progressed.progress);
  tick(cat, 0, 3);
  tick(cat, 0.1, 0.1);
  assert.equal(tick(cat, 0, 0.2).phase, 'wait');
});

test('quick scrolling only triggers the latest settled target, without a queue', () => {
  const cat = createCatMotion();
  trigger(cat, 0);
  cat.update(sample(0.25, 0.05));
  cat.update(sample(0.5, 0.05));
  cat.update(sample(0.75, 0.05));
  assert.equal(tick(cat, 0.75, 0.1).cardIndex, 3);
  assert.equal(tick(cat, 0.75, 3).cardIndex, 3);
  assert.equal(cat.update(sample(0.75)).phase, 'wait');
});

test('a new settled card interrupts jump/walk; reversing can replay earlier cards', () => {
  const cat = createCatMotion();
  trigger(cat, 0);
  assert.equal(trigger(cat, 0.5).cardIndex, 2);
  assert.equal(trigger(cat, 0.25).cardIndex, 1);
  const backwards = trigger(cat, 0);
  assert.equal(backwards.cardIndex, 0);
  assert.equal(backwards.progress, 0);
  assert.equal(backwards.pose, 'crouch');
});

test('pause freezes animation and dwell but accepts only the latest candidate', () => {
  const cat = createCatMotion();
  trigger(cat, 0);
  const before = tick(cat, 0, 0.4);
  assert.deepEqual(tick(cat, 0, 1, { paused: true }), before);
  assert.deepEqual(tick(cat, 0.25, 1, { paused: true }), before);
  assert.deepEqual(tick(cat, 0.5, 1, { paused: true }), before);
  assert.equal(tick(cat, 0.5, 0.05).cardIndex, 0);
  assert.equal(tick(cat, 0.5, 0.05).cardIndex, 2);
});

test('pause also freezes walking, waiting, and sitting snapshots', () => {
  for (const [gallery, duration, phase] of [[0, 1.2, 'walk'], [0, 3, 'wait'], [1, 1.2, 'sit']]) {
    const cat = createCatMotion();
    trigger(cat, gallery);
    const before = tick(cat, gallery, duration);
    assert.equal(before.phase, phase);
    assert.deepEqual(tick(cat, gallery, 1, { paused: true }), before);
  }
});

test('leaving resets even while paused and the same card can trigger on re-entry', () => {
  const cat = createCatMotion();
  trigger(cat, 0.5);
  assert.equal(cat.update(sample(0.5, 0.1, { paused: true, inGallery: false })).phase, 'hidden');
  assert.equal(trigger(cat, 0.5).cardIndex, 2);
  assert.equal(cat.update(sample(0.5, 0.1, { entrance: 0.2 })).visible, false);
  assert.equal(trigger(cat, 0.5).phase, 'jump');
  assert.equal(cat.reset().cardIndex, null);
});

test('dt is bounded, non-finite/negative dt is inert, and stage overshoot is carried', () => {
  const cat = createCatMotion();
  trigger(cat, 0);
  const before = cat.update(sample(0, 0));
  for (const dt of [-1, NaN, Infinity]) assert.deepEqual(cat.update(sample(0, dt)), before);
  cat.update(sample(0, 1000)); // only 0.1 s of crouch
  assert.equal(cat.update(sample(0, 0)).frame, 4);
  tick(cat, 0, 0.78); // elapsed .88; jump ends at .92
  const next = cat.update(sample(0, 0.1));
  assert.equal(next.phase, 'walk');
  near(next.progress, 0.06 / CAT_MOTION.walkDuration);
});

test('empty/count changes/invalid progress reset safely; single card sits', () => {
  const cat = createCatMotion();
  trigger(cat, 0.5);
  for (const gallery of [NaN, Infinity, -0.1, 1.1, undefined]) {
    const result = cat.update(sample(gallery));
    assert.equal(result.phase, 'hidden');
    assert.equal(result.cardIndex, null);
  }
  assert.equal(tick(cat, 0, 0.5, { count: 0 }).visible, false);
  trigger(cat, 1, { count: 3 });
  assert.equal(cat.update(sample(1, 0, { count: 3 })).cardIndex, 2);
  assert.equal(cat.update(sample(1, 0, { count: 1 })).phase, 'hidden');
  tick(cat, 1, 0.1, { count: 1 });
  assert.equal(tick(cat, 1, 1, { count: 1 }).phase, 'sit');
});

test('pure transition and snapshot do not mutate their inputs', () => {
  const original = Object.freeze(createCatMotionState());
  const input = Object.freeze(sample(0));
  const next = stepCatMotion(original, input);
  assert.notEqual(next, original);
  assert.deepEqual(original, createCatMotionState());
  assert.deepEqual(stepCatMotion(original, input), next);
  const frozen = Object.freeze(next);
  assert.deepEqual(catMotionSnapshot(frozen), catMotionSnapshot(frozen));
});
