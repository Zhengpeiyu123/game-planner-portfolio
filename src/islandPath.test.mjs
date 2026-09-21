import test from 'node:test';
import assert from 'node:assert/strict';
import { shortestPath, routePoints, routeLength, sampleRoute } from './islandPath.mjs';
import { islands, nodes as worldNodes, edges as worldEdges, WORLD_WIDTH, WORLD_HEIGHT } from './islandWorldData.js';

test('production map connects all six islands through valid in-bounds bridge nodes', () => {
  assert.equal(islands.length, 6);
  for (const point of Object.values(worldNodes)) {
    assert.ok(point.x >= 0 && point.x <= WORLD_WIDTH);
    assert.ok(point.y >= 0 && point.y <= WORLD_HEIGHT);
  }
  for (const [from, to] of worldEdges) {
    assert.ok(worldNodes[from] && worldNodes[to]);
  }
  for (const from of islands) {
    for (const to of islands) {
      const route = shortestPath(worldNodes, worldEdges, from.node, to.node);
      assert.equal(route[0], from.node);
      assert.equal(route.at(-1), to.node);
      for (let i = 1; i < route.length; i++) {
        assert.ok(worldEdges.some(([a, b]) =>
          (a === route[i - 1] && b === route[i]) ||
          (b === route[i - 1] && a === route[i])));
      }
    }
  }
});

test('shortestPath weighs bridge length rather than number of edges', () => {
  const nodes = {
    start: { x: 0, y: 0 },
    northBridge: { x: 0, y: 100 },
    nearBridge: { x: 3, y: 0 },
    landing: { x: 6, y: 0 },
    end: { x: 10, y: 0 },
  };
  const edges = [
    ['start', 'northBridge'], ['northBridge', 'end'],
    ['start', 'nearBridge'], ['nearBridge', 'landing'], ['landing', 'end'],
  ];
  assert.deepEqual(shortestPath(nodes, edges, 'start', 'end'), [
    'start', 'nearBridge', 'landing', 'end',
  ]);
  assert.deepEqual(shortestPath(nodes, edges, 'end', 'start'), [
    'end', 'landing', 'nearBridge', 'start',
  ]);
});

test('shortestPath relaxes earlier routes when a shorter connection appears', () => {
  const nodes = {
    a: { x: 0, y: 0 }, b: { x: 1, y: 4 },
    c: { x: 5, y: 0 }, d: { x: 10, y: 0 },
  };
  assert.deepEqual(shortestPath(nodes, [
    ['a', 'b'], ['b', 'd'], ['a', 'c'], ['c', 'd'],
  ], 'a', 'd'), ['a', 'c', 'd']);
});

test('shortestPath handles same-node, unreachable and invalid IDs', () => {
  const nodes = { a: { x: 1, y: 1 }, b: { x: 2, y: 2 } };
  assert.deepEqual(shortestPath(nodes, [], 'a', 'a'), ['a']);
  assert.deepEqual(shortestPath(nodes, [], 'a', 'b'), []);
  assert.deepEqual(shortestPath(nodes, [], 'missing', 'missing'), []);
  assert.deepEqual(shortestPath(nodes, [], 'a', 'missing'), []);
  assert.deepEqual(shortestPath(nodes, [], 'toString', 'a'), []);
  assert.deepEqual(shortestPath(nodes, [['a', 'missing']], 'a', 'b'), []);
});

test('shortestPath permits zero-length edges without a predecessor cycle', () => {
  const nodes = {
    a: { x: 0, y: 0 }, b: { x: 0, y: 0 }, c: { x: 5, y: 0 },
  };
  assert.deepEqual(shortestPath(nodes, [
    ['a', 'b'], ['b', 'a'], ['a', 'a'], ['b', 'c'],
  ], 'a', 'c'), ['a', 'b', 'c']);
});

test('routePoints returns ordered copies and rejects unknown IDs', () => {
  const nodes = { a: { x: 2, y: 3, label: 'A' }, b: { x: 5, y: 7 } };
  const points = routePoints(nodes, ['b', 'a']);
  assert.deepEqual(points, [{ x: 5, y: 7 }, { x: 2, y: 3 }]);
  points[0].x = 99;
  assert.equal(nodes.b.x, 5);
  assert.deepEqual(routePoints(nodes, []), []);
  assert.deepEqual(routePoints(nodes, ['a', 'missing']), []);
});

test('routeLength includes every segment and tolerates repeated points', () => {
  assert.equal(routeLength([]), 0);
  assert.equal(routeLength([{ x: 2, y: 3 }]), 0);
  assert.equal(routeLength([
    { x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 4 }, { x: 6, y: 8 },
  ]), 10);
});

test('sampleRoute interpolates across corners and retains heading on vertical legs', () => {
  const points = [
    { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
  ];
  assert.deepEqual(sampleRoute(points, 5), { x: 5, y: 0, done: false, direction: 1 });
  assert.deepEqual(sampleRoute(points, 10), { x: 10, y: 0, done: false, direction: 1 });
  assert.deepEqual(sampleRoute(points, 15), { x: 10, y: 5, done: false, direction: 1 });
  assert.deepEqual(sampleRoute(points, 25), { x: 5, y: 10, done: false, direction: -1 });
});

test('sampleRoute clamps negative and excess distance, including infinity', () => {
  const points = [{ x: 8, y: 5 }, { x: 2, y: 5 }, { x: 2, y: 10 }];
  assert.deepEqual(sampleRoute(points, -3), { x: 8, y: 5, done: false, direction: -1 });
  for (const distance of [11, 50, Infinity]) {
    assert.deepEqual(sampleRoute(points, distance), {
      x: 2, y: 10, done: true, direction: -1,
    });
  }
});

test('sampleRoute skips zero-length segments and marks a stationary route complete', () => {
  assert.deepEqual(sampleRoute([{ x: 4, y: 9 }, { x: 4, y: 9 }], 0), {
    x: 4, y: 9, done: true, direction: 1,
  });
  assert.deepEqual(sampleRoute([
    { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 },
  ], 4), { x: 4, y: 0, done: false, direction: 1 });
  assert.deepEqual(sampleRoute([], 10), { x: 0, y: 0, done: true, direction: 1 });
  assert.deepEqual(sampleRoute([{ x: 4, y: 9 }], 10), {
    x: 4, y: 9, done: true, direction: 1,
  });
});

test('sampleRoute uses the next nonvertical heading when a route starts vertically', () => {
  assert.deepEqual(sampleRoute([
    { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
  ], 3), { x: 10, y: 3, done: false, direction: -1 });
  assert.deepEqual(sampleRoute([{ x: 10, y: 0 }, { x: 10, y: 10 }], 3), {
    x: 10, y: 3, done: false, direction: 1,
  });
});

test('sampleRoute uses Euclidean distance for diagonal interpolation', () => {
  const points = Object.freeze([
    Object.freeze({ x: 0, y: 0 }), Object.freeze({ x: 3, y: 4 }),
  ]);
  assert.deepEqual(sampleRoute(points, 2.5), {
    x: 1.5, y: 2, done: false, direction: 1,
  });
});
