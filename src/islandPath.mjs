/** Pure route geometry in the island map's 1600 × 1000 coordinate space. */
const isPoint = (point) =>
  point != null && Number.isFinite(point.x) && Number.isFinite(point.y);

const distanceBetween = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

/** Find a distance-weighted path through an undirected graph (Dijkstra). */
export function shortestPath(nodes, edges, fromId, toId) {
  const hasNode = (id) =>
    nodes != null && Object.hasOwn(nodes, id) && isPoint(nodes[id]);
  if (!hasNode(fromId) || !hasNode(toId)) return [];
  if (fromId === toId) return [fromId];

  const adjacency = new Map();
  for (const id of Object.keys(nodes)) {
    if (hasNode(id)) adjacency.set(id, []);
  }
  for (const [a, b] of edges) {
    if (!hasNode(a) || !hasNode(b)) continue;
    const weight = distanceBetween(nodes[a], nodes[b]);
    adjacency.get(a).push({ id: b, weight });
    adjacency.get(b).push({ id: a, weight });
  }

  const distances = new Map([[fromId, 0]]);
  const previous = new Map();
  const unvisited = new Set(adjacency.keys());

  while (unvisited.size) {
    let nearest;
    let nearestDistance = Infinity;
    for (const id of unvisited) {
      const distance = distances.get(id) ?? Infinity;
      if (distance < nearestDistance) {
        nearest = id;
        nearestDistance = distance;
      }
    }
    if (nearest === undefined) return [];
    if (nearest === toId) {
      const path = [toId];
      while (path[0] !== fromId) path.unshift(previous.get(path[0]));
      return path;
    }
    unvisited.delete(nearest);
    for (const { id, weight } of adjacency.get(nearest)) {
      if (!unvisited.has(id)) continue;
      const candidate = nearestDistance + weight;
      if (candidate < (distances.get(id) ?? Infinity)) {
        distances.set(id, candidate);
        previous.set(id, nearest);
      }
    }
  }
  return [];
}

/** Resolve IDs to independent point objects; invalid IDs reject the route. */
export function routePoints(nodes, ids) {
  if (!nodes || ids.some((id) => !Object.hasOwn(nodes, id) || !isPoint(nodes[id]))) {
    return [];
  }
  return ids.map((id) => ({ x: nodes[id].x, y: nodes[id].y }));
}

export function routeLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distanceBetween(points[i - 1], points[i]);
  }
  return total;
}

/**
 * Sample a route by travelled distance, clamped to its endpoints.
 * Vertical segments retain the most recent left/right heading. If there is
 * no earlier heading, use the first later nonvertical segment, or face right.
 */
export function sampleRoute(points, distance) {
  if (!points.length) return { x: 0, y: 0, done: true, direction: 1 };
  let direction = 1;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    if (dx !== 0) {
      direction = Math.sign(dx);
      break;
    }
  }

  const total = routeLength(points);
  const travelled = Number.isNaN(distance) ? 0 : Math.max(0, distance ?? 0);
  let remaining = Math.min(travelled, total);
  for (let i = 1; i < points.length; i += 1) {
    const start = points[i - 1];
    const end = points[i];
    const length = distanceBetween(start, end);
    if (length === 0) continue;
    if (end.x !== start.x) direction = Math.sign(end.x - start.x);
    if (remaining <= length) {
      const fraction = remaining / length;
      return {
        x: start.x + (end.x - start.x) * fraction,
        y: start.y + (end.y - start.y) * fraction,
        done: travelled >= total,
        direction,
      };
    }
    remaining -= length;
  }

  const end = points.at(-1);
  return { x: end.x, y: end.y, done: true, direction };
}
