import { createCatMotion } from './catMotion';
import { publicUrl } from '../publicUrl.js';
import './CatCompanion.css';

const ATLAS = publicUrl('/assets/storybook/pastel-cat-atlas.png');
// Paw baselines measured in each equal atlas cell, keeping every pose grounded.
const PAW_BASELINES = [0.866, 0.864, 0.839, 0.857, 0.798, 0.877, 0.800, 0.834];

/** The cat shares its card's 3D transform, so resizing never separates its paws. */
export function mountCatCompanion(cards) {
  const motion = createCatMotion();
  let ready = false;
  let disposed = false;
  let activeIndex = null;
  let headerHeight = document.querySelector('header')?.getBoundingClientRect().height || 0;
  const mounts = cards.map((card) => {
    const root = document.createElement('span');
    root.className = 'tree-cat';
    root.setAttribute('aria-hidden', 'true');
    const shadow = document.createElement('span');
    shadow.className = 'tree-cat-shadow';
    const pose = document.createElement('span');
    pose.className = 'tree-cat-pose';
    root.append(shadow, pose);
    card.append(root);
    return { root, pose, shadow, width: card.offsetWidth, size: 0 };
  });
  const image = new Image();
  image.onload = () => { if (!disposed) ready = true; };
  image.onerror = () => { ready = false; };
  image.src = ATLAS;

  const hide = () => {
    if (activeIndex !== null) mounts[activeIndex]?.root.style.setProperty('visibility', 'hidden');
    activeIndex = null;
  };

  return {
    resize() {
      headerHeight = document.querySelector('header')?.getBoundingClientRect().height || 0;
      cards.forEach((card, i) => { mounts[i].width = card.offsetWidth; mounts[i].size = 0; });
    },
    update({ state, dt, paused, elapsed }) {
      if (disposed || !ready) return;
      const sample = motion.update({ ...state, dt, paused, count: cards.length });
      if (!sample.visible) { hide(); return; }
      const newCard = activeIndex !== sample.cardIndex;
      if (newCard) hide();
      activeIndex = sample.cardIndex;
      const { root, pose, shadow, width } = mounts[activeIndex];
      if (newCard || !mounts[activeIndex].size) {
        const rect = cards[activeIndex].getBoundingClientRect();
        const projectedScale = Math.max(0.3, rect.width / width);
        const headroom = Math.max(0, rect.top - headerHeight - 14) / projectedScale;
        // Reserve the whole airborne silhouette plus its arc below the header.
        mounts[activeIndex].size = Math.max(width * 0.16, Math.min(width * 0.28, headroom / 1.3));
      }
      const size = mounts[activeIndex].size;
      const x = width * sample.localX;
      const y = -sample.jumpHeight * size * 0.4 - 1;
      const walkBob = sample.phase === 'walk' ? Math.sin(sample.progress * Math.PI * 16) * 0.7 : 0;
      const resting = sample.phase === 'sit' || sample.phase === 'wait';
      const breathe = resting ? 1 + Math.sin(elapsed * 1.7) * 0.008 : 1;
      const landing = sample.phase === 'walk' && sample.progress < 0.09
        ? 0.92 + sample.progress / 0.09 * 0.08 : 1;
      const rotation = sample.pose === 'airborne' ? -5 * Math.sin(sample.progress * Math.PI) : 0;
      root.style.visibility = 'visible';
      root.style.transform = `translate3d(${x}px,${y + walkBob}px,2px)`;
      root.dataset.phase = sample.phase;
      root.dataset.frame = sample.frame;
      root.dataset.cardIndex = activeIndex;
      pose.style.backgroundPosition = `${sample.frame % 4 / 3 * 100}% ${Math.floor(sample.frame / 4) * 100}%`;
      pose.style.transformOrigin = `50% ${PAW_BASELINES[sample.frame] * 100}%`;
      pose.style.transform = `translate(-50%,${-PAW_BASELINES[sample.frame] * 100}%) rotate(${rotation}deg) scaleY(${breathe * landing})`;
      root.style.setProperty('--cat-size', `${size}px`);
      shadow.style.opacity = `${0.25 * (1 - sample.jumpHeight * 0.85)}`;
      shadow.style.transform = `translate(-50%,${-y}px) scaleX(${sample.phase === 'sit' ? 0.55 : 1})`;
    },
    reset() { motion.reset(); hide(); },
    dispose() {
      disposed = true;
      image.onload = image.onerror = null;
      mounts.forEach(({ root }) => root.remove());
    },
  };
}
