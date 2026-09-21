import { cardAt, sceneAt, layoutAt, mix, clamp, smooth } from './treeMotion';
import { publicUrl } from '../publicUrl.js';

const CAMERA_FOV = 36;
const TREE_SOURCE = publicUrl('/assets/storybook/starry-tree-scroll.png');

/** Read the asset's empty margin once; the canvas is never displayed or retained. */
function alphaHeightOf(image) {
  const canvas = document.createElement('canvas');
  const sampleScale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * sampleScale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * sampleScale));
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return { top: 0, bottom: 1 };
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let top = canvas.height;
    let bottom = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 24) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
          break;
        }
      }
    }
    return bottom >= top
      ? { top: top / canvas.height, bottom: (bottom + 1) / canvas.height }
      : { top: 0, bottom: 1 };
  } catch {
    // Keep the gallery usable if this browser denies pixel access.
    return { top: 0, bottom: 1 };
  } finally {
    canvas.width = 1;
    canvas.height = 1;
  }
}

function rememberStyles(element, names) {
  const values = names.map((name) => [
    name,
    element.style.getPropertyValue(name),
    element.style.getPropertyPriority(name),
  ]);
  return () => {
    for (const [name, value, priority] of values) {
      if (value) element.style.setProperty(name, value, priority);
      else element.style.removeProperty(name);
    }
  };
}

/**
 * A painted paper layer and HTML cards share the original gallery projection.
 * The illustration sways slightly; it never impersonates a rotating 3D model.
 */
export function mountStorybookRenderer({
  host,
  slots,
  cards,
  progress,
  reducedMotion,
  onError,
  onReady,
}) {
  let disposed = false;
  let failed = false;
  let ready = false;
  let inView = true;
  let width = 0;
  let height = 0;
  let focal = 1;
  let imageRatio = 1;
  let alphaBounds = { top: 0, bottom: 1 };
  let animationFrame = 0;
  let lastTime = null;
  let elapsed = 0;
  let lastProgress = NaN;
  let lastPaused = null;
  let dirty = true;

  const pairs = Array.from(cards).map((card, index) => ({ card, slot: slots[index], index }))
    .filter(({ slot }) => slot);
  const restorers = [];
  for (const { slot, card } of pairs) {
    restorers.push(rememberStyles(slot, ['perspective', 'perspective-origin', 'z-index']));
    restorers.push(rememberStyles(card, [
      'transform', 'opacity', 'filter', 'visibility', 'pointer-events', 'left', 'top',
    ]));
    const originalTabIndex = card.getAttribute('tabindex');
    restorers.push(() => {
      if (originalTabIndex === null) card.removeAttribute('tabindex');
      else card.setAttribute('tabindex', originalTabIndex);
    });
  }

  const paperLayer = document.createElement('div');
  paperLayer.className = 'storybook-tree-layer';
  paperLayer.setAttribute('aria-hidden', 'true');
  Object.assign(paperLayer.style, {
    position: 'absolute',
    inset: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    perspectiveOrigin: '50% 50%',
  });

  const image = document.createElement('img');
  image.className = 'storybook-tree-cutout';
  image.alt = '';
  image.draggable = false;
  image.decoding = 'async';
  image.setAttribute('aria-hidden', 'true');
  Object.assign(image.style, {
    position: 'absolute',
    display: 'block',
    left: '0',
    top: '0',
    maxWidth: 'none',
    opacity: '0',
    visibility: 'hidden',
    pointerEvents: 'none',
    transformOrigin: '50% 100%',
    backfaceVisibility: 'hidden',
    willChange: 'transform, opacity',
    userSelect: 'none',
  });
  paperLayer.appendChild(image);
  host.appendChild(paperLayer);

  function stop() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    lastTime = null;
  }

  function wake() {
    if (disposed || failed || !inView || document.hidden || !width || !height) return;
    if (!animationFrame) animationFrame = requestAnimationFrame(draw);
  }

  function resize() {
    if (disposed) return;
    width = host.clientWidth;
    height = host.clientHeight;
    if (!width || !height) {
      stop();
      return;
    }
    focal = height / (2 * Math.tan(CAMERA_FOV * Math.PI / 360));
    for (const { slot } of pairs) slot.style.perspective = `${focal}px`;
    paperLayer.style.perspective = `${focal}px`;
    dirty = true;
    wake();
  }

  function draw(now) {
    animationFrame = 0;
    if (disposed || failed || !inView || document.hidden || !width || !height) {
      lastTime = null;
      return;
    }
    const currentProgress = Number.isFinite(progress.current) ? progress.current : 0;
    const paused = Boolean(reducedMotion.current);
    const changed = dirty || currentProgress !== lastProgress || paused !== lastPaused;
    const frameInterval = width < 700 ? 28 : 16;
    if (!changed && lastTime !== null && now - lastTime < frameInterval) {
      wake();
      return;
    }
    const delta = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    if (!paused) elapsed += delta;
    if (paused && !changed) {
      wake();
      return;
    }

    const state = sceneAt(currentProgress, width < 700);
    const layout = layoutAt(state, width, height);
    const { unit, axisX, originY } = layout;
    lastProgress = currentProgress;
    lastPaused = paused;
    dirty = false;

    if (ready) {
      // Roots stay at world y=0. Scrolling lowers the camera, revealing the
      // same continuous trunk; no independently screen-pinned tree layer.
      const drawnHeight = layout.treeHeight / (alphaBounds.bottom - alphaBounds.top);
      const drawnWidth = drawnHeight * imageRatio;
      const yaw = Math.sin(elapsed * 0.19) * 0.6;
      const opacity = state.heroOpacity > 0.01 ? 0 : smooth((state.entrance - 0.2) / 0.8);
      image.style.width = `${drawnWidth}px`;
      image.style.height = `${drawnHeight}px`;
      image.style.transform = `translate3d(${axisX - drawnWidth / 2}px,${layout.rootY - drawnHeight * alphaBounds.bottom}px,0) rotateY(${yaw}deg)`;
      image.style.opacity = `${opacity}`;
      image.style.visibility = opacity > 0.001 ? 'visible' : 'hidden';
    }

    pairs.forEach(({ slot, card, index }) => {
      const position = cardAt(index, state);
      const y = (position.y - state.cameraY) * unit;
      const focus = 1 - smooth(Math.abs(index - state.gallery * (pairs.length - 1)));
      const scale = layout.cardScale * mix(width < 700 ? 0.68 : 0.88, 1, focus);
      const verticalFade = width < 700 ? smooth((height * 0.24 - Math.abs(y)) / (height * 0.12)) : 1;
      const visible = state.galleryOpacity > 0.02 && verticalFade > 0.02 && Math.abs(y) < height * 0.85;
      slot.style.perspectiveOrigin = `${axisX}px ${originY}px`;
      card.style.left = `${axisX}px`;
      card.style.top = `${originY}px`;
      slot.style.zIndex = position.z >= 0
        ? `${200 + Math.round(position.z * 10)}`
        : `${40 + Math.round(position.z * 3)}`;
      card.style.transform = `translate3d(${position.x * unit}px,${-y}px,${position.z * unit}px) rotateY(${position.yaw}rad) rotateZ(${Math.sin(index * 2.4) * 1.4}deg) scale(${scale})`;
      card.style.opacity = visible
        ? `${state.galleryOpacity * verticalFade * mix(0.66, 1, clamp((position.z + 4) / 8))}`
        : '0';
      card.style.filter = `brightness(${mix(0.72, 1, clamp((position.z + 3) / 6))})`;
      card.style.visibility = visible ? 'visible' : 'hidden';
      card.tabIndex = visible && index === state.activeIndex ? 0 : -1;
      card.style.pointerEvents = visible && position.z > 0 ? 'auto' : 'none';
    });
    wake();
  }

  function loaded() {
    if (disposed || failed || ready) return;
    if (!image.naturalWidth || !image.naturalHeight) {
      loadFailed();
      return;
    }
    imageRatio = image.naturalWidth / image.naturalHeight;
    alphaBounds = alphaHeightOf(image);
    image.width = image.naturalWidth;
    image.height = image.naturalHeight;
    image.style.transformOrigin = `50% ${alphaBounds.bottom * 100}%`;
    ready = true;
    dirty = true;
    wake();
    onReady?.();
  }

  function loadFailed() {
    if (disposed || failed) return;
    failed = true;
    image.style.visibility = 'hidden';
    stop();
    onError?.();
  }

  function visibilityChanged() {
    if (document.hidden) stop();
    else {
      dirty = true;
      wake();
    }
  }

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    if (disposed || !entry) return;
    inView = entry.isIntersecting;
    if (inView) {
      dirty = true;
      wake();
    } else stop();
  });
  image.addEventListener('load', loaded);
  image.addEventListener('error', loadFailed);
  document.addEventListener('visibilitychange', visibilityChanged);
  resizeObserver.observe(host);
  intersectionObserver.observe(host);
  resize();
  image.src = TREE_SOURCE;
  if (image.complete && image.naturalWidth) loaded();

  return function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', visibilityChanged);
    image.removeEventListener('load', loaded);
    image.removeEventListener('error', loadFailed);
    image.removeAttribute('src');
    paperLayer.remove();
    for (const restore of restorers) restore();
  };
}

export default mountStorybookRenderer;
