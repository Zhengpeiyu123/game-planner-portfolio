import * as THREE from 'three';

const TAU = Math.PI * 2;
const BOTTOM_Y = -35;
const SHOULDER_Y = 42;
const TOP_Y = 47;
const BARK_TILE_WORLD_SIZE = TAU * 4.3;

/** Match the duplicated UV seam normals without merging its distinct UVs. */
function smoothSeam(geometry, rings, sides) {
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute('normal');
  const normal = new THREE.Vector3();
  for (let ring = 0; ring <= rings; ring += 1) {
    const first = ring * (sides + 1);
    const last = first + sides;
    normal.set(
      normals.getX(first) + normals.getX(last),
      normals.getY(first) + normals.getY(last),
      normals.getZ(first) + normals.getZ(last),
    ).normalize();
    normals.setXYZ(first, normal.x, normal.y, normal.z);
    normals.setXYZ(last, normal.x, normal.y, normal.z);
  }
  normals.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function centerAt(y) {
  // Less than 0.7 units of displacement: a quiet natural curve, not a corkscrew.
  return new THREE.Vector3(
    0.47 * Math.sin(y * 0.041 + 0.3),
    y,
    0.29 * Math.sin(y * 0.053 - 0.6),
  );
}

function trunkGeometry() {
  const rings = 128;
  const sides = 56;
  const vertices = [];
  const uvs = [];
  const indices = [];

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings;
    const y = THREE.MathUtils.lerp(BOTTOM_Y, TOP_Y, t);
    const center = centerAt(y);
    const shoulder = THREE.MathUtils.smoothstep(y, 31, SHOULDER_Y);
    const originalHeightProgress = (y - BOTTOM_Y) / (SHOULDER_Y - BOTTOM_Y);
    // Preserve the gallery's broad trunk exactly; above the shoulder the main
    // leader continues into a slender living tip instead of ending as a hollow.
    const radius = y <= SHOULDER_Y
      ? THREE.MathUtils.lerp(4.46 - originalHeightProgress * 0.3, 2, shoulder)
      : THREE.MathUtils.lerp(2, 0.025, THREE.MathUtils.smoothstep(y, SHOULDER_Y, TOP_Y));

    for (let side = 0; side <= sides; side += 1) {
      const u = side / sides;
      const angle = u * TAU;
      // Broad flutes catch diffuse light while the texture supplies pencil grain.
      const flute = 1 + 0.037 * Math.sin(angle * 7 + y * 0.04)
        + 0.018 * Math.sin(angle * 11 - y * 0.025)
        + 0.027 * Math.cos(angle * 3 + 0.6);
      vertices.push(
        center.x + Math.cos(angle) * radius * flute,
        y,
        center.z + Math.sin(angle) * radius * flute,
      );
      // A square texture repeats about 3 times along the 82-unit trunk;
      // it does not stretch a single tiny bark patch over the entire close-up.
      uvs.push(u, (y - BOTTOM_Y) / BARK_TILE_WORLD_SIZE);
      if (ring < rings && side < sides) {
        const a = ring * (sides + 1) + side;
        const b = a + sides + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }

  // A tiny raised tip closes only the upper leader. This avoids a black open
  // ring when mobile framing sees between foliage planes; it is not a flat cap.
  const tip = centerAt(TOP_Y + 0.07);
  const tipIndex = vertices.length / 3;
  vertices.push(tip.x, tip.y, tip.z);
  uvs.push(0.5, (TOP_Y + 0.07 - BOTTOM_Y) / BARK_TILE_WORLD_SIZE);
  const lastRing = rings * (sides + 1);
  for (let side = 0; side < sides; side += 1) {
    indices.push(lastRing + side, tipIndex, lastRing + side + 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  // Deliberately open at the bottom: it stays far below the camera. No roots,
  // flat pedestal, ground, or base enters the scroll experience.
  return smoothSeam(geometry, rings, sides);
}

function branchGeometry({ angle, startY, reach, endY, radius, sweep }) {
  const origin = centerAt(startY);
  const points = [origin];
  for (const [distance, rise] of [[0.24, 0.19], [0.52, 0.52], [0.78, 0.81], [1, 1]]) {
    const bearing = angle + sweep * distance;
    points.push(new THREE.Vector3(
      origin.x + Math.cos(bearing) * reach * distance,
      THREE.MathUtils.lerp(startY, endY, rise),
      origin.z + Math.sin(bearing) * reach * distance,
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const rings = 32;
  const sides = 14;
  const frames = curve.computeFrenetFrames(rings, false);
  const length = curve.getLength();
  const vertices = [];
  const uvs = [];
  const indices = [];

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings;
    const center = curve.getPointAt(t);
    const thickness = radius * Math.pow(1 - t, 1.35) + 0.025;
    for (let side = 0; side <= sides; side += 1) {
      const u = side / sides;
      const theta = u * TAU;
      const flute = 1 + 0.038 * Math.sin(theta * 5 + t * 2);
      const offset = frames.normals[ring].clone().multiplyScalar(Math.cos(theta))
        .addScaledVector(frames.binormals[ring], Math.sin(theta))
        .multiplyScalar(thickness * flute);
      vertices.push(center.x + offset.x, center.y + offset.y, center.z + offset.z);
      uvs.push(u * radius / 4.3, t * length / BARK_TILE_WORLD_SIZE);
      if (ring < rings && side < sides) {
        const a = ring * (sides + 1) + side;
        const b = a + sides + 1;
        // Frenet normals/binormals rotate in the opposite direction to trunk XZ.
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return smoothSeam(geometry, rings, sides);
}

/**
 * Close-up painted tree volume. Dimensions: trunk y=-35..47.07, radius≈4.3;
 * upward branches live only at y≈34..47, inside the illustrated canopy.
 * Parent owns rotation, lighting, foliage and the supplied bark texture.
 */
export function createPaintedTrunk(barkTexture) {
  const group = new THREE.Group();
  group.name = 'painted-trunk-volume';
  const material = new THREE.MeshLambertMaterial({
    map: barkTexture,
    color: 0xf5eee4,
    side: THREE.FrontSide,
  });
  const geometries = [trunkGeometry()];
  const trunk = new THREE.Mesh(geometries[0], material);
  trunk.name = 'continuous-closeup-trunk';
  group.add(trunk);

  const limbs = [
    { angle: 0.18, startY: 35.9, reach: 13.4, endY: 46.5, radius: 2.1, sweep: 0.19 },
    { angle: 2.9, startY: 35.8, reach: 12.2, endY: 46.2, radius: 2.0, sweep: -0.21 },
    { angle: 1.38, startY: 37.1, reach: 10.8, endY: 46.8, radius: 1.7, sweep: 0.25 },
    { angle: 4.42, startY: 37.4, reach: 11.1, endY: 46.7, radius: 1.65, sweep: -0.23 },
    { angle: 5.56, startY: 39.2, reach: 8.4, endY: 47, radius: 1.25, sweep: 0.22 },
  ];
  limbs.forEach((limb, index) => {
    const geometry = branchGeometry(limb);
    geometries.push(geometry);
    const branch = new THREE.Mesh(geometry, material);
    branch.name = `sweeping-canopy-limb-${index + 1}`;
    group.add(branch);
  });

  let disposed = false;
  return {
    group,
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach((geometry) => geometry.dispose());
      material.dispose();
      group.clear();
      // Never dispose barkTexture here: it is owned by the parent renderer.
    },
  };
}
