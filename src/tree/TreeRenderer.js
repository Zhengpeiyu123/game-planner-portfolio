import * as THREE from 'three';
import { createPortfolioTree } from './createPortfolioTree';
import { cardAt, sceneAt, mix, clamp } from './treeMotion';

/** One projection is shared by WebGL and the accessible HTML cards. */
export function mountTreeRenderer({ host, slots, cards, progress, reducedMotion, onError }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    onError();
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 110);
  const tree = createPortfolioTree();
  scene.add(tree.group);
  scene.add(new THREE.HemisphereLight(0xd1e3de, 0x263247, 2.3));
  const warm = new THREE.DirectionalLight(0xffddb0, 4.0);
  warm.position.set(-8, 14, 12);
  scene.add(warm);
  const rim = new THREE.DirectionalLight(0x88b8b4, 3.0);
  rim.position.set(7, 12, -6);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffbd6f, 1.5);
  fill.position.set(4, 2, 7);
  scene.add(fill);

  // Tiny world-space motes give depth without a background image or video.
  const positions = new Float32Array(120 * 3);
  for (let i = 0; i < 120; i++) {
    positions[i * 3] = Math.sin(i * 78.233) * 10;
    positions[i * 3 + 1] = (i * 0.7917) % 19;
    positions[i * 3 + 2] = Math.cos(i * 43.13) * 7 - 4;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dustMaterial = new THREE.PointsMaterial({ color: 0xeadbb0, size: 0.035, transparent: true, opacity: 0.48, depthWrite: false });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(dust);

  let width = 1, height = 1, focal = 1, inView = true, disposed = false;
  let animationFrame = 0, lastTime = -100, elapsed = 0, lastProgress = -1, dirty = true;
  const resize = () => {
    width = host.clientWidth;
    height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    focal = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    slots.forEach((slot) => { slot.style.perspective = `${focal}px`; });
    dirty = true;
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const wake = () => {
    if (!disposed && inView && !document.hidden && !animationFrame) {
      lastTime = -100;
      animationFrame = requestAnimationFrame(draw);
    }
  };
  const intersection = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; wake(); });
  intersection.observe(host);
  document.addEventListener('visibilitychange', wake);
  const lost = (event) => { event.preventDefault(); onError(); };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  resize();

  const draw = (now) => {
    animationFrame = 0;
    if (disposed || !inView || document.hidden) return;
    animationFrame = requestAnimationFrame(draw);
    if (now - lastTime < (width < 700 ? 28 : 14) || (reducedMotion.current && lastProgress === progress.current && !dirty)) return;
    const dt = lastTime < 0 ? 0 : Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    if (!reducedMotion.current) elapsed += dt;
    const state = sceneAt(progress.current, width < 700);
    lastProgress = progress.current;
    dirty = false;
    const unit = focal / state.distance;
    camera.position.set(0, state.cameraY, state.distance);
    camera.lookAt(0, state.cameraY, 0);
    tree.group.position.x = state.treeX;
    tree.group.rotation.y = state.rotation * 0.72 + Math.sin(elapsed * 0.15) * 0.18 + elapsed * 0.022;
    tree.update(elapsed, reducedMotion.current);
    dust.rotation.y = elapsed * 0.014;

    cards.forEach((card, index) => {
      const position = cardAt(index, state);
      const y = (position.y - state.cameraY) * unit;
      const scale = unit / 50 * (width < 700 ? 0.79 : 1);
      const visible = state.galleryOpacity > 0.02 && Math.abs(y) < height * 0.84;
      slots[index].style.zIndex = position.z > 0.35 ? `${200 + Math.round(position.z * 10)}` : `${40 + Math.round(position.z * 3)}`;
      card.style.transform = `translate3d(${(position.x + state.treeX) * unit}px,${-y}px,${position.z * unit}px) rotateY(${position.yaw}rad) scale(${scale})`;
      card.style.opacity = visible ? state.galleryOpacity * mix(0.25, 1, clamp((position.z + 4) / 8)) : 0;
      card.style.filter = `brightness(${mix(0.45, 1, clamp((position.z + 3) / 6))})`;
      card.style.visibility = visible ? 'visible' : 'hidden';
      // Offscreen/back-facing links remain available in the persistent index.
      card.tabIndex = visible && index === state.activeIndex ? 0 : -1;
      card.style.pointerEvents = visible && position.z > 0 ? 'auto' : 'none';
    });
    renderer.render(scene, camera);
  };
  animationFrame = requestAnimationFrame(draw);
  return () => {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    intersection.disconnect();
    document.removeEventListener('visibilitychange', wake);
    renderer.domElement.removeEventListener('webglcontextlost', lost);
    tree.dispose();
    dustGeometry.dispose();
    dustMaterial.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
