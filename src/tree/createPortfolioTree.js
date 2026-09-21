import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function curveThrough(points) {
  return new THREE.CatmullRomCurve3(points, false, "centripetal");
}

/** A tapered, gently fluted tube, including closed end caps and wood-tone vertices. */
function carvedTube(curve, radiusAt, {
  segments = 32,
  sides = 10,
  color = 0x886344,
  flute = 0.06,
  phase = 0,
} = {}) {
  const frames = curve.computeFrenetFrames(segments, false);
  const positions = [];
  const colors = [];
  const indices = [];
  const base = new THREE.Color(color);
  const ringSize = sides + 1;

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const center = curve.getPointAt(t);
    const radius = Math.max(0.001, radiusAt(t));
    for (let j = 0; j <= sides; j += 1) {
      const angle = j / sides * TAU;
      const grain = Math.cos(angle * 5 + phase + t * 2.7);
      const ripple = 1 + flute * grain + flute * 0.22 * Math.sin(angle * 9 - t * 4);
      const offset = frames.normals[i].clone().multiplyScalar(Math.cos(angle))
        .addScaledVector(frames.binormals[i], Math.sin(angle))
        .multiplyScalar(radius * ripple);
      const point = center.clone().add(offset);
      positions.push(point.x, point.y, point.z);
      const shade = 0.81 + 0.14 * (grain * 0.5 + 0.5) + 0.11 * Math.cos(angle - 0.7);
      colors.push(base.r * shade, base.g * shade, base.b * shade);
      if (i < segments && j < sides) {
        const a = i * ringSize + j;
        const b = a + ringSize;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }

  for (const end of [0, segments]) {
    const point = curve.getPointAt(end / segments);
    const cap = positions.length / 3;
    positions.push(point.x, point.y, point.z);
    colors.push(base.r * 0.75, base.g * 0.75, base.b * 0.75);
    for (let j = 0; j < sides; j += 1) {
      const a = end * ringSize + j;
      if (end === 0) indices.push(cap, a + 1, a);
      else indices.push(cap, a, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A lance-shaped leaf with a raised midrib and gently curled tip. */
function createLeafGeometry() {
  const outline = [
    [0, 0, 0], [-0.07, 0.12, 0.018], [-0.135, 0.35, 0.039],
    [-0.12, 0.61, 0.027], [-0.055, 0.87, 0], [0, 1, -0.045],
    [0.055, 0.88, 0], [0.12, 0.65, 0.025], [0.135, 0.4, 0.04],
    [0.07, 0.15, 0.018],
  ];
  const positions = [0, 0.49, 0.085, ...outline.flat()];
  const colors = [1.08, 1.08, 0.94];
  const indices = [];
  for (let i = 0; i < outline.length; i += 1) {
    const edge = i === 5 ? 1.12 : (i < 5 ? 0.88 : 1.04);
    colors.push(edge, edge, edge * 0.94);
    indices.push(0, (i + 1) % outline.length + 1, i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createStarGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const angle = Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 === 0 ? 1 : 0.43;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.028,
    bevelThickness: 0.025,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -0.045);
  return geometry;
}

/**
 * Build a self-contained sculpture. No DOM, renderer, lighting, or animation loop.
 * Time passed to update is measured in seconds. The returned group is safe to rotate.
 */
export function createPortfolioTree() {
  const random = seededRandom(2050921);
  const group = new THREE.Group();
  group.name = "portfolio-tree";
  const sculpture = new THREE.Group();
  sculpture.name = "tree-sculpture";
  group.add(sculpture);

  const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.5,
    metalness: 0.15,
  });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.72,
    metalness: 0.045,
    side: THREE.DoubleSide,
  });
  const goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xe7be68,
    emissive: 0xd28c32,
    emissiveIntensity: 0.5,
    metalness: 0.58,
    roughness: 0.31,
  });
  const cordMaterial = new THREE.MeshStandardMaterial({
    color: 0xb09562,
    roughness: 0.66,
    metalness: 0.3,
  });

  const woodParts = [];
  const leafPlacements = [];
  const mainBranches = [];
  const spine = curveThrough([
    new THREE.Vector3(0, 0.24, 0),
    new THREE.Vector3(0.46, 1.45, -0.07),
    new THREE.Vector3(1.04, 2.85, 0.1),
    new THREE.Vector3(0.26, 4.45, 0.07),
    new THREE.Vector3(-1.05, 6.0, -0.15),
    new THREE.Vector3(-0.69, 7.5, 0.04),
    new THREE.Vector3(0.54, 9.0, 0.16),
    new THREE.Vector3(0.12, 10.55, 0),
    new THREE.Vector3(-0.35, 12.05, 0.08),
  ]);

  // Three intertwined sweeps describe the silhouette; fine raised ribbons catch light.
  for (let strand = 0; strand < 3; strand += 1) {
    const phase = strand / 3 * TAU;
    const points = [];
    for (let i = 0; i <= 48; i += 1) {
      const t = i / 48;
      const point = spine.getPoint(t);
      const orbit = 0.21 + 0.1 * Math.sin(t * Math.PI) - 0.065 * t;
      const angle = phase + t * 7.1;
      point.x += Math.cos(angle) * orbit;
      point.z += Math.sin(angle) * orbit;
      points.push(point);
    }
    const strandCurve = curveThrough(points);
    const radiusAt = (t) => 0.17 + 0.29 * Math.pow(1 - t, 0.72);
    woodParts.push(carvedTube(strandCurve, radiusAt, {
      segments: 100,
      sides: 18,
      color: [0x906547, 0x75503a, 0xa47750][strand],
      flute: 0.095,
      phase,
    }));

    const frames = strandCurve.computeFrenetFrames(70, false);
    for (let line = 0; line < 5; line += 1) {
      const ridgePoints = [];
      for (let i = 0; i <= 70; i += 1) {
        const t = i / 70;
        const angle = line / 5 * TAU - (phase + t * 2.7) / 5;
        const point = strandCurve.getPointAt(t);
        point.addScaledVector(frames.normals[i], Math.cos(angle) * radiusAt(t) * 1.072);
        point.addScaledVector(frames.binormals[i], Math.sin(angle) * radiusAt(t) * 1.072);
        ridgePoints.push(point);
      }
      woodParts.push(carvedTube(curveThrough(ridgePoints), (t) => 0.01 + 0.013 * (1 - t), {
        segments: 68,
        sides: 4,
        flute: 0,
        color: line % 2 ? 0xa68154 : 0xc09661,
      }));
    }
  }

  // Roots curl and taper along the ground instead of ending in a circular pedestal.
  for (let i = 0; i < 9; i += 1) {
    const angle = i / 9 * TAU + (random() - 0.5) * 0.27;
    const length = 2.15 + random() * 0.9;
    const bend = (i % 2 ? 1 : -1) * (0.26 + random() * 0.24);
    const rootCurve = curveThrough([
      new THREE.Vector3(Math.cos(angle) * 0.2, 0.89 + random() * 0.27, Math.sin(angle) * 0.2),
      new THREE.Vector3(Math.cos(angle + 0.07) * 0.75, 0.37, Math.sin(angle + 0.07) * 0.75),
      new THREE.Vector3(Math.cos(angle + bend) * length * 0.66, 0.2, Math.sin(angle + bend) * length * 0.66),
      new THREE.Vector3(Math.cos(angle + bend * 0.42) * length, 0.07, Math.sin(angle + bend * 0.42) * length),
      new THREE.Vector3(Math.cos(angle - 0.08) * length * 1.04, 0.025, Math.sin(angle - 0.08) * length * 1.04),
    ]);
    woodParts.push(carvedTube(rootCurve, (t) => 0.006 + 0.265 * Math.pow(1 - t, 1.2), {
      segments: 32,
      sides: 10,
      color: i % 2 ? 0x936c48 : 0x79563b,
      flute: 0.12,
      phase: angle,
    }));
  }

  // Three heavier buttress roots continue the trunk's sweeps into curled ground forms.
  for (let i = 0; i < 3; i += 1) {
    const angle = [-0.64, 1.76, 3.78][i];
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
    const pointAt = (radius, turn, y) => radial.clone().multiplyScalar(radius)
      .addScaledVector(tangent, turn).setY(y);
    const start = spine.getPoint(0.105 + i * 0.016).addScaledVector(radial, 0.1);
    const rootCurve = curveThrough([
      start,
      pointAt(0.67, -0.09, 0.78),
      pointAt(1.42, 0.23, 0.39),
      pointAt(2.42, 0.53, 0.27),
      pointAt(2.77, -0.04, 0.19),
      pointAt(2.18, -0.65, 0.065),
    ]);
    woodParts.push(carvedTube(rootCurve, (t) => 0.012 + 0.435 * Math.pow(1 - t, 0.95), {
      segments: 40,
      sides: 12,
      color: [0x926a47, 0x7c583d, 0xa1784d][i],
      flute: 0.12,
      phase: angle,
    }));
  }

  const olivePalette = [0x536c41, 0x66764a, 0x7d8750, 0x3e5638, 0x949159];
  const leafRotation = new THREE.Quaternion();
  const leafTwist = new THREE.Quaternion();
  const addLeaves = (twig, count, phase, fullness = 1) => {
    for (let i = 0; i < count; i += 1) {
      const t = 0.14 + i / (count - 1) * 0.84;
      const point = twig.getPointAt(t);
      const tangent = twig.getTangentAt(t).normalize();
      const side = new THREE.Vector3().crossVectors(tangent, UP);
      if (side.lengthSq() < 0.001) side.set(1, 0, 0);
      side.normalize().multiplyScalar(i % 2 ? 1 : -1);
      const normal = side.clone().cross(tangent).normalize();
      const leafDirection = tangent.clone().multiplyScalar(0.25 + random() * 0.25)
        .addScaledVector(side, 0.62 + random() * 0.25)
        .addScaledVector(normal, (random() - 0.5) * 0.7)
        .addScaledVector(UP, 0.06 + random() * 0.22)
        .normalize();
      point.addScaledVector(side, 0.012);
      leafRotation.setFromUnitVectors(UP, leafDirection);
      leafTwist.setFromAxisAngle(UP, phase + (random() - 0.5) * 1.1);
      const rotation = leafRotation.clone().multiply(leafTwist);
      const length = (0.43 + random() * 0.33) * fullness;
      const tone = random();
      const colorIndex = tone < 0.34 ? 0 : tone < 0.64 ? 1 : tone < 0.83 ? 3 : tone < 0.96 ? 2 : 4;
      leafPlacements.push({
        point,
        rotation,
        scale: new THREE.Vector3(length * (1.03 + random() * 0.34), length, length),
        color: olivePalette[colorIndex],
      });
    }
  };

  // Broad, asymmetric branches retain open windows between the leaf sprays.
  for (let i = 0; i < 10; i += 1) {
    const angle = i * 2.39996323 + 0.12;
    const baseT = 0.7 + (i % 4) * 0.069;
    const start = spine.getPoint(baseT);
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle) * 0.83);
    const radius = 3.65 + (i % 3) * 0.46;
    const height = 13.45 + (i % 4) * 0.64;
    const end = radial.clone().multiplyScalar(radius);
    end.y = height;
    const branchCurve = curveThrough([
      start,
      start.clone().addScaledVector(radial, 0.52).add(new THREE.Vector3(0, 0.82, 0)),
      new THREE.Vector3(radial.x * radius * 0.58, height - 1.5, radial.z * radius * 0.58),
      end.clone().addScaledVector(radial, -0.18).add(new THREE.Vector3(0, -0.51, 0)),
      end,
    ]);
    mainBranches.push(branchCurve);
    woodParts.push(carvedTube(branchCurve, (t) => 0.032 + (0.22 - i * 0.006) * Math.pow(1 - t, 0.93), {
      segments: 40,
      sides: 10,
      color: i % 2 ? 0x97724d : 0x805c43,
      flute: 0.065,
      phase: angle,
    }));

    for (let fork = 0; fork < 3; fork += 1) {
      const splitT = 0.43 + fork * 0.19;
      const origin = branchCurve.getPointAt(splitT);
      const forkAngle = angle + (fork % 2 ? -1 : 1) * (0.38 + random() * 0.26);
      const outward = new THREE.Vector3(Math.cos(forkAngle), 0, Math.sin(forkAngle) * 0.86);
      const reach = 1.3 + random() * 0.6;
      const tip = origin.clone().addScaledVector(outward, reach);
      tip.y = Math.min(16.08, origin.y + 1.17 + random() * 0.61);
      const forkCurve = curveThrough([
        origin,
        origin.clone().addScaledVector(outward, reach * 0.38).add(new THREE.Vector3(0, 0.28, 0)),
        tip.clone().addScaledVector(outward, -0.15).add(new THREE.Vector3(0, -0.4, 0)),
        tip,
      ]);
      woodParts.push(carvedTube(forkCurve, (t) => 0.009 + (0.061 + (1 - splitT) * 0.038) * Math.pow(1 - t, 1.05), {
        segments: 21,
        sides: 7,
        color: 0x8b724b,
        flute: 0.035,
        phase: forkAngle,
      }));

      for (let shoot = 0; shoot < 2; shoot += 1) {
        const twigStart = forkCurve.getPointAt(shoot ? 0.76 : 0.42);
        const direction = new THREE.Vector3(
          Math.cos(forkAngle + (shoot ? 0.55 : -0.45)),
          0.52 + random() * 0.35,
          Math.sin(forkAngle + (shoot ? 0.55 : -0.45)),
        ).normalize();
        const twigEnd = twigStart.clone().addScaledVector(direction, 0.94 + random() * 0.28);
        twigEnd.y = Math.min(16.2, twigEnd.y);
        const twigCurve = curveThrough([
          twigStart,
          twigStart.clone().lerp(twigEnd, 0.52).add(new THREE.Vector3(0, -0.075, 0)),
          twigEnd,
        ]);
        woodParts.push(carvedTube(twigCurve, (t) => 0.003 + 0.023 * (1 - t), {
          segments: 12,
          sides: 5,
          color: 0x7d7147,
          flute: 0,
        }));
        addLeaves(twigCurve, 11, forkAngle + shoot * 0.8);
      }
      addLeaves(forkCurve, 7, forkAngle - 0.4, 0.82);
    }
    addLeaves(branchCurve, 7, angle, 0.9);

    // Lateral fans bridge the upright sprays into a layered, irregular umbrella.
    // These are curved twigs with individual leaves, not opaque canopy volumes.
    for (let fan = 0; fan < 4; fan += 1) {
      const origin = branchCurve.getPointAt(0.6 + fan * 0.105);
      const fanAngle = angle + [-0.98, 0.56, -0.38, 1.06][fan];
      const sweep = new THREE.Vector3(Math.cos(fanAngle), 0, Math.sin(fanAngle) * 0.9);
      const side = new THREE.Vector3(-Math.sin(fanAngle), 0, Math.cos(fanAngle));
      const reach = 1.25 + random() * 0.8;
      const tip = origin.clone().addScaledVector(sweep, reach);
      const radius = Math.hypot(tip.x, tip.z);
      if (radius > 5.03) {
        tip.x *= 5.03 / radius;
        tip.z *= 5.03 / radius;
      }
      tip.y = Math.min(16.04, origin.y + 0.12 + random() * 0.46);
      const crest = origin.clone().lerp(tip, 0.57)
        .addScaledVector(side, (fan % 2 ? 1 : -1) * 0.19)
        .add(new THREE.Vector3(0, 0.32 + random() * 0.18, 0));
      const fanCurve = curveThrough([
        origin,
        origin.clone().lerp(crest, 0.55).add(new THREE.Vector3(0, 0.12, 0)),
        crest,
        tip,
      ]);
      woodParts.push(carvedTube(fanCurve, (t) => 0.003 + 0.036 * Math.pow(1 - t, 1.1), {
        segments: 15,
        sides: 5,
        color: 0x737047,
        flute: 0.02,
      }));
      addLeaves(fanCurve, 35, fanAngle + fan * 0.28, 1.04);
    }
  }

  const mergedWood = mergeGeometries(woodParts, false);
  for (const geometry of woodParts) geometry.dispose();
  mergedWood.computeBoundingBox();
  mergedWood.computeBoundingSphere();
  const wood = new THREE.Mesh(mergedWood, woodMaterial);
  wood.name = "carved-trunk-roots-and-branches";
  wood.castShadow = true;
  wood.receiveShadow = true;
  sculpture.add(wood);

  const leafGeometry = createLeafGeometry();
  const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, leafPlacements.length);
  leaves.name = "individual-olive-leaves";
  const matrix = new THREE.Matrix4();
  const leafColor = new THREE.Color();
  const transformedVertex = new THREE.Vector3();
  leafPlacements.forEach(({ point, rotation, scale, color }, index) => {
    matrix.compose(point, rotation, scale);
    // Keep the same camera envelope even as individual sprays become fuller.
    let minX = Infinity;
    let maxX = -Infinity;
    for (let vertex = 0; vertex < leafGeometry.attributes.position.count; vertex += 1) {
      transformedVertex.fromBufferAttribute(leafGeometry.attributes.position, vertex).applyMatrix4(matrix);
      minX = Math.min(minX, transformedVertex.x);
      maxX = Math.max(maxX, transformedVertex.x);
    }
    if (minX < -5.70 || maxX > 5.70) {
      point.x += minX < -5.70 ? -5.70 - minX : 5.70 - maxX;
      matrix.compose(point, rotation, scale);
    }
    leaves.setMatrixAt(index, matrix);
    leaves.setColorAt(index, leafColor.setHex(color));
  });
  leaves.instanceMatrix.needsUpdate = true;
  leaves.instanceColor.needsUpdate = true;
  leaves.computeBoundingBox();
  leaves.computeBoundingSphere();
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  sculpture.add(leaves);

  const hangingStars = new THREE.Group();
  hangingStars.name = "hanging-star-lanterns";
  sculpture.add(hangingStars);
  const starGeometry = createStarGeometry();
  const starPivots = [];
  for (let i = 0; i < 9; i += 1) {
    const branch = mainBranches[(i * 3) % mainBranches.length];
    const anchor = branch.getPointAt(0.78 + (i % 3) * 0.095);
    const cordLength = 1.65 + (i % 3) * 0.67 + random() * 0.22;
    const starSize = 0.31 + (i % 3) * 0.075;
    const pivot = new THREE.Group();
    pivot.name = `star-pendulum-${i + 1}`;
    pivot.position.copy(anchor);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, cordLength, 5, 1), cordMaterial);
    cord.position.y = -cordLength / 2;
    pivot.add(cord);
    const star = new THREE.Mesh(starGeometry, goldMaterial);
    star.name = "beveled-five-point-star";
    star.scale.setScalar(starSize);
    star.position.y = -cordLength - starSize * 0.88;
    star.rotation.y = Math.atan2(anchor.x, anchor.z) + (i % 2 ? -0.23 : 0.23);
    star.castShadow = true;
    pivot.add(star);
    hangingStars.add(pivot);
    starPivots.push({ pivot, phase: random() * TAU, speed: 0.43 + random() * 0.2, amplitude: 0.035 + random() * 0.024 });
  }

  // Internal alignment leaves the public group's transforms entirely caller-owned.
  sculpture.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(sculpture, true);
  const heightScale = 17 / (bounds.max.y - bounds.min.y);
  sculpture.scale.y = heightScale;
  sculpture.position.y = -bounds.min.y * heightScale;
  sculpture.updateMatrixWorld(true);
  group.userData.leafCount = leafPlacements.length;
  group.userData.height = 17;
  group.userData.triangles = Math.round(
    mergedWood.index.count / 3
      + leafGeometry.index.count / 3 * leafPlacements.length
      + (starGeometry.index ? starGeometry.index.count : starGeometry.attributes.position.count) / 3 * starPivots.length
      + 20 * starPivots.length,
  );

  let disposed = false;
  return {
    group,
    update(time, reducedMotion = false) {
      if (disposed) return;
      const seconds = Number.isFinite(time) ? time : 0;
      for (const { pivot, phase, speed, amplitude } of starPivots) {
        pivot.rotation.z = reducedMotion ? 0 : Math.sin(seconds * speed + phase) * amplitude;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const geometries = new Set();
      const materials = new Set();
      group.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            materials.add(material);
          }
        }
        if (object.isInstancedMesh) object.dispose();
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
}

export default createPortfolioTree;
