import { useCallback, useEffect, useRef, useState } from "react";
import { publicUrl } from "./publicUrl.js";
import {
  islands,
  nodes,
  edges,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from "./islandWorldData.js";
import {
  shortestPath,
  routePoints,
  routeLength,
  sampleRoute,
} from "./islandPath.mjs";
import "./IslandWorld.css";

const WALK_SPEED = 300;
const INITIAL_CAMERA = { scale: 1, panX: 0, panY: 0 };
const initialIsland = islands.find((island) => island.id === "about") || islands[0];
const initialPoint = nodes[initialIsland.node];
const islandById = new Map(islands.map((island) => [island.id, island]));
const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));

function fitScale(size) {
  return Math.min(size.width / WORLD_WIDTH, size.height / WORLD_HEIGHT);
}

function cameraBounds(camera, size) {
  const maxX = Math.max(0, (WORLD_WIDTH * camera.scale - size.width) / 2);
  const maxY = Math.max(0, (WORLD_HEIGHT * camera.scale - size.height) / 2);
  return {
    ...camera,
    panX: clamp(camera.panX, -maxX, maxX),
    panY: clamp(camera.panY, -maxY, maxY),
  };
}

function makeJourney(from, destinationId) {
  const destination = islandById.get(destinationId);
  if (!destination) return null;
  const ids = shortestPath(nodes, edges, from, destination.node);
  if (!ids || !ids.length) return null;
  const points = routePoints(nodes, ids.slice(0, 2));
  return {
    destinationId,
    ids,
    index: 0,
    distance: 0,
    points,
    length: routeLength(points),
    lastTimestamp: null,
  };
}

export default function IslandWorld({ onOpen, active = true }) {
  const viewportRef = useRef(null);
  const directoryToggleRef = useRef(null);
  const onOpenRef = useRef(onOpen);
  const sizeRef = useRef({ width: WORLD_WIDTH, height: WORLD_HEIGHT });
  const cameraRef = useRef(INITIAL_CAMERA);
  const positionRef = useRef(initialPoint);
  const nodeRef = useRef(initialIsland.node);
  const journeyRef = useRef(null);
  const pendingRef = useRef(null);
  const pointerRef = useRef(null);
  const draggedRef = useRef(false);
  const clickResetTimerRef = useRef(null);
  const [camera, setCamera] = useState(INITIAL_CAMERA);
  const [position, setPosition] = useState(initialPoint);
  const [direction, setDirection] = useState("right");
  const [walking, setWalking] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [currentId, setCurrentId] = useState(initialIsland.id);
  const [destinationId, setDestinationId] = useState(null);
  const [visited, setVisited] = useState([]);
  const [listOpen, setListOpen] = useState(false);
  const [instantTravel, setInstantTravel] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  const [mapFailed, setMapFailed] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [announcement, setAnnouncement] = useState(
    "欢迎来到我的作品世界。选择一座岛，开始探索。",
  );

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  const updateCamera = useCallback((next) => {
    const bounded = cameraBounds(next, sizeRef.current);
    cameraRef.current = bounded;
    setCamera(bounded);
  }, []);

  const followPosition = useCallback(
    (point, force = false) => {
      if (pointerRef.current) return;
      const view = cameraRef.current;
      const size = sizeRef.current;
      const screenX = size.width / 2 + view.panX + (point.x - WORLD_WIDTH / 2) * view.scale;
      const screenY = size.height / 2 + view.panY + (point.y - WORLD_HEIGHT / 2) * view.scale;
      const xMin = size.width * 0.24;
      const xMax = size.width * 0.76;
      const yMin = size.height * 0.3;
      const yMax = size.height * 0.72;
      const panX = force
        ? -(point.x - WORLD_WIDTH / 2) * view.scale
        : view.panX + clamp(screenX, xMin, xMax) - screenX;
      const panY = force
        ? -(point.y - WORLD_HEIGHT / 2) * view.scale
        : view.panY + clamp(screenY, yMin, yMax) - screenY;
      if (panX !== view.panX || panY !== view.panY) {
        updateCamera({ ...view, panX, panY });
      }
    },
    [updateCamera],
  );

  const arrive = useCallback(
    (id) => {
      const island = islandById.get(id);
      if (!island) return;
      const point = nodes[island.node];
      journeyRef.current = null;
      pendingRef.current = null;
      nodeRef.current = island.node;
      positionRef.current = point;
      setPosition(point);
      setCurrentId(id);
      setDestinationId(null);
      setWalking(false);
      setVisited((previous) =>
        previous.includes(id) ? previous : [...previous, id],
      );
      setAnnouncement(`已抵达${island.name}，打开${island.description || island.name}。`);
      followPosition(point);
      onOpenRef.current?.(id);
    },
    [followPosition],
  );

  const selectIsland = useCallback(
    (id) => {
      const island = islandById.get(id);
      if (!active || !island || draggedRef.current) return;
      if (document.activeElement?.closest("#iw-destination-list")) {
        directoryToggleRef.current?.focus({ preventScroll: true });
      }
      setListOpen(false);
      if (instantTravel || reducedMotion || mapFailed) {
        arrive(id);
        return;
      }
      if (journeyRef.current) {
        pendingRef.current = id;
        setDestinationId(id);
        setAnnouncement(`改道前往${island.name}，走到下一个路口后转向。`);
        return;
      }
      if (nodeRef.current === island.node) {
        arrive(id);
        return;
      }
      const journey = makeJourney(nodeRef.current, id);
      if (!journey) {
        setAnnouncement(`暂时无法沿小路抵达${island.name}，可以开启立即抵达后再选择。`);
        return;
      }
      journeyRef.current = journey;
      pendingRef.current = null;
      setDestinationId(id);
      setWalking(true);
      setAnnouncement(`出发，沿小路前往${island.name}。`);
      followPosition(positionRef.current);
    },
    [active, arrive, followPosition, instantTravel, reducedMotion, mapFailed],
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!active || !(instantTravel || reducedMotion)) return;
    const id = pendingRef.current || journeyRef.current?.destinationId;
    if (id) arrive(id);
  }, [active, instantTravel, reducedMotion, arrive]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    let previousBase = null;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      const size = { width, height };
      sizeRef.current = size;
      const fit = fitScale(size);
      const base = width < 720 ? Math.max(fit, 0.6) : fit;
      const previous = cameraRef.current;
      const scale = previousBase === null ? base : previous.scale * base / previousBase;
      updateCamera({
        scale: clamp(scale, Math.min(fit, 0.6), Math.max(base, 1.8)),
        panX: previous.panX,
        panY: previous.panY,
      });
      previousBase = base;
      followPosition(positionRef.current);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [followPosition, updateCamera]);

  const zoomAt = useCallback(
    (factor, anchor) => {
      const view = cameraRef.current;
      const size = sizeRef.current;
      const fit = fitScale(size);
      const scale = clamp(view.scale * factor, Math.min(fit, 0.6), Math.max(fit, 1.8));
      const ratio = scale / view.scale;
      const x = anchor?.x ?? size.width / 2;
      const y = anchor?.y ?? size.height / 2;
      updateCamera({
        scale,
        panX: (view.panX - x + size.width / 2) * ratio + x - size.width / 2,
        panY: (view.panY - y + size.height / 2) * ratio + y - size.height / 2,
      });
    },
    [updateCamera],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const onWheel = (event) => {
      if (!active) return;
      if (event.target.closest("button, a, input, label")) return;
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      zoomAt(Math.exp(-clamp(delta, -120, 120) * 0.002), {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [active, zoomAt]);

  useEffect(() => {
    if (!walking || !active) return undefined;
    let frameId;
    const frame = (timestamp) => {
      let journey = journeyRef.current;
      if (!journey) return;
      const elapsed = journey.lastTimestamp === null
        ? 0
        : Math.min((timestamp - journey.lastTimestamp) / 1000, 0.064);
      journey.lastTimestamp = timestamp;
      journey.distance += elapsed * WALK_SPEED;

      // Re-routing only happens at graph nodes, so a new choice never cuts across water.
      let transitions = 0;
      while (journey && journey.distance >= journey.length && transitions < 20) {
        transitions += 1;
        const reachedNode = journey.ids[Math.min(journey.index + 1, journey.ids.length - 1)];
        nodeRef.current = reachedNode;
        positionRef.current = nodes[reachedNode];
        if (pendingRef.current) {
          const requestedId = pendingRef.current;
          pendingRef.current = null;
          const rerouted = makeJourney(reachedNode, requestedId);
          if (rerouted) {
            journey = rerouted;
            journey.lastTimestamp = timestamp;
            journeyRef.current = journey;
          } else {
            journey.distance -= journey.length;
            journey.index += 1;
            setDestinationId(journey.destinationId);
            setAnnouncement("这条小路暂时无法连通，继续前往原目的地。");
          }
        } else {
          journey.distance -= journey.length;
          journey.index += 1;
        }
        if (journey.ids.length === 1 || journey.index >= journey.ids.length - 1) {
          arrive(journey.destinationId);
          return;
        }
        journey.points = routePoints(nodes, journey.ids.slice(journey.index, journey.index + 2));
        journey.length = routeLength(journey.points);
      }
      if (!journey) return;
      const sampled = sampleRoute(journey.points, journey.distance);
      const point = { x: sampled.x, y: sampled.y };
      const dx = point.x - positionRef.current.x;
      if (Math.abs(dx) > 0.05) setDirection(dx < 0 ? "left" : "right");
      positionRef.current = point;
      setPosition(point);
      followPosition(point);
      frameId = window.requestAnimationFrame(frame);
    };
    frameId = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(frameId);
      if (journeyRef.current) journeyRef.current.lastTimestamp = null;
    };
  }, [active, walking, arrive, followPosition]);

  useEffect(() => () => window.clearTimeout(clickResetTimerRef.current), []);

  const onPointerDown = (event) => {
    if (!active || event.button !== 0 || event.target.closest("button, a, input, label")) return;
    if (pointerRef.current) return;
    draggedRef.current = false;
    window.clearTimeout(clickResetTimerRef.current);
    pointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: cameraRef.current.panX,
      panY: cameraRef.current.panY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (Math.hypot(dx, dy) < 5 && !draggedRef.current) return;
    draggedRef.current = true;
    setDragging(true);
    updateCamera({ ...cameraRef.current, panX: pointer.panX + dx, panY: pointer.panY + dy });
  };

  const endPointer = (event) => {
    if (pointerRef.current?.id !== event.pointerId) return;
    pointerRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    clickResetTimerRef.current = window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
  };

  const overview = () => {
    updateCamera({ scale: fitScale(sizeRef.current), panX: 0, panY: 0 });
    setAnnouncement("已展开全地图，可从岛屿路牌或目的地列表选择。 ");
  };

  const finishNow = () => {
    const id = pendingRef.current || journeyRef.current?.destinationId;
    if (id) arrive(id);
  };

  const destination = islandById.get(destinationId);
  const currentIsland = islandById.get(currentId);

  return (
    <section className="iw-root" aria-label="郑佩玉的互动作品地图">
      <header className="iw-header">
        <a className="iw-brand" href="#top" aria-label="郑佩玉互动作品集首页">
          <span className="iw-brand-mark" aria-hidden="true">郑</span>
          <span className="iw-brand-copy">郑佩玉<small>游戏策划 · 互动叙事</small></span>
        </a>
        <nav className="iw-header-links" aria-label="作品集快捷入口">
          <a href="#projects">直接阅读 <span aria-hidden="true">↗</span></a>
          <a href={publicUrl("/downloads/zheng-peiyu-resume.docx")} download>下载简历 <span aria-hidden="true">↓</span></a>
        </nav>
      </header>

      <div
        ref={viewportRef}
        className={`iw-viewport${dragging ? " is-dragging" : ""}`}
        aria-label="可拖动和缩放的岛屿地图"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
      >
        <div
          className="iw-world"
          style={{
            width: WORLD_WIDTH,
            height: WORLD_HEIGHT,
            transform: `translate(-50%, -50%) translate(${camera.panX}px, ${camera.panY}px) scale(${camera.scale})`,
          }}
        >
          <img
            className="iw-map-image"
            src={publicUrl("/assets/island-world.png")}
            alt="水面上的岛屿通过小路与桥梁相连，每座岛收藏一个项目或一段设计思考"
            draggable="false"
            onError={() => { setMapFailed(true); setMapLoaded(true); }}
            onLoad={() => { setMapFailed(false); setMapLoaded(true); }}
          />
          <div className="iw-intro">
            <p className="iw-eyebrow">ZHENG PEIYU · A WORLD OF IDEAS</p>
            <h1>把想法，<br />连成一座世界。</h1>
            <p className="iw-intro-copy">点击岛上的路牌，和我一起<br className="iw-intro-break" />看看设计背后的想法。</p>
          </div>
          {islands.map((island) => (
            <span key={island.id} className="iw-landing" aria-hidden="true" style={{ left: nodes[island.node].x, top: nodes[island.node].y }} />
          ))}
          <nav className="iw-hotspots" aria-label="选择探索目的地">
            {islands.map((island) => (
              <button
                key={island.id}
                type="button"
                className={`iw-hotspot iw-hotspot-${island.id}${visited.includes(island.id) ? " is-visited" : ""}${destinationId === island.id ? " is-destination" : ""}`}
                style={{ left: island.label.x, top: island.label.y, "--island-color": island.color }}
                onClick={() => selectIsland(island.id)}
                aria-label={`${island.name}，${island.description}${visited.includes(island.id) ? "，已探索" : ""}`}
                aria-current={currentId === island.id ? "location" : undefined}
              >
                <span className="iw-hotspot-kicker">{island.kicker}</span>
                <span className="iw-hotspot-name">{island.name}<span className="iw-hotspot-arrow" aria-hidden="true">↗</span></span>
                <span className="iw-hotspot-description">{island.description}</span>
                {visited.includes(island.id) && <span className="iw-visited-mark" aria-hidden="true">✓</span>}
              </button>
            ))}
          </nav>
          <div
            className={`iw-traveler${walking ? " is-walking" : ""} iw-facing-${direction}`}
            style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
            aria-hidden="true"
          >
            <span className="iw-traveler-shadow" />
            <span className="iw-traveler-body" style={{ transform: `scaleX(${direction === "left" ? -1 : 1})` }}>
              <span className={`iw-traveler-sprite${walking ? " is-walking" : ""}`} />
            </span>
            {!walking && visited.length === 0 && <span className="iw-traveler-greeting">我在这里</span>}
          </div>
        </div>
      </div>

      {!mapLoaded && <p className="iw-loading" role="status">正在铺开群岛…</p>}
      {mapFailed && (
        <div className="iw-map-error" role="status">
          <p>地图图片暂时无法加载，仍可通过目的地列表浏览作品。</p>
          <a href="#projects">直接阅读作品集 <span aria-hidden="true">↗</span></a>
        </div>
      )}

      <aside className="iw-destinations" aria-label="探索目录">
        <button
          ref={directoryToggleRef}
          data-map-directory
          type="button"
          className="iw-directory-toggle"
          onClick={() => setListOpen((previous) => !previous)}
          aria-expanded={listOpen}
          aria-controls="iw-destination-list"
        >
          <span>探索目录</span>
          <span className="iw-explored-count">{visited.length} / {islands.length}</span>
          <span aria-hidden="true">{listOpen ? "−" : "+"}</span>
        </button>
        <div id="iw-destination-list" className="iw-destination-list" hidden={!listOpen}>
          {islands.map((island, index) => (
            <button
              type="button"
              className={`iw-destination-item${visited.includes(island.id) ? " is-visited" : ""}`}
              onClick={() => selectIsland(island.id)}
              key={island.id}
              aria-current={currentId === island.id ? "location" : undefined}
            >
              <span className="iw-destination-number">{String(index + 1).padStart(2, "0")}</span>
              <span>{island.name}<small>{island.kicker}</small></span>
              <span className="iw-destination-check" aria-label={visited.includes(island.id) ? "已探索" : "未探索"}>{visited.includes(island.id) ? "✓" : "↗"}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="iw-map-controls" role="group" aria-label="地图视图控制">
        <button type="button" onClick={() => zoomAt(1.2)} aria-label="放大地图" title="放大地图">+</button>
        <button type="button" onClick={() => zoomAt(1 / 1.2)} aria-label="缩小地图" title="缩小地图">−</button>
        <button type="button" onClick={overview} className="iw-overview-button">总览</button>
        <button type="button" onClick={() => followPosition(positionRef.current, true)} className="iw-locate-button" aria-label="回到人物位置" title="回到人物位置">◎</button>
      </div>

      <footer className="iw-footer">
        <div className="iw-location-status">
          <span className={`iw-status-dot${walking ? " is-walking" : ""}`} aria-hidden="true" />
          <span>{walking ? `前往${destination?.name || "下一座岛"}…` : `现在位于 · ${currentIsland?.name || "起点"}`}</span>
          {walking && <button type="button" className="iw-finish-now" onClick={finishNow}>立即抵达 <span aria-hidden="true">↗</span></button>}
        </div>
        <p className="iw-help">拖动画面 · 滚轮缩放</p>
        <label className="iw-instant-option">
          <input
            type="checkbox"
            checked={instantTravel || reducedMotion}
            disabled={reducedMotion}
            onChange={(event) => setInstantTravel(event.target.checked)}
          />
          <span>{reducedMotion ? "已跟随系统减少动态" : "点击后立即抵达"}</span>
        </label>
      </footer>
      <p className="iw-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    </section>
  );
}
