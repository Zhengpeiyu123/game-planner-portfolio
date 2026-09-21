(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RedbeardConservation = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const PHASES = ["inspect", "dust", "stain", "crack", "blister", "back", "reveal", "complete"];
  const geometry = Object.freeze({
    inspectTargets: Object.freeze({
      dust: Object.freeze({ x: .20, y: .18 }),
      stain: Object.freeze({ x: .80, y: .36 }),
      crack: Object.freeze({ x: .61, y: .30 }),
      blister: Object.freeze({ x: .80, y: .58 })
    }),
    dustLanes: Object.freeze([.22, .38, .54, .70]),
    stains: Object.freeze({
      left: Object.freeze({ center: Object.freeze({ x: .30, y: .64 }), outer: .105, inner: .060 }),
      right: Object.freeze({ center: Object.freeze({ x: .80, y: .35 }), outer: .115, inner: .066 })
    }),
    cracks: Object.freeze([
      Object.freeze({ trace: Object.freeze([{ x: .43, y: .12 }, { x: .47, y: .23 }, { x: .55, y: .31 }, { x: .63, y: .30 }]), press: Object.freeze([0, 3, 1, 2]) }),
      Object.freeze({ trace: Object.freeze([{ x: .67, y: .13 }, { x: .65, y: .23 }, { x: .63, y: .30 }]), press: Object.freeze([0, 2, 1]) }),
      Object.freeze({ trace: Object.freeze([{ x: .63, y: .30 }, { x: .58, y: .44 }, { x: .55, y: .57 }, { x: .49, y: .70 }]), press: Object.freeze([0, 3, 1, 2]) })
    ]),
    blisters: Object.freeze([
      Object.freeze({ period: 1200, windows: Object.freeze([350, 800]) }),
      Object.freeze({ period: 1200, windows: Object.freeze([280, 650, 1050]) }),
      Object.freeze({ period: 1200, windows: Object.freeze([440, 900]) }),
      Object.freeze({ period: 1200, windows: Object.freeze([250, 560, 880]) })
    ]),
    blisterPositions: Object.freeze([{ x: .82, y: .52 }, { x: .80, y: .59 }, { x: .78, y: .63 }, { x: .84, y: .56 }]),
    stableWindow: 120,
    revealTargets: Object.freeze({
      Bernard: Object.freeze({ x0: .16, x1: .42, lanes: Object.freeze([.31, .36, .41]) }),
      "1888": Object.freeze({ x0: .58, x1: .84, lanes: Object.freeze([.62, .67, .72]) })
    })
  });

  const clone = value => JSON.parse(JSON.stringify(value));
  const snapshot = state => {
    const result = clone(state);
    delete result._history;
    return result;
  };
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const nearestIndex = (values, value) => values.reduce((best, item, index) => Math.abs(item - value) < Math.abs(values[best] - value) ? index : best, 0);
  const angleDelta = (a, b) => {
    let delta = b - a;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return delta;
  };
  const modulo = (value, divisor) => ((value % divisor) + divisor) % divisor;
  function simplifyPoints(points, maximum = 28) {
    const clean = [];
    for (const point of Array.isArray(points) ? points : []) {
      if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) continue;
      const next = { x: clamp(point.x, 0, 1), y: clamp(point.y, 0, 1) };
      const previous = clean[clean.length - 1];
      if (!previous || Math.hypot(next.x - previous.x, next.y - previous.y) >= .002) clean.push(next);
    }
    if (clean.length <= maximum) return clean;
    return Array.from({ length: maximum }, (_, index) => clean[Math.round(index * (clean.length - 1) / (maximum - 1))]);
  }
  const normalizedPointsAreValid = points => Array.isArray(points) && points.length > 0 && points.every(point => Number.isFinite(point?.x) && Number.isFinite(point?.y) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
  function revealKey(kind, metadata) {
    if (kind === "dust") return `dust:${metadata.laneId}`;
    if (kind === "stain") return `stain:${metadata.targetId}`;
    if (kind === "crack") return `crack:${metadata.crackId}`;
    if (kind === "blister") return `blister:${metadata.groupId}`;
    if (kind === "back") return `back:${metadata.clueId}`;
    return "";
  }
  function appendReveal(next, kind, points, width, metadata = {}) {
    const simplified = simplifyPoints(points);
    if (!simplified.length) return;
    const key = revealKey(kind, metadata);
    let operation = next.revealOps.find(item => item.key === key);
    if (!operation) {
      operation = { key, kind, paths: [], width, ...metadata };
      next.revealOps.push(operation);
    }
    operation.width = width;
    if (["dust", "crack"].includes(kind)) operation.paths = [simplified];
    else operation.paths.push(simplified);
  }

  function createState(message = "拖动侧光带寻找画面起伏；病害名称会在识别后写入记录。") {
    return {
      type: "conservation",
      version: 3,
      phase: "inspect",
      tool: "light",
      hostPaused: false,
      audioPending: false,
      hostClock: 0,
      integrity: 100,
      moves: 0,
      identified: [],
      clues: [],
      inspection: { seen: [] },
      dust: { lanes: [], coverage: 0, reversals: 0, bands: 0 },
      stains: {
        left: { outer: 0, inner: 0, complete: false },
        right: { outer: 0, inner: 0, complete: false }
      },
      cracks: geometry.cracks.map(() => ({ traceIndex: 0, traced: false, pressIndex: 0, complete: false })),
      blister: {
        currentGroup: 0,
        phaseStartedAt: 0,
        groupStartedAt: 0,
        lastTickAt: 0,
        groups: geometry.blisters.map(() => ({ hits: 0, errors: 0 }))
      },
      backFlipped: false,
      reveal: { Bernard: [], "1888": [] },
      revealOps: [],
      complete: false,
      rating: null,
      completionMode: "video",
      message,
      _history: []
    };
  }

  function commit(before, next, record = true) {
    if (JSON.stringify(snapshot(before)) === JSON.stringify(snapshot(next))) return before;
    next._history = record ? [...(before._history || []), snapshot(before)].slice(-80) : clone(before._history || []);
    return next;
  }

  function penalize(state, amount, message, updater) {
    const next = snapshot(state);
    next.integrity = clamp(next.integrity - amount, 0, 100);
    next.moves += 1;
    next.message = message;
    updater?.(next);
    return commit(state, next);
  }

  function applyInspect(state, action) {
    if (state.phase !== "inspect" || !Number.isFinite(action.x) || !Number.isFinite(action.y) || action.x < 0 || action.x > 1 || action.y < 0 || action.y > 1) return state;
    const found = Object.entries(geometry.inspectTargets).find(([name, point]) => !state.inspection.seen.includes(name) && distance(point, action) <= .115);
    if (!found) return state;
    const next = snapshot(state);
    next.inspection.seen.push(found[0]);
    next.identified.push(found[0]);
    next.moves += 1;
    if (next.inspection.seen.length === 4) {
      next.phase = "dust";
      next.tool = "brush";
      next.message = "侧光诊断已记录。用软刷沿画面方向从左向右连续扫除浮尘。";
    } else next.message = `侧光记录了第 ${next.inspection.seen.length} 处异常起伏，继续移动光带。`;
    return commit(state, next);
  }

  function applyDust(state, action) {
    if (state.phase !== "dust" || !Array.isArray(action.points) || action.points.length < 2) return state;
    if (!action.points.every(point => Number.isFinite(point?.x) && Number.isFinite(point?.y) && Number.isFinite(point?.t) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1 && point.t >= 0)) return state;
    const points = action.points;
    const first = points[0];
    const last = points[points.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const duration = last.t - first.t;
    if (duration <= 0) return state;
    const speed = Math.abs(dx) / duration;
    if (dx < -.18) {
      const next = snapshot(state);
      next.dust.reversals += 1;
      const removedLane = next.dust.lanes.pop();
      if (removedLane !== undefined) {
        const operationIndex = next.revealOps.findIndex(operation => operation.kind === "dust" && operation.laneId === removedLane);
        if (operationIndex >= 0) next.revealOps.splice(operationIndex, 1);
      }
      next.dust.coverage = next.dust.lanes.length / geometry.dustLanes.length;
      next.moves += 1;
      next.message = "反向刷动只把浮尘推回，清理覆盖略有回退。";
      return commit(state, next);
    }
    if (dx <= 0 || Math.abs(dy) > .13) return penalize(state, 0, "方向错误：软刷必须沿灰带从左向右平稳拖动。" );
    if (dx < .55) return penalize(state, 0, "刷痕太短：沿同一条灰带从左向右完整覆盖。" );
    if (speed > .0032) {
      const next = snapshot(state);
      next.dust.bands += 1;
      next.moves += 1;
      next.message = "刷速过快，浮尘在刷毛边缘留下了一条灰带。";
      return commit(state, next);
    }
    if (speed < .00035) return penalize(state, 0, "速度过慢：保持连续移动，不要让刷毛停在画面上。" );
    const averageY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const lane = nearestIndex(geometry.dustLanes, averageY);
    if (Math.abs(geometry.dustLanes[lane] - averageY) > .075) return penalize(state, 0, "软刷离开灰带：让刷毛贴着可见浮尘平行移动。" );
    if (state.dust.lanes.includes(lane)) return penalize(state, 0, "这条灰带已经刷净，请转到尚未清理的灰带。" );
    const next = snapshot(state);
    next.dust.lanes.push(lane);
    next.dust.lanes.sort((a, b) => a - b);
    next.dust.coverage = next.dust.lanes.length / geometry.dustLanes.length;
    appendReveal(next, "dust", points, .052, { laneId: lane });
    next.moves += 1;
    if (next.dust.lanes.length === geometry.dustLanes.length) {
      next.phase = "stain";
      next.tool = "swab";
      next.message = "浮尘已经按纹理刷净。用棉签沿两处晕痕边缘做短圆周，从外圈逐步向内。";
    } else next.message = `软刷已覆盖 ${Math.round(next.dust.coverage * 100)}%。保持左到右的稳定刷速。`;
    return commit(state, next);
  }

  function applyStain(state, action) {
    if (state.phase !== "stain" || !geometry.stains[action.stain] || !["outer", "inner"].includes(action.ring) || !normalizedPointsAreValid(action.points) || action.points.length < 3) return state;
    const config = geometry.stains[action.stain];
    const progress = state.stains[action.stain];
    if (progress.complete) return state;
    if (action.ring === "inner" && progress.outer < Math.PI * 2 - .12) return penalize(state, 2, "必须先沿外缘吸附，再向晕痕内圈收拢。" );
    const angles = action.points.map(point => Math.atan2(point.y - config.center.y, point.x - config.center.x));
    let accumulated = 0;
    for (let index = 1; index < angles.length; index += 1) accumulated += Math.abs(angleDelta(angles[index - 1], angles[index]));
    if (accumulated < .22) return penalize(state, 2, "棉签轨迹太短：贴着晕痕边缘继续画弧线。" );
    if (accumulated > 8.2) return penalize(state, 2, "棉签绕圈过多：一圈闭合后即可松开鼠标。" );
    const closureGap = distance(action.points[0], action.points[action.points.length - 1]);
    if (accumulated >= 5.1 && closureGap > .09) return penalize(state, 2, "圆周还有明显缺口：让轨迹末端接回起点后再松开鼠标。" );
    const expectedRadius = config[action.ring];
    const radii = action.points.map(point => distance(point, config.center));
    const meanRadius = radii.reduce((sum, value) => sum + value, 0) / radii.length;
    const maxDeviation = Math.max(...radii.map(value => Math.abs(value - expectedRadius)));
    if (Math.abs(meanRadius - expectedRadius) > .032 || maxDeviation > .05) return penalize(state, 4, "棉签离开晕痕边缘，画面完整度下降。" );
    const next = snapshot(state);
    next.stains[action.stain][action.ring] = Math.min(Math.PI * 2, progress[action.ring] + accumulated);
    appendReveal(next, "stain", action.points, .026, { targetId: action.stain });
    next.moves += 1;
    const stainProgress = next.stains[action.stain];
    if (stainProgress.outer >= Math.PI * 2 - .12 && stainProgress.inner >= Math.PI * 2 - .12) stainProgress.complete = true;
    if (next.stains.left.complete && next.stains.right.complete) {
      next.phase = "crack";
      next.tool = "light";
      next.message = "晕痕由外向内吸附完成。再次拖动侧光，沿三条裂迹的高光顺序描线。";
    } else if (action.ring === "outer" && next.stains[action.stain].outer >= Math.PI * 2 - .12) {
      next.message = `${action.stain === "left" ? "左侧" : "右侧"}晕痕外圈完成。下一步：沿同一处更小的内圈闭合一周。`;
    } else if (action.ring === "inner" && next.stains[action.stain].complete) {
      next.message = `${action.stain === "left" ? "左侧" : "右侧"}晕痕完成。下一步：到${action.stain === "left" ? "画面右侧" : "裂迹区域"}${action.stain === "left" ? "晕痕，先画外圈。" : "继续修复。"}`;
    } else next.message = `${action.stain === "left" ? "左侧" : "右侧"}晕痕${action.ring === "outer" ? "外圈" : "内圈"}正在变浅，继续沿当前虚线圆补完。`;
    return commit(state, next);
  }

  function applyTrace(state, action) {
    if (state.phase !== "crack" || !Number.isInteger(action.crack) || !geometry.cracks[action.crack] || !Number.isInteger(action.node)) return state;
    if (action.strokePoints !== undefined && !normalizedPointsAreValid(action.strokePoints)) return state;
    const progress = state.cracks[action.crack];
    if (progress.complete) return state;
    if (progress.traced) return state;
    const expected = progress.traceIndex;
    if (action.node !== expected) {
      const next = snapshot(state);
      next.cracks[action.crack].traceIndex = 0;
      next.moves += 1;
      next.message = `第 ${action.crack + 1} 条裂迹节点错序，只回退这一条的描线。`;
      return commit(state, next);
    }
    const next = snapshot(state);
    next.cracks[action.crack].traceIndex += 1;
    next.moves += 1;
    if (next.cracks[action.crack].traceIndex === geometry.cracks[action.crack].trace.length) {
      next.cracks[action.crack].traced = true;
      appendReveal(next, "crack", action.strokePoints || geometry.cracks[action.crack].trace, .018, { crackId: action.crack });
      next.tool = "press";
      next.message = `第 ${action.crack + 1} 条裂迹描线完成；从两端交替向交汇处压合。`;
    } else next.message = `沿侧光高光继续描第 ${action.crack + 1} 条裂迹。`;
    return commit(state, next);
  }

  function applyPress(state, action) {
    if (state.phase !== "crack" || !Number.isInteger(action.crack) || !geometry.cracks[action.crack] || !Number.isInteger(action.node)) return state;
    const progress = state.cracks[action.crack];
    if (progress.complete) return state;
    if (!progress.traced) return penalize(state, 3, "裂迹尚未完整描线，不能直接压合。" );
    const expected = geometry.cracks[action.crack].press[progress.pressIndex];
    if (action.node !== expected) {
      const next = snapshot(state);
      next.cracks[action.crack].pressIndex = 0;
      next.moves += 1;
      next.message = `压合顺序错误，只回退第 ${action.crack + 1} 条裂迹的压合。`;
      return commit(state, next);
    }
    const next = snapshot(state);
    next.cracks[action.crack].pressIndex += 1;
    next.moves += 1;
    if (next.cracks[action.crack].pressIndex === geometry.cracks[action.crack].press.length) {
      next.cracks[action.crack].complete = true;
      next.tool = "light";
      next.message = `第 ${action.crack + 1} 条裂迹压合完成。下一步：用侧光描第 ${action.crack + 2} 条裂迹。`;
    } else next.message = `第 ${action.crack + 1} 条裂迹已压合 ${next.cracks[action.crack].pressIndex}/${geometry.cracks[action.crack].press.length}。下一步点击编号 ${next.cracks[action.crack].pressIndex + 1}。`;
    if (next.cracks.every(item => item.complete)) {
      next.phase = "blister";
      next.tool = "press";
      next.blister.phaseStartedAt = next.hostClock;
      next.blister.groupStartedAt = next.hostClock;
      next.blister.lastTickAt = next.hostClock;
      next.message = "裂迹全部稳定。等待环形指示进入窄稳定区，再点击压平凸点。";
    }
    return commit(state, next);
  }

  function applyBlisterClick(state, action) {
    if (state.phase !== "blister" || !Number.isInteger(action.group) || action.group !== state.blister.currentGroup) return state;
    if ((action.x !== undefined || action.y !== undefined) && !(Number.isFinite(action.x) && Number.isFinite(action.y) && action.x >= 0 && action.x <= 1 && action.y >= 0 && action.y <= 1)) return state;
    const group = state.blister.groups[action.group];
    const config = geometry.blisters[action.group];
    const target = config.windows[group.hits];
    const elapsed = state.hostClock - state.blister.groupStartedAt;
    const phase = modulo(elapsed, config.period);
    const directDistance = Math.abs(phase - target);
    const stableDistance = Math.min(directDistance, config.period - directDistance);
    if (stableDistance > geometry.stableWindow) {
      return penalize(state, 5, "点击落在稳定区之外，完整度下降；观察下一次收拢。", next => { next.blister.groups[action.group].errors += 1; });
    }
    const next = snapshot(state);
    next.blister.groups[action.group].hits += 1;
    const point = Number.isFinite(action.x) && Number.isFinite(action.y) ? { x: action.x, y: action.y } : geometry.blisterPositions[action.group];
    appendReveal(next, "blister", [point], .042, { groupId: action.group });
    next.moves += 1;
    if (next.blister.groups[action.group].hits === config.windows.length) {
      next.blister.currentGroup += 1;
      next.blister.groupStartedAt = next.hostClock;
      next.message = `第 ${action.group + 1} 组凸点已稳定压平。`;
    } else next.message = `节奏命中；保持稳定，完成本组下一次压合。`;
    if (next.blister.currentGroup === geometry.blisters.length) {
      next.phase = "back";
      next.tool = "light";
      next.message = "四类病害处理完成。翻动画框，检查背面的厂印和日期。";
    }
    return commit(state, next);
  }

  function applyReveal(state, action) {
    if (state.phase !== "reveal" || !geometry.revealTargets[action.target] || !normalizedPointsAreValid(action.points) || action.points.length < 2) return state;
    const config = geometry.revealTargets[action.target];
    const first = action.points[0];
    const last = action.points[action.points.length - 1];
    if (![first.x, first.y, last.x, last.y].every(Number.isFinite) || last.x - first.x < .16) return state;
    const averageY = action.points.reduce((sum, point) => sum + point.y, 0) / action.points.length;
    const lane = nearestIndex(config.lanes, averageY);
    if (Math.abs(config.lanes[lane] - averageY) > .035 || state.reveal[action.target].includes(lane)) return state;
    const next = snapshot(state);
    next.reveal[action.target].push(lane);
    next.reveal[action.target].sort((a, b) => a - b);
    next.moves += 1;
    appendReveal(next, "back", action.points, .034, { clueId: action.target });
    if (next.reveal[action.target].length === config.lanes.length && !next.clues.includes(action.target)) next.clues.push(action.target);
    if (next.clues.includes("Bernard") && next.clues.includes("1888")) {
      next.phase = "complete";
      next.complete = true;
      next.rating = next.integrity >= 92 ? "careful" : "recovered";
      next.message = "背面浮尘已经刷除：贝尔纳画框厂印与 1888 日期完整显露。";
    } else {
      const label = action.target === "Bernard" ? "左侧厂印" : "右侧日期";
      const count = next.reveal[action.target].length;
      if (count === config.lanes.length) next.message = `${label}三条刷痕完成。下一步：到${action.target === "Bernard" ? "右侧日期" : "完成记录"}区域。`;
      else next.message = `${label}第 ${count}/3 条完成。下一步沿紧邻的下一条虚线从左向右刷。`;
    }
    return commit(state, next);
  }

  function applyAction(state, action) {
    if (!validateCore(state) || !action || typeof action !== "object" || state.complete && !["hostPause", "audioPending", "completionMode"].includes(action.type)) return state;
    if (action.type === "hostPause" && typeof action.paused === "boolean") {
      const next = snapshot(state); next.hostPaused = action.paused; return commit(state, next, false);
    }
    if (action.type === "audioPending" && typeof action.pending === "boolean") {
      const next = snapshot(state); next.audioPending = action.pending; return commit(state, next, false);
    }
    if (action.type === "completionMode" && state.complete && ["poster", "dismissed"].includes(action.mode) && !(state.completionMode === "dismissed") && !(state.completionMode === "poster" && action.mode === "video")) {
      const next = snapshot(state); next.completionMode = action.mode; return commit(state, next, false);
    }
    if (action.type === "tick" && Number.isFinite(action.ms) && action.ms >= 0) {
      if (state.hostPaused || state.audioPending || action.ms === 0) return state;
      if (state.hostClock + action.ms > Number.MAX_SAFE_INTEGER) return state;
      const next = snapshot(state); next.hostClock += action.ms; if (next.phase === "blister") next.blister.lastTickAt = next.hostClock; return commit(state, next, false);
    }
    if (state.hostPaused || state.audioPending) return state;
    if (action.type === "tool" && ["light", "brush", "swab", "press"].includes(action.tool)) {
      if (state.tool === action.tool) return state;
      const next = snapshot(state); next.tool = action.tool; next.message = `已拿起${({ light: "侧光", brush: "软刷", swab: "棉签", press: "压合工具" })[action.tool]}。`; return commit(state, next);
    }
    if (action.type === "inspectLight") return applyInspect(state, action);
    if (action.type === "dustStroke") return applyDust(state, action);
    if (action.type === "stainArc") return applyStain(state, action);
    if (action.type === "traceCrackNode") return applyTrace(state, action);
    if (action.type === "pressCrackNode") return applyPress(state, action);
    if (action.type === "clickBlister") return applyBlisterClick(state, action);
    if (action.type === "flipBack" && state.phase === "back") {
      const next = snapshot(state); next.phase = "reveal"; next.backFlipped = true; next.tool = "brush"; next.moves += 1; next.message = "画框背面已翻出；用软刷沿画布纤维显露厂印与日期。"; return commit(state, next);
    }
    if (action.type === "revealStroke") return applyReveal(state, action);
    return state;
  }

  const isRecord = value => Boolean(value) && typeof value === "object" && !Array.isArray(value) && !value.nodeType;
  const numberIn = (value, minimum, maximum) => Number.isFinite(value) && value >= minimum && value <= maximum;
  const integerIn = (value, minimum, maximum) => Number.isInteger(value) && value >= minimum && value <= maximum;
  const uniqueSubset = (items, allowed) => Array.isArray(items) && new Set(items).size === items.length && items.every(item => allowed.includes(item));
  function getBlisterWindow(state, clock = state?.hostClock) {
    if (!state || state.phase !== "blister" || !Number.isInteger(state.blister?.currentGroup) || state.blister.currentGroup >= geometry.blisters.length || !Number.isFinite(clock)) return null;
    const group = state.blister.currentGroup;
    const config = geometry.blisters[group];
    const hit = state.blister.groups[group].hits;
    const target = config.windows[hit];
    const phase = modulo(clock - state.blister.groupStartedAt, config.period);
    const directDistance = Math.abs(phase - target);
    const distance = Math.min(directDistance, config.period - directDistance);
    return { group, hit, target, phase, period: config.period, distance, stable: distance <= geometry.stableWindow };
  }
  function validateCore(value) {
    if (!isRecord(value) || value.type !== "conservation" || value.version !== 3 || !PHASES.includes(value.phase)) return false;
    if (!["light", "brush", "swab", "press"].includes(value.tool) || typeof value.hostPaused !== "boolean" || typeof value.audioPending !== "boolean" || !numberIn(value.hostClock, 0, Number.MAX_SAFE_INTEGER)) return false;
    if (!integerIn(value.integrity, 0, 100) || !integerIn(value.moves, 0, 100000) || typeof value.complete !== "boolean" || typeof value.message !== "string" || !["video", "poster", "dismissed"].includes(value.completionMode)) return false;
    if (!uniqueSubset(value.identified, Object.keys(geometry.inspectTargets)) || !uniqueSubset(value.clues, ["Bernard", "1888"])) return false;
    if (!isRecord(value.inspection) || !uniqueSubset(value.inspection.seen, Object.keys(geometry.inspectTargets))) return false;
    if (!isRecord(value.dust) || !uniqueSubset(value.dust.lanes, [0, 1, 2, 3]) || value.dust.coverage !== value.dust.lanes.length / 4 || !integerIn(value.dust.reversals, 0, 100000) || !integerIn(value.dust.bands, 0, 100000)) return false;
    if (!isRecord(value.stains)) return false;
    for (const name of ["left", "right"]) {
      const item = value.stains[name];
      if (!isRecord(item) || !numberIn(item.outer, 0, Math.PI * 2) || !numberIn(item.inner, 0, Math.PI * 2) || typeof item.complete !== "boolean") return false;
    }
    if (!Array.isArray(value.cracks) || value.cracks.length !== geometry.cracks.length) return false;
    for (let index = 0; index < value.cracks.length; index += 1) {
      const item = value.cracks[index];
      if (!isRecord(item) || !integerIn(item.traceIndex, 0, geometry.cracks[index].trace.length) || typeof item.traced !== "boolean" || !integerIn(item.pressIndex, 0, geometry.cracks[index].press.length) || typeof item.complete !== "boolean") return false;
    }
    if (!isRecord(value.blister) || !integerIn(value.blister.currentGroup, 0, geometry.blisters.length) || !numberIn(value.blister.phaseStartedAt, 0, Number.MAX_SAFE_INTEGER) || !numberIn(value.blister.groupStartedAt, 0, Number.MAX_SAFE_INTEGER) || !numberIn(value.blister.lastTickAt, 0, Number.MAX_SAFE_INTEGER) || !Array.isArray(value.blister.groups) || value.blister.groups.length !== geometry.blisters.length) return false;
    if (!value.blister.groups.every((item, index) => isRecord(item) && integerIn(item.hits, 0, geometry.blisters[index].windows.length) && integerIn(item.errors, 0, 100000))) return false;
    if (typeof value.backFlipped !== "boolean" || !isRecord(value.reveal) || !uniqueSubset(value.reveal.Bernard, [0, 1, 2]) || !uniqueSubset(value.reveal["1888"], [0, 1, 2])) return false;
    if (!Array.isArray(value.revealOps) || value.revealOps.length > 15) return false;
    const revealKinds = ["dust", "stain", "crack", "blister", "back"];
    const revealKeys = [];
    for (const operation of value.revealOps) {
      if (!isRecord(operation) || !revealKinds.includes(operation.kind) || typeof operation.key !== "string" || !numberIn(operation.width, .005, .15) || !Array.isArray(operation.paths) || operation.paths.length < 1 || operation.paths.length > 160) return false;
      if (!operation.paths.every(points => Array.isArray(points) && points.length >= 1 && points.length <= 28 && points.every(point => isRecord(point) && numberIn(point.x, 0, 1) && numberIn(point.y, 0, 1)))) return false;
      if (operation.kind === "dust" && !integerIn(operation.laneId, 0, geometry.dustLanes.length - 1)) return false;
      if (operation.kind === "stain" && !["left", "right"].includes(operation.targetId)) return false;
      if (operation.kind === "crack" && !integerIn(operation.crackId, 0, geometry.cracks.length - 1)) return false;
      if (operation.kind === "blister" && !integerIn(operation.groupId, 0, geometry.blisters.length - 1)) return false;
      if (operation.kind === "back" && !["Bernard", "1888"].includes(operation.clueId)) return false;
      if (operation.key !== revealKey(operation.kind, operation)) return false;
      revealKeys.push(operation.key);
    }
    if (new Set(revealKeys).size !== revealKeys.length) return false;

    const sameSet = (left, right) => left.length === right.length && [...left].sort().every((item, index) => item === [...right].sort()[index]);
    if (!sameSet(value.identified, value.inspection.seen)) return false;
    const inspectionDone = value.inspection.seen.length === Object.keys(geometry.inspectTargets).length;
    const dustUntouched = value.dust.lanes.length === 0 && value.dust.reversals === 0 && value.dust.bands === 0;
    const dustDone = value.dust.lanes.length === geometry.dustLanes.length;
    const stainsUntouched = ["left", "right"].every(name => value.stains[name].outer === 0 && value.stains[name].inner === 0 && !value.stains[name].complete);
    for (const name of ["left", "right"]) {
      const item = value.stains[name];
      const expectedComplete = item.outer >= Math.PI * 2 - .12 && item.inner >= Math.PI * 2 - .12;
      if (item.complete !== expectedComplete || item.inner > 0 && item.outer < Math.PI * 2 - .12) return false;
    }
    const stainsDone = value.stains.left.complete && value.stains.right.complete;
    let cracksUntouched = true;
    for (let index = 0; index < value.cracks.length; index += 1) {
      const item = value.cracks[index];
      const traced = item.traceIndex === geometry.cracks[index].trace.length;
      const complete = traced && item.pressIndex === geometry.cracks[index].press.length;
      if (item.traced !== traced || item.complete !== complete || !item.traced && item.pressIndex !== 0) return false;
      if (item.traceIndex || item.traced || item.pressIndex || item.complete) cracksUntouched = false;
    }
    const cracksDone = value.cracks.every(item => item.complete);
    const blisterUntouched = value.blister.currentGroup === 0 && value.blister.phaseStartedAt === 0 && value.blister.groupStartedAt === 0 && value.blister.lastTickAt === 0 && value.blister.groups.every(item => item.hits === 0 && item.errors === 0);
    const expectedGroup = value.blister.groups.findIndex((item, index) => item.hits < geometry.blisters[index].windows.length);
    if (value.blister.currentGroup !== (expectedGroup < 0 ? geometry.blisters.length : expectedGroup)) return false;
    const blisterDone = value.blister.currentGroup === geometry.blisters.length;
    if (!blisterUntouched && !(value.blister.phaseStartedAt <= value.blister.groupStartedAt && value.blister.groupStartedAt <= value.hostClock && value.blister.phaseStartedAt <= value.blister.lastTickAt && value.blister.lastTickAt <= value.hostClock)) return false;
    const revealUntouched = value.reveal.Bernard.length === 0 && value.reveal["1888"].length === 0 && value.clues.length === 0;
    const expectedClues = [];
    if (value.reveal.Bernard.length === geometry.revealTargets.Bernard.lanes.length) expectedClues.push("Bernard");
    if (value.reveal["1888"].length === geometry.revealTargets["1888"].lanes.length) expectedClues.push("1888");
    if (!sameSet(value.clues, expectedClues)) return false;
    const marksDone = expectedClues.length === 2;

    const operationsByKind = Object.fromEntries(revealKinds.map(kind => [kind, value.revealOps.filter(operation => operation.kind === kind)]));
    const counts = Object.fromEntries(revealKinds.map(kind => [kind, operationsByKind[kind].length]));
    const dustOperationLanes = operationsByKind.dust.map(operation => operation.laneId);
    if (new Set(dustOperationLanes).size !== dustOperationLanes.length || !sameSet(dustOperationLanes, value.dust.lanes)) return false;
    const expectedStainTargets = ["left", "right"].filter(name => value.stains[name].outer > 0 || value.stains[name].inner > 0);
    const expectedCrackIds = value.cracks.map((item, index) => item.traced ? index : null).filter(item => item !== null);
    const expectedBlisterIds = value.blister.groups.map((item, index) => item.hits ? index : null).filter(item => item !== null);
    const expectedBackClues = ["Bernard", "1888"].filter(name => value.reveal[name].length > 0);
    if (!sameSet(operationsByKind.stain.map(item => item.targetId), expectedStainTargets) || !sameSet(operationsByKind.crack.map(item => item.crackId), expectedCrackIds) || !sameSet(operationsByKind.blister.map(item => item.groupId), expectedBlisterIds) || !sameSet(operationsByKind.back.map(item => item.clueId), expectedBackClues)) return false;
    for (const operation of operationsByKind.blister) if (operation.paths.length !== value.blister.groups[operation.groupId].hits) return false;
    for (const operation of operationsByKind.back) if (operation.paths.length !== value.reveal[operation.clueId].length) return false;
    if (counts.dust !== value.dust.lanes.length || counts.crack !== value.cracks.filter(item => item.traced).length) return false;
    const stainAngle = value.stains.left.outer + value.stains.left.inner + value.stains.right.outer + value.stains.right.inner;
    const stainPathCount = operationsByKind.stain.reduce((sum, operation) => sum + operation.paths.length, 0);
    if (stainPathCount < Math.ceil(Math.max(0, stainAngle - .0001) / 8.2) || stainAngle === 0 && counts.stain !== 0) return false;

    const phaseValid = ({
      inspect: !inspectionDone && dustUntouched && stainsUntouched && cracksUntouched && blisterUntouched && !value.backFlipped && revealUntouched,
      dust: inspectionDone && !dustDone && stainsUntouched && cracksUntouched && blisterUntouched && !value.backFlipped && revealUntouched,
      stain: inspectionDone && dustDone && !stainsDone && cracksUntouched && blisterUntouched && !value.backFlipped && revealUntouched,
      crack: inspectionDone && dustDone && stainsDone && !cracksDone && blisterUntouched && !value.backFlipped && revealUntouched,
      blister: inspectionDone && dustDone && stainsDone && cracksDone && !blisterDone && !value.backFlipped && revealUntouched,
      back: inspectionDone && dustDone && stainsDone && cracksDone && blisterDone && !value.backFlipped && revealUntouched,
      reveal: inspectionDone && dustDone && stainsDone && cracksDone && blisterDone && value.backFlipped && !marksDone,
      complete: inspectionDone && dustDone && stainsDone && cracksDone && blisterDone && value.backFlipped && marksDone
    })[value.phase];
    if (!phaseValid || value.complete !== (value.phase === "complete")) return false;
    const expectedRating = value.complete ? (value.integrity >= 92 ? "careful" : "recovered") : null;
    return value.rating === expectedRating && (value.complete || value.completionMode === "video");
  }

  function validateState(value) {
    if (!validateCore(value)) return false;
    return value._history === undefined || Array.isArray(value._history) && value._history.length <= 80 && value._history.every(validateCore);
  }

  function undo(state) {
    if (!validateState(state) || !state._history?.length) return state;
    const history = clone(state._history);
    const previous = history.pop();
    previous._history = history;
    return previous;
  }
  const reset = () => createState();
  const serialize = state => JSON.stringify(validateState(state) ? state : createState("存档校验失败，已重新开始画作勘察。"));
  const legacyV2Geometry = Object.freeze({
    stainCenters: Object.freeze({ left: Object.freeze({ x: .35, y: .43 }), right: Object.freeze({ x: .68, y: .58 }) }),
    cracks: Object.freeze([
      Object.freeze([{ x: .18, y: .68 }, { x: .28, y: .59 }, { x: .38, y: .63 }, { x: .47, y: .52 }, { x: .55, y: .45 }]),
      Object.freeze([{ x: .50, y: .22 }, { x: .58, y: .31 }, { x: .66, y: .37 }, { x: .73, y: .49 }]),
      Object.freeze([{ x: .69, y: .76 }, { x: .73, y: .66 }, { x: .82, y: .59 }, { x: .88, y: .48 }])
    ]),
    blisters: Object.freeze([{ x: .27, y: .31 }, { x: .58, y: .24 }, { x: .73, y: .61 }, { x: .42, y: .72 }])
  });
  function migrateV2Snapshot(raw) {
    const next = clone(raw);
    delete next._history;
    next.version = 3;
    next.completionMode ||= "video";
    const oldOperations = Array.isArray(next.revealOps) ? next.revealOps : [];
    next.revealOps = [];
    const average = points => points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
    for (const operation of oldOperations) {
      const paths = Array.isArray(operation.paths) ? operation.paths : Array.isArray(operation.points) ? [operation.points] : [];
      for (const points of paths) {
        if (!normalizedPointsAreValid(points)) continue;
        const meanSum = average(points); const mean = { x: meanSum.x / points.length, y: meanSum.y / points.length };
        const metadata = {};
        if (operation.kind === "dust") metadata.laneId = integerIn(operation.laneId, 0, 3) ? operation.laneId : nearestIndex(geometry.dustLanes, mean.y);
        if (operation.kind === "stain") metadata.targetId = ["left", "right"].includes(operation.targetId) ? operation.targetId : Object.entries(legacyV2Geometry.stainCenters).map(([id, point]) => ({ id, distance: distance(point, mean) })).sort((a, b) => a.distance - b.distance)[0].id;
        if (operation.kind === "crack") metadata.crackId = integerIn(operation.crackId, 0, 2) ? operation.crackId : legacyV2Geometry.cracks.map((crack, index) => ({ index, distance: Math.min(...crack.map(point => distance(point, mean))) })).sort((a, b) => a.distance - b.distance)[0].index;
        if (operation.kind === "blister") metadata.groupId = integerIn(operation.groupId, 0, 3) ? operation.groupId : legacyV2Geometry.blisters.map((point, index) => ({ index, distance: distance(point, mean) })).sort((a, b) => a.distance - b.distance)[0].index;
        if (operation.kind === "back") metadata.clueId = ["Bernard", "1888"].includes(operation.clueId) ? operation.clueId : (mean.x < .5 ? "Bernard" : "1888");
        if (revealKey(operation.kind, metadata)) appendReveal(next, operation.kind, points, Number.isFinite(operation.width) ? operation.width : .03, metadata);
      }
    }
    return next;
  }
  function migrateV2(raw) {
    const migrated = migrateV2Snapshot(raw);
    migrated._history = Array.isArray(raw._history) ? raw._history.map(previous => migrateV2Snapshot(previous)).filter(validateCore).slice(-80) : [];
    return migrated;
  }
  function restore(serialized) {
    try {
      let parsed = typeof serialized === "string" ? JSON.parse(serialized) : clone(serialized);
      if (parsed?.type === "conservation" && parsed.version === 2) parsed = migrateV2(parsed);
      if (validateState(parsed)) return parsed;
      if (parsed?.type === "conservation" && Array.isArray(parsed.cells)) return createState("旧版格状清理记录无法映射到真实画面，已保留剧情并重新开始本次勘察。" );
    } catch { /* invalid snapshots fall through */ }
    return createState("清理记录损坏，已重新开始本次勘察。" );
  }

  function hint(state, stage = 0) {
    if (stage >= 3) return state?.complete
      ? "证据回顾：背面已经显露贝尔纳厂印与 1888 日期。"
      : `证据回顾：当前阶段 ${state?.phase || "inspect"}，完整度 ${state?.integrity ?? 100}%。`;
    const hints = {
      inspect: ["拖动侧光带，不要先找文字；观察尘粒、边缘晕染、细裂高光和局部鼓起。", "侧光必须经过四处异常起伏，记录纸才会写下名称。", "让光带依次扫过画面左上、左中、右上与右下。"],
      dust: ["软刷要连续从左向右走，慢到刷毛能带走浮尘。", "反刷会把灰推回；过快会留下灰带。", "分四条平行带覆盖整幅画，不要上下乱刷。"],
      stain: ["棉签贴着晕痕边缘做短圆周。", "每处先走外圈，再收进内圈；离开边缘会损伤画面。", "两处晕痕都需要完成外圈和内圈。"],
      crack: ["先用侧光找到裂纹高光，再按几何顺序描线。", "描完后换压合工具，从两端交替向交汇点压。", "错序只会回退当前裂纹，已经完成的裂纹保留。"],
      blister: ["观察环形指示收进窄稳定区的瞬间。", "每组需要连续命中 2 到 3 次，不同组节奏不同。", "暂停或等待音频恢复时节奏窗口会冻结。"],
      back: ["四类病害已经处理完，翻到画框背面。"],
      reveal: ["用软刷沿背面纤维从左向右刷，分别显露厂印和日期。", "左侧是厂印区域，右下是日期区域。", "两处各需三条稳定笔触。"]
    };
    const list = hints[state?.phase] || hints.inspect;
    return list[Math.max(0, Math.min(2, stage))];
  }

  function describe(state) {
    if (!validateState(state)) return { type: "conservation", phase: "inspect", complete: false, invalid: true };
    return {
      type: state.type,
      version: state.version,
      phase: state.phase,
      tool: state.tool,
      hostPaused: state.hostPaused,
      audioPending: state.audioPending,
      hostClock: state.hostClock,
      integrity: state.integrity,
      moves: state.moves,
      identified: [...state.identified],
      clues: [...state.clues],
      dust: clone(state.dust),
      stains: clone(state.stains),
      cracks: clone(state.cracks),
      blister: clone(state.blister),
      backFlipped: state.backFlipped,
      reveal: clone(state.reveal),
      revealOps: clone(state.revealOps),
      complete: state.complete,
      rating: state.rating,
      completionMode: state.completionMode,
      message: state.message
    };
  }

  return Object.freeze({ createState, applyAction, undo, reset, validateState, serialize, restore, hint, describe, getBlisterWindow, geometry, phases: [...PHASES] });
});
