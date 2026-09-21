export const GALLERY_START = 0.22;
export const GALLERY_END = 0.91;
export const CARD_COUNT = 5;
export const TREE_HEIGHT = 82;
export const TRUNK_BOTTOM = -35;
export const TRUNK_RADIUS = 4.3;
export const ORBIT_RADIUS = 7.8;
const CARD_STEP = 1.68;
const TOP_CARD_Y = 32;
const CARD_DROP = 3.1;
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };

export function sceneAt(progress, mobile = false) {
  const p = clamp(progress);
  const entrance = smooth((p - 0.055) / 0.165);
  const gallery = clamp((p - GALLERY_START) / (GALLERY_END - GALLERY_START));
  return {
    entrance,
    gallery,
    orbitRadius: ORBIT_RADIUS * (mobile ? 0.76 : 1),
    rotation: gallery * (CARD_COUNT - 1) * CARD_STEP,
    treeRotation: gallery * (CARD_COUNT - 1) * CARD_STEP * 0.82,
    cameraY: mix(40, TOP_CARD_Y - gallery * (CARD_COUNT - 1) * CARD_DROP, entrance),
    distance: mix(mobile ? 54 : 42, mobile ? 31 : 24, entrance),
    treeX: 0,
    activeIndex: Math.round(gallery * (CARD_COUNT - 1)),
    heroOpacity: 1 - smooth(p / 0.115),
    galleryOpacity: smooth((p - 0.13) / 0.075),
  };
}

export function cardAt(index, state) {
  const theta = state.rotation - index * CARD_STEP - 0.32;
  const radius = state.orbitRadius;
  return {
    x: Math.sin(theta) * radius,
    y: TOP_CARD_Y - index * CARD_DROP,
    z: Math.cos(theta) * radius,
    // Keep the back of the helix legible instead of mirroring the text.
    yaw: Math.atan2(Math.sin(theta), Math.abs(Math.cos(theta))) * 0.58,
  };
}

/** One world and one optical axis for the tree, paper cards and camera descent. */
export function layoutAt(state, width, height) {
  const mobile = width < 700;
  const focal = height / (2 * Math.tan(36 * Math.PI / 360));
  const establishingUnit = Math.min(focal / state.distance, width / (mobile ? 14.5 : 24));
  const closeUpUnit = Math.min(focal / 18, width / (mobile ? 14.5 : 18));
  const unit = mix(establishingUnit, closeUpUnit, state.entrance);
  const axisX = width * (mobile ? 0.66 : 0.67);
  const originY = height * 0.52;
  return {
    focal, unit, axisX, originY,
    rootY: originY + (state.cameraY - TRUNK_BOTTOM) * unit,
    treeHeight: TREE_HEIGHT * unit,
    cardScale: mobile ? width / 560 : Math.min(unit / 68, 1.05),
  };
}

export function progressForCard(index) {
  return GALLERY_START + clamp(index, 0, CARD_COUNT - 1) / (CARD_COUNT - 1) * (GALLERY_END - GALLERY_START);
}
