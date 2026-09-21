/** All time values are seconds; positions are relative to the destination card. */
export const CAT_MOTION = Object.freeze({
  frontThreshold: 0.12,
  settleDuration: 0.1,
  launchHold: 0.12,
  jumpDuration: 0.8,
  walkDuration: 1.6,
  maxDt: 0.1,
  entranceThreshold: 0.98,
  opacityThreshold: 0.95,
  startX: 0.98,
  rightX: 0.84,
  leftX: 0.12,
  finalX: 0.64,
});

const EPSILON = 1e-9;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = (value) => value * value * (3 - 2 * value);
const normalizeCount = (count) => Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 5;

/** Serializable state makes the transition testable without a clock or DOM. */
export function createCatMotionState(count = 5) {
  return {
    count: normalizeCount(count),
    cardIndex: null,
    candidateIndex: null,
    candidateTime: 0,
    phase: 'hidden',
    elapsed: 0,
  };
}

/**
 * Pure transition. A new frontal target replaces, rather than queues behind,
 * any previous animation. The same card never retriggers until a different
 * card has actually triggered, or the gallery has been left/reset.
 *
 * `inGallery` is an optional explicit lifecycle gate. It is needed when the
 * caller's gallery progress remains clamped to 1 after leaving the section.
 * Pause freezes both settling and animation; leaving still resets immediately.
 */
export function stepCatMotion(previous, sample = {}) {
  const {
    gallery,
    entrance = 1,
    galleryOpacity = 1,
    paused = false,
    dt = 0,
    count = previous?.count ?? 5,
    inGallery = true,
  } = sample;
  const cardCount = normalizeCount(count);
  const delta = Number.isFinite(dt) ? clamp(dt, 0, CAT_MOTION.maxDt) : 0;
  const eligible = inGallery && cardCount > 0
    && Number.isFinite(gallery) && gallery >= 0 && gallery <= 1
    && Number.isFinite(entrance) && entrance >= CAT_MOTION.entranceThreshold
    && Number.isFinite(galleryOpacity) && galleryOpacity >= CAT_MOTION.opacityThreshold;

  if (!eligible) return createCatMotionState(cardCount);

  const next = !previous || previous.count !== cardCount
    ? createCatMotionState(cardCount)
    : { ...previous };
  const coordinate = gallery * (cardCount - 1);
  const nearest = Math.round(coordinate);
  const target = Math.abs(coordinate - nearest) <= CAT_MOTION.frontThreshold + EPSILON
    ? nearest : null;

  if (target === null || target === next.cardIndex) {
    next.candidateIndex = null;
    next.candidateTime = 0;
  } else if (target !== next.candidateIndex) {
    next.candidateIndex = target;
    // Do not credit time from before this target was first observed.
    next.candidateTime = 0;
  } else if (!paused) {
    next.candidateTime += delta;
  }

  if (paused) return next;

  if (next.candidateIndex !== null
    && next.candidateTime + EPSILON >= CAT_MOTION.settleDuration) {
    next.cardIndex = next.candidateIndex;
    next.candidateIndex = null;
    next.candidateTime = 0;
    next.phase = 'jump';
    next.elapsed = 0;
    return next;
  }

  if (next.phase === 'jump') {
    const duration = CAT_MOTION.launchHold + CAT_MOTION.jumpDuration;
    next.elapsed += delta;
    if (next.elapsed + EPSILON >= duration) {
      const remainder = Math.max(0, next.elapsed - duration);
      const finalCard = next.cardIndex === cardCount - 1;
      next.phase = finalCard ? 'sit' : 'walk';
      next.elapsed = finalCard ? 0 : remainder;
    }
  } else if (next.phase === 'walk') {
    next.elapsed += delta;
  }

  if (next.phase === 'walk' && next.elapsed + EPSILON >= CAT_MOTION.walkDuration) {
    next.phase = 'wait';
    next.elapsed = 0;
  }
  return next;
}

/**
 * `localX` is a card-width fraction in [0, 1], starting above the right edge.
 * `jumpHeight` is a normalized upward offset: about 1 at launch, 0 at landing.
 * Renderer chooses the pixel height. Frames: 0–3 walk, 4 crouch, 5 airborne,
 * 6 side-on wait, 7 front-facing sit. `progress` belongs to the current phase.
 */
export function catMotionSnapshot(state) {
  const { cardIndex, phase, elapsed, count } = state;
  const result = {
    cardIndex,
    phase,
    progress: 0,
    visible: phase !== 'hidden',
    localX: CAT_MOTION.rightX,
    jumpHeight: 0,
    pose: 'hidden',
    frame: 6,
  };

  if (phase === 'jump') {
    const progress = clamp((elapsed - CAT_MOTION.launchHold) / CAT_MOTION.jumpDuration);
    const landingX = cardIndex === count - 1 ? CAT_MOTION.finalX : CAT_MOTION.rightX;
    result.progress = progress;
    result.localX = CAT_MOTION.startX + (landingX - CAT_MOTION.startX) * smooth(progress);
    result.jumpHeight = 1 - smooth(progress) + Math.sin(progress * Math.PI) * 0.22;
    result.pose = elapsed < CAT_MOTION.launchHold ? 'crouch' : 'airborne';
    result.frame = result.pose === 'crouch' ? 4 : 5;
  } else if (phase === 'walk') {
    result.progress = clamp(elapsed / CAT_MOTION.walkDuration);
    result.localX = CAT_MOTION.rightX + (CAT_MOTION.leftX - CAT_MOTION.rightX) * result.progress;
    result.pose = 'walk';
    result.frame = Math.floor(elapsed / 0.14) % 4;
  } else if (phase === 'wait' || phase === 'sit') {
    result.progress = 1;
    result.localX = phase === 'sit' ? CAT_MOTION.finalX : CAT_MOTION.leftX;
    result.pose = phase;
    result.frame = phase === 'sit' ? 7 : 6;
  }
  return result;
}

/** Small stateful adapter around the exported pure transition/snapshot. */
export function createCatMotion() {
  let state = createCatMotionState();
  return {
    update(sample) {
      state = stepCatMotion(state, sample);
      return catMotionSnapshot(state);
    },
    reset() {
      state = createCatMotionState(state.count);
      return catMotionSnapshot(state);
    },
  };
}
