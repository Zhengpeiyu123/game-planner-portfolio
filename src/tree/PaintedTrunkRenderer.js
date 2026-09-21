import * as THREE from 'three';
import { publicUrl } from '../publicUrl.js';
import { createPaintedTrunk } from './createPaintedTrunk';
import { cardAt, sceneAt, layoutAt, mix, clamp, smooth } from './treeMotion';
import { mountCatCompanion } from './CatCompanion';

/** A real rotating volume, painted rather than shiny; HTML stays accessible. */
export function mountStorybookRenderer({ host, slots, cards, progress, reducedMotion, onError }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    onError?.();
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'painted-trunk-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 180);
  const world = new THREE.Group();
  scene.add(world);
  scene.add(new THREE.HemisphereLight(0xffe6cd, 0x2c3650, 2.0));
  const key = new THREE.DirectionalLight(0xffdbb7, 1.3);
  key.position.set(-12, 35, 18);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9baee2, 0.7);
  fill.position.set(12, 20, 8);
  scene.add(fill);

  let disposed = false, failed = false, inView = true, ready = false;
  let width = 0, height = 0, frame = 0, lastTime = null, elapsed = 0;
  let lastProgress = NaN, lastPaused = null, dirty = true;
  let trunk, bark, canopy, crownGeometry, crownMaterial;
  const pairs = Array.from(cards).map((card, index) => ({ card, slot: slots[index], index }));
  const cat = mountCatCompanion(Array.from(cards));
  const saved = pairs.map(({ card, slot }) => ({
    cardStyle: card.getAttribute('style'), slotStyle: slot.getAttribute('style'), tab: card.getAttribute('tabindex'),
  }));

  const stop = () => { cancelAnimationFrame(frame); frame = 0; lastTime = null; };
  const wake = () => {
    if (!disposed && !failed && inView && !document.hidden && width && height && !frame) frame = requestAnimationFrame(draw);
  };
  const fail = () => { if (disposed || failed) return; failed = true; stop(); onError?.(); };
  const resize = () => {
    width = host.clientWidth;
    height = host.clientHeight;
    if (!width || !height) { stop(); return; }
    renderer.setSize(width, height);
    for (const { card } of pairs) card.style.marginTop = `${-card.offsetHeight / 2}px`;
    cat.resize();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    dirty = true;
    wake();
  };

  function draw(now) {
    frame = 0;
    if (disposed || failed || !inView || document.hidden || !width || !height) return;
    const p = Number.isFinite(progress.current) ? progress.current : 0;
    const paused = Boolean(reducedMotion.current);
    const changed = dirty || p !== lastProgress || paused !== lastPaused;
    if (!changed && ((paused && ready) || (lastTime !== null && now - lastTime < (width < 700 ? 28 : 16)))) { wake(); return; }
    const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    if (!paused) elapsed += dt;
    lastProgress = p;
    lastPaused = paused;
    dirty = false;
    const state = sceneAt(p, width < 700);
    const layout = layoutAt(state, width, height);
    const { focal, unit, axisX, originY } = layout;
    // Off-axis projection matches the DOM's perspective-origin exactly.
    camera.position.set(0, state.cameraY, focal / unit);
    camera.lookAt(0, state.cameraY, 0);
    camera.projectionMatrix.elements[8] = 1 - 2 * axisX / width;
    camera.projectionMatrix.elements[9] = 2 * originY / height - 1;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    world.rotation.y = state.treeRotation + Math.sin(elapsed * 0.15) * 0.012;
    renderer.domElement.style.opacity = `${smooth((state.entrance - 0.12) / 0.75)}`;
    renderer.domElement.dataset.rotation = state.treeRotation.toFixed(4);
    renderer.domElement.dataset.cameraY = state.cameraY.toFixed(3);
    if (ready) renderer.render(scene, camera);

    for (const { slot, card, index } of pairs) {
      const position = cardAt(index, state);
      const y = (position.y - state.cameraY) * unit;
      const focus = 1 - smooth(Math.abs(index - state.gallery * (pairs.length - 1)));
      const scale = layout.cardScale * mix(width < 700 ? 0.62 : 0.85, 1, focus) * (index === pairs.length - 1 ? 0.86 : 1);
      const verticalFade = width < 700 ? smooth((height * 0.26 - Math.abs(y)) / (height * 0.13)) : 1;
      const visible = state.galleryOpacity > 0.02 && verticalFade > 0.02 && Math.abs(y) < height * 0.85;
      slot.style.perspective = `${focal}px`;
      slot.style.perspectiveOrigin = `${axisX}px ${originY}px`;
      slot.style.zIndex = position.z >= 0 ? `${200 + Math.round(position.z * 10)}` : `${40 + Math.round(position.z * 3)}`;
      card.style.left = `${axisX}px`;
      card.style.top = `${originY}px`;
      card.style.transform = `translate3d(${position.x * unit}px,${-y}px,${position.z * unit}px) rotateY(${position.yaw}rad) rotateZ(${Math.sin(index * 2.4) * 1.2}deg) scale(${scale})`;
      card.style.opacity = visible ? `${state.galleryOpacity * verticalFade * mix(0.7, 1, clamp((position.z + 4) / 8))}` : '0';
      card.style.filter = `brightness(${mix(0.7, 1, clamp((position.z + 3) / 6))})`;
      card.style.visibility = visible ? 'visible' : 'hidden';
      card.style.pointerEvents = visible && position.z > 0 ? 'auto' : 'none';
      card.tabIndex = visible && index === state.activeIndex ? 0 : -1;
    }
    cat.update({ state, dt, paused, elapsed });
    wake();
  }

  const loader = new THREE.TextureLoader();
  bark = loader.load(publicUrl('/assets/storybook/pastel-bark-wrap.png'), (texture) => {
    if (disposed) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
    texture.repeat.x = 2;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    trunk = createPaintedTrunk(texture);
    world.add(trunk.group);
    ready = true;
    dirty = true;
    wake();
  }, undefined, fail);
  canopy = loader.load(publicUrl('/assets/storybook/starry-tree.png'), (texture) => {
    if (disposed) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace;
    // UV framing uses only the painted foliage/branches, never the old roots.
    crownGeometry = new THREE.PlaneGeometry(35, 24.5);
    const uv = crownGeometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 0.3 + uv.getY(i) * 0.7);
    crownMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, depthWrite: true });
    crownMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
        '#include <map_fragment>\n diffuseColor.a *= smoothstep(0.30, 0.46, vMapUv.y);');
    };
    for (const angle of [0, Math.PI / 3, -Math.PI / 3]) {
      const layer = new THREE.Mesh(crownGeometry, crownMaterial);
      layer.position.y = 48.5;
      layer.rotation.y = angle;
      world.add(layer);
    }
    dirty = true;
    wake();
  }, undefined, fail);
  const resized = new ResizeObserver(resize);
  const intersection = new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? false;
    if (inView) { dirty = true; wake(); } else { stop(); cat.reset(); }
  });
  const visibility = () => { if (document.hidden) stop(); else { dirty = true; wake(); } };
  const contextLost = (event) => { event.preventDefault(); fail(); };
  resized.observe(host);
  intersection.observe(host);
  document.addEventListener('visibilitychange', visibility);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  resize();

  return () => {
    disposed = true;
    stop();
    resized.disconnect();
    intersection.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    trunk?.dispose();
    bark?.dispose(); canopy?.dispose(); crownGeometry?.dispose(); crownMaterial?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    cat.dispose();
    pairs.forEach(({ card, slot }, i) => {
      for (const [element, attr, value] of [[card, 'style', saved[i].cardStyle], [slot, 'style', saved[i].slotStyle], [card, 'tabindex', saved[i].tab]]) {
        if (value === null) element.removeAttribute(attr); else element.setAttribute(attr, value);
      }
    });
  };
}
