import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARD_COUNT,
  GALLERY_START,
  GALLERY_END,
  clamp,
  mix,
  smooth,
  sceneAt,
  cardAt,
  progressForCard,
  layoutAt,
  ORBIT_RADIUS,
  TRUNK_BOTTOM,
  TRUNK_RADIUS,
} from './treeMotion.js';

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
};

test('clamping and eased interpolation preserve boundary values', () => {
  assert.equal(clamp(-Infinity), 0);
  assert.equal(clamp(Infinity), 1);
  assert.equal(clamp(-4, -2, 3), -2);
  assert.equal(clamp(4, -2, 3), 3);
  assert.equal(mix(12, -4, 0), 12);
  assert.equal(mix(12, -4, 1), -4);
  assert.equal(smooth(-10), 0);
  assert.equal(smooth(10), 1);
  assert.equal(smooth(0.5), 0.5);
});

test('scene progress outside the scroll range is fixed to the appropriate endpoint', () => {
  for (const mobile of [false, true]) {
    assert.deepEqual(sceneAt(-100, mobile), sceneAt(0, mobile));
    assert.deepEqual(sceneAt(-Infinity, mobile), sceneAt(0, mobile));
    assert.deepEqual(sceneAt(100, mobile), sceneAt(1, mobile));
    assert.deepEqual(sceneAt(Infinity, mobile), sceneAt(1, mobile));
  }
});

test('the introductory frame has no gallery, and the final frame has no hero', () => {
  const start = sceneAt(0);
  const end = sceneAt(1);
  assert.equal(start.heroOpacity, 1);
  assert.equal(start.galleryOpacity, 0);
  assert.equal(start.activeIndex, 0);
  assert.equal(end.heroOpacity, 0);
  assert.equal(end.galleryOpacity, 1);
  assert.equal(end.activeIndex, CARD_COUNT - 1);
  assert.equal(sceneAt(GALLERY_START).gallery, 0);
  assert.equal(sceneAt(GALLERY_END).gallery, 1);
});

test('each navigation stop selects its card and places it in front at camera height', () => {
  let previousProgress = -Infinity;
  for (let index = 0; index < CARD_COUNT; index += 1) {
    const progress = progressForCard(index);
    assert.ok(progress > previousProgress);
    assert.ok(progress >= GALLERY_START && progress <= GALLERY_END);
    for (const mobile of [false, true]) {
      const state = sceneAt(progress, mobile);
      const card = cardAt(index, state);
      assert.equal(state.activeIndex, index);
      assert.equal(state.galleryOpacity, 1);
      closeTo(card.y, state.cameraY);
      assert.ok(card.z > 1, 'Selected cards must be keyboard-enabled and in front.');
      assert.ok(card.z < state.distance, 'The card must not cross the camera plane.');
      assert.ok(Math.abs(card.yaw) < Math.PI / 2, 'The selected card must face the reader.');
    }
    previousProgress = progress;
  }
});

test('previous/next navigation cannot move outside the available cards', () => {
  assert.equal(progressForCard(-1), progressForCard(0));
  assert.equal(progressForCard(-Infinity), GALLERY_START);
  assert.equal(progressForCard(CARD_COUNT), progressForCard(CARD_COUNT - 1));
  assert.equal(progressForCard(Infinity), GALLERY_END);
});

test('active index remains valid and only advances while scrolling forward', () => {
  let previous = 0;
  for (let step = 0; step <= 1000; step += 1) {
    const state = sceneAt(step / 1000);
    assert.ok(Number.isInteger(state.activeIndex));
    assert.ok(state.activeIndex >= 0 && state.activeIndex < CARD_COUNT);
    assert.ok(state.activeIndex >= previous);
    assert.ok(state.activeIndex <= previous + 1);
    previous = state.activeIndex;
  }
});

test('camera, opacity, card transforms and CSS perspective stay finite across the scene', () => {
  for (const mobile of [false, true]) {
    const height = mobile ? 640 : 900;
    const focal = height / (2 * Math.tan(36 * Math.PI / 360));
    for (let step = 0; step <= 200; step += 1) {
      const state = sceneAt(step / 200, mobile);
      for (const [key, value] of Object.entries(state)) {
        assert.ok(Number.isFinite(value), `Non-finite scene property ${key}`);
      }
      assert.ok(state.distance > 0);
      for (const opacity of [state.heroOpacity, state.galleryOpacity]) {
        assert.ok(opacity >= 0 && opacity <= 1);
      }
      for (let index = 0; index < CARD_COUNT; index += 1) {
        const card = cardAt(index, state);
        assert.ok(Object.values(card).every(Number.isFinite));
        const unit = focal / state.distance;
        const perspectiveDivisor = 1 - card.z * unit / focal;
        assert.ok(perspectiveDivisor > 0, 'Card projection must remain in front of the camera.');
        const projectedX = card.x * unit / perspectiveDivisor;
        const projectedY = (card.y - state.cameraY) * unit / perspectiveDivisor;
        assert.ok(Number.isFinite(projectedX) && Number.isFinite(projectedY));
        assert.ok(Math.abs(card.yaw) < Math.PI / 2, 'Back cards should not mirror their text.');
      }
    }
  }
});

test('mobile moves the camera outward without changing which card is selected', () => {
  for (let index = 0; index < CARD_COUNT; index += 1) {
    const progress = progressForCard(index);
    const desktop = sceneAt(progress);
    const mobile = sceneAt(progress, true);
    assert.ok(mobile.distance > desktop.distance);
    assert.equal(mobile.activeIndex, desktop.activeIndex);
    closeTo(mobile.cameraY, desktop.cameraY);
  }
});

test('all paper cards orbit the trunk on one circular world-space axis', () => {
  for (let step = 0; step <= 100; step += 1) {
    const state = sceneAt(step / 100);
    for (let index = 0; index < CARD_COUNT; index += 1) {
      const card = cardAt(index, state);
      closeTo(card.x ** 2 + card.z ** 2, ORBIT_RADIUS ** 2);
    }
  }
});

test('camera descent translates the tree continuously with the cards, reversibly', () => {
  for (const [width, height] of [[1180, 780], [390, 844], [1920, 1080]]) {
    let previousRoot = Infinity;
    let firstHeight;
    for (let step = 0; step <= 100; step += 1) {
      const progress = mix(GALLERY_START, GALLERY_END, step / 100);
      const state = sceneAt(progress, width < 700);
      const layout = layoutAt(state, width, height);
      assert.ok(layout.rootY <= previousRoot);
      firstHeight ??= layout.treeHeight;
      closeTo(layout.treeHeight, firstHeight);
      closeTo(layout.rootY - (state.cameraY - TRUNK_BOTTOM) * layout.unit, layout.originY);
      assert.ok(layout.rootY > height * 1.5, 'The bottom of the trunk must never enter the viewport.');
      assert.ok(Object.values(layout).every(Number.isFinite));
      assert.deepEqual(layoutAt(sceneAt(progress, width < 700), width, height), layout);
      previousRoot = layout.rootY;
    }
  }
});

test('scrolling rotates the trunk, including when ambient animation is paused', () => {
  let previous = -1;
  for (let step = 0; step <= 100; step += 1) {
    const state = sceneAt(mix(GALLERY_START, GALLERY_END, step / 100));
    assert.ok(state.treeRotation > previous);
    previous = state.treeRotation;
    assert.ok(state.orbitRadius > TRUNK_RADIUS + 1, 'Paper orbit must clear the trunk surface.');
  }
  assert.ok(previous > Math.PI, 'Trunk should visibly turn, not just subtly sway.');
});

test('trunk close-up occupies a substantial part of desktop and mobile frames', () => {
  for (const [width, height] of [[1180, 780], [390, 844], [1920, 1080]]) {
    const state = sceneAt(GALLERY_END, width < 700);
    const layout = layoutAt(state, width, height);
    assert.ok(2 * TRUNK_RADIUS * layout.unit / width > 0.35);
    assert.ok(state.cameraY > 15, 'Camera must finish on the trunk, not at its base.');
  }
});

test('each card passes both behind and in front of the trunk over the full scroll', () => {
  for (let index = 0; index < CARD_COUNT; index += 1) {
    const depths = Array.from({ length: 101 }, (_, step) => cardAt(index,
      sceneAt(mix(GALLERY_START, GALLERY_END, step / 100))).z);
    assert.ok(Math.min(...depths) < -1);
    assert.ok(Math.max(...depths) > 1);
  }
});
