(function (root, factory) {
  const conservation = typeof module === "object" && module.exports ? require("../conservation-interaction.js") : root?.RedbeardConservation;
  const api = factory(conservation);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RedbeardPuzzleLogic = api;
})(typeof window !== "undefined" ? window : globalThis, function (conservation) {
  "use strict";

  if (!conservation) throw new Error("Redbeard conservation interaction engine is required");

  const NODE_IDS = ["c1_puzzle", "c1_scratch", "c2_inspect", "c2_puzzle", "c3_puzzle", "c4_assembly"];
  const TYPES = {
    c1_puzzle: "storage",
    c1_scratch: "conservation",
    c2_inspect: "evidence",
    c2_puzzle: "gallery-deduction",
    c3_puzzle: "double-jigsaw",
    c4_assembly: "route-memory"
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const snapshot = state => {
    const copy = clone(state);
    delete copy._history;
    return copy;
  };
  const changed = (before, after) => {
    if (JSON.stringify(snapshot(before)) === JSON.stringify(snapshot(after))) return before;
    after._history = [...(before._history || []), snapshot(before)].slice(-80);
    return after;
  };

  function initialStorage() {
    return {
      type: TYPES.c1_puzzle,
      locations: { main: ["p1", "p2", "p3", "p4", "p5", "p6"], easelA: [], easelB: [], repair: [] },
      pieces: {
        p1: { label: "红胡子习作", size: 3, weight: 2, fragile: false, wet: false },
        p2: { label: "小幅素描", size: 1, weight: 1, fragile: false, wet: false },
        p3: { label: "河岸风景", size: 2, weight: 1, fragile: false, wet: false },
        p4: { label: "厚重肖像", size: 3, weight: 3, fragile: false, wet: false },
        p5: { label: "未干静物", size: 2, weight: 1, fragile: false, wet: true },
        p6: { label: "裂纹小画", size: 3, weight: 1, fragile: true, wet: false }
      },
      moves: 0, damage: 0, complete: false, rating: null, message: "先辨认最上层画作的状态。", _history: []
    };
  }

  function initialConservation() {
    return conservation.createState();
  }

  function initialEvidence() {
    return {
      type: TYPES.c2_inspect,
      traces: ["sole", "lace", "toe", "paint"],
      cards: ["labor", "repair", "weather", "studio", "poverty", "fashion"],
      phase: "discover",
      observed: [], matches: {}, submitted: false, complete: false, rating: null,
      explanation: [], moves: 0, message: "移动放大镜寻找没有预先标亮的痕迹。", _history: []
    };
  }

  function initialGallery() {
    return {
      type: TYPES.c2_puzzle,
      paintings: ["g1", "g2", "g3", "g4", "g5", "g6"],
      inspected: {}, marks: {}, reasons: {}, selected: null,
      inquiries: 3, conflicts: [], complete: false, rating: null, moves: 0,
      message: "逐幅检查正面和背面，再留下排除记录。", _history: []
    };
  }

  function initialJigsaw() {
    const rotations = Array.from({ length: 13 }, (_, index) => [0, 90, 180, 270][(index * 7 + Math.floor(Math.random() * 4)) % 4]);
    return {
      type: TYPES.c3_puzzle,
      face: "front",
      pieces: Array.from({ length: 13 }, (_, index) => ({
        id: index < 12 ? `j${index}` : "decoy",
        decoy: index === 12,
        rotation: rotations[index],
        targetSlot: index < 12 ? index : null,
        slot: null,
        placed: false
      })),
      frontComplete: false, backComplete: false, previewVisible: false,
      labelOptions: ["bernard", "year1888", "theo7", "otherFrame", "year1890"],
      labelAssignments: {}, labelMistakes: 0,
      previews: 2, moves: 0, complete: false, rating: null,
      message: "先从外框和画面边缘开始。", _history: []
    };
  }

  function initialRoute() {
    return {
      type: TYPES.c4_assembly,
      stage: "timeline",
      cards: ["tanguy", "cafe", "theo", "station", "paul"],
      timeline: [], excluded: [],
      locations: ["shop", "gallery", "paul", "cafe", "station", "river"],
      connections: [], conflict: "", output: [],
      complete: false, rating: null, moves: 0,
      message: "先按记录出现的时间排列三段记忆。", _history: []
    };
  }

  function createState(nodeId) {
    if (nodeId === "c1_puzzle") return initialStorage();
    if (nodeId === "c1_scratch") return initialConservation();
    if (nodeId === "c2_inspect") return initialEvidence();
    if (nodeId === "c2_puzzle") return initialGallery();
    if (nodeId === "c3_puzzle") return initialJigsaw();
    if (nodeId === "c4_assembly") return initialRoute();
    throw new Error(`Unknown puzzle node: ${nodeId}`);
  }

  function storageMoveReason(state, pieceId, destinationId) {
    if (!state?.pieces?.[pieceId]) return "这幅画不存在。";
    if (!state?.locations?.[destinationId]) return "这个位置不存在。";
    if (destinationId === "main") return "主堆只用于取画，不能放回。";
    const from = Object.keys(state.locations).find(location => state.locations[location].includes(pieceId));
    if (!from) return "找不到这幅画的位置。";
    if (from === destinationId) return "画已经在这个位置。";
    const source = state.locations[from];
    if (source[source.length - 1] !== pieceId) return "这幅画不是最上层，先移开压在上面的画。";
    const piece = state.pieces[pieceId];
    const destination = state.locations[destinationId];
    const capacity = destinationId === "repair" ? 1 : 3;
    if (destination.length >= capacity) return "这个位置容量已满。";
    if (piece.wet && destinationId !== "repair") return "未干画必须放到修复台。";
    if (!piece.wet && destinationId === "repair") return "修复台只留给未干画。";
    const support = state.pieces[destination[destination.length - 1]];
    if (support?.fragile) return "脆弱画不能承托其他画作。";
    if (support && support.size < piece.size) return "下方画幅尺寸不足，需要更大的支撑。";
    if (support && piece.weight === 3 && support.weight < 3) return "下方画作承重不足。";
    return "";
  }

  function applyStorage(state, action) {
    if (action.type !== "move" || storageMoveReason(state, action.piece, action.to)) return state;
    const from = Object.keys(state.locations).find(location => state.locations[location].includes(action.piece));
    const piece = state.pieces[action.piece];
    const next = snapshot(state);
    next.locations[from].pop();
    next.locations[action.to].push(action.piece);
    next.moves += 1;
    next.complete = next.locations.main.length === 1;
    next.rating = next.complete ? (next.moves <= 5 && next.damage === 0 ? "careful" : "steady") : null;
    const destinationNames = { easelA: "画架 A", easelB: "画架 B", repair: "修复台" };
    next.message = next.complete ? "底层画作已经安全显露。" : `${piece.label}已移至${destinationNames[action.to]}。`;
    return changed(state, next);
  }

  function applyConservation(state, action) {
    return conservation.applyAction(state, action);
  }

  const evidenceAnswer = { sole: "labor", lace: "repair", toe: "weather", paint: "studio" };
  function applyEvidence(state, action) {
    if (action.type === "observe" && state.traces.includes(action.trace) && !state.observed.includes(action.trace)) {
      const next = snapshot(state); next.observed.push(action.trace); next.moves += 1;
      if (next.observed.length === next.traces.length) { next.phase = "match"; next.message = "四条痕迹已发现，现在逐条匹配判断卡。"; }
      return changed(state, next);
    }
    if (action.type === "match" && state.phase === "match" && state.observed.length === 4 && state.observed.includes(action.trace) && state.cards.includes(action.card)) {
      if (state.matches[action.trace] === action.card) return state;
      if (Object.entries(state.matches).some(([trace, card]) => trace !== action.trace && card === action.card)) return state;
      const next = snapshot(state); next.matches[action.trace] = action.card; next.moves += 1; return changed(state, next);
    }
    if (action.type === "unmatch" && state.phase === "match" && Object.prototype.hasOwnProperty.call(state.matches, action.trace)) {
      const next = snapshot(state); delete next.matches[action.trace]; next.moves += 1; return changed(state, next);
    }
    if (action.type === "submit" && state.phase === "match" && state.traces.every(trace => state.matches[trace])) {
      const next = snapshot(state);
      const correct = Object.entries(next.matches).filter(([trace, card]) => evidenceAnswer[trace] === card).length;
      if (correct < 3) { next.message = "现有关系与痕迹冲突过多，请调整后再提交。"; return changed(state, next); }
      next.submitted = true; next.complete = true; next.rating = correct === 4 ? "recommended" : "partial";
      next.explanation = Object.entries(next.matches).map(([trace, card]) => ({ trace, card, relation: evidenceAnswer[trace] === card ? "supported" : "possible" }));
      next.message = correct === 4 ? "四组痕迹与判断互相印证。" : "部分关系成立，仍足以带着保留继续调查。";
      return changed(state, next);
    }
    return state;
  }

  const galleryFacts = {
    g1: ["size", "date"], g2: ["stamp", "subject"], g3: ["repair"], g4: [], g5: ["size", "stamp"], g6: ["date", "repair"]
  };
  function applyGallery(state, action) {
    if (action.type === "inspect" && state.paintings.includes(action.painting) && ["front", "back"].includes(action.side)) {
      const seen = state.inspected[action.painting] || [];
      if (seen.includes(action.side)) return state;
      const next = snapshot(state); next.inspected[action.painting] = [...seen, action.side]; next.moves += 1; return changed(state, next);
    }
    if (action.type === "mark" && state.paintings.includes(action.painting) && ["candidate", "excluded"].includes(action.mark)) {
      const inspected = state.inspected[action.painting] || [];
      if (!inspected.includes("front") || !inspected.includes("back")) return state;
      if (action.mark === "excluded" && !galleryReasons.includes(action.reason)) return state;
      const next = snapshot(state); next.marks[action.painting] = action.mark;
      if (action.mark === "excluded") next.reasons[action.painting] = action.reason;
      else delete next.reasons[action.painting];
      next.moves += 1; return changed(state, next);
    }
    if (action.type === "submit" && state.paintings.includes(action.painting)) {
      const allInspected = state.paintings.every(id => (state.inspected[id] || []).includes("front") && (state.inspected[id] || []).includes("back"));
      const allMarked = state.paintings.every(id => ["candidate", "excluded"].includes(state.marks[id]));
      const exclusionsReasoned = state.paintings.filter(id => state.marks[id] === "excluded").every(id => galleryReasons.includes(state.reasons[id]));
      const candidates = state.paintings.filter(id => state.marks[id] === "candidate");
      if (!allInspected || !allMarked || !exclusionsReasoned || candidates.length !== 1 || candidates[0] !== action.painting) return state;
      const next = snapshot(state); next.selected = action.painting; next.moves += 1;
      if (action.painting === "g4") {
        next.complete = true; next.rating = Object.keys(next.reasons).length >= 3 ? "documented" : "supported";
        next.conflicts = []; next.message = "委托条件与排除记录都指向这幅画。";
      } else {
        next.inquiries = Math.max(0, next.inquiries - 1);
        next.conflicts = galleryFacts[action.painting].length ? [...galleryFacts[action.painting]] : ["record"];
        next.message = "这幅画与委托条件有冲突，可以继续核对。";
      }
      return changed(state, next);
    }
    return state;
  }

  function applyJigsaw(state, action) {
    if (action.type === "preview" && state.previews > 0) {
      const next = snapshot(state); next.previews -= 1; next.previewVisible = true; next.message = "完整画面预览将在三秒后收起。"; return changed(state, next);
    }
    if (action.type === "hidePreview" && state.previewVisible) {
      const next = snapshot(state); next.previewVisible = false; return changed(state, next);
    }
    if (action.type === "rotate") {
      const index = state.pieces.findIndex(piece => piece.id === action.piece);
      if (index < 0 || state.pieces[index].placed) return state;
      const next = snapshot(state); next.pieces[index].rotation = (next.pieces[index].rotation + 90) % 360; next.moves += 1; return changed(state, next);
    }
    if (action.type === "place") {
      const index = state.pieces.findIndex(piece => piece.id === action.piece);
      if (index < 0 || state.pieces[index].decoy || state.pieces[index].placed) return state;
      const piece = state.pieces[index];
      const target = Number(action.slot);
      if (target !== piece.targetSlot || piece.rotation !== 0 || state.pieces.some(item => item.placed && item.slot === target)) return state;
      const next = snapshot(state); next.pieces[index].slot = target; next.pieces[index].placed = true; next.moves += 1;
      if (next.pieces.filter(item => !item.decoy).every(item => item.placed)) {
        if (next.face === "front") { next.frontComplete = true; next.message = "正面已经拼合，翻到背面继续修复。"; }
        else { next.backComplete = true; next.face = "labels"; next.message = "正背面拼接完成，现在核对背面五张标签。"; }
      }
      return changed(state, next);
    }
    if (state.face === "front" && action.type === "flip" && state.frontComplete) {
      const next = snapshot(state); next.face = "back"; next.previewVisible = false; next.moves += 1;
      next.pieces.forEach((piece, index) => {
        piece.placed = false; piece.slot = null; piece.rotation = [90, 180, 270, 0][(index * 5 + next.moves) % 4];
        piece.targetSlot = piece.decoy ? null : 11 - Number(piece.id.slice(1));
      });
      next.message = "画布已翻到背面，十二块需要重新旋转和拼接。";
      return changed(state, next);
    }
    if (action.type === "assignLabel") {
      const reason = labelActionReason(state, action.label, action.destination);
      if (reason) return state;
      const next = snapshot(state); next.labelAssignments[action.label] = action.destination; next.moves += 1; next.message = "标签判定已记录，继续覆盖其余标签。"; return changed(state, next);
    }
    if (state.face === "labels" && action.type === "submitLabels" && state.labelOptions.every(label => state.labelAssignments[label])) {
      const answers = { bernard: "stamp", year1888: "date", theo7: "number", otherFrame: "reject", year1890: "reject" };
      const next = snapshot(state); next.moves += 1;
      if (!Object.entries(answers).every(([label, destination]) => next.labelAssignments[label] === destination)) {
        next.labelMistakes += 1; next.message = "至少一张标签与背面区域冲突，可重新放置。"; return changed(state, next);
      }
      next.complete = true; next.rating = next.previews === 2 && next.labelMistakes === 0 ? "observant" : "assisted"; next.message = "正背面与全部标签都已完成修复。"; return changed(state, next);
    }
    return state;
  }

  const labelDestinations = ["stamp", "date", "number", "reject"];
  function labelActionReason(state, label, destination) {
    if (state?.face !== "labels") return "背面拼接完成后才能处理标签。";
    if (!state.labelOptions?.includes(label)) return "未知标签，已拒绝记录。";
    if (!labelDestinations.includes(destination)) return "未知标签区域，已拒绝记录。";
    if (state.labelAssignments[label] === destination) return "该标签已在这个区域。";
    if (destination !== "reject" && Object.entries(state.labelAssignments).some(([other, assigned]) => other !== label && assigned === destination)) return "该背面区域已有标签，请先移动原标签。";
    return "";
  }

  const timelineAnswer = ["tanguy", "theo", "paul"];
  const routeEdges = ["shop>gallery", "gallery>paul"];
  function applyRoute(state, action) {
    if (state.stage === "timeline" && action.type === "timeline" && state.cards.includes(action.memory)) {
      if (state.timeline.includes(action.memory) || state.excluded.includes(action.memory) || state.timeline.length >= 3) return state;
      const next = snapshot(state); next.timeline.push(action.memory); next.moves += 1;
      if (next.timeline.length === 3 && next.excluded.length === 2) {
        if (next.timeline.every((item, index) => item === timelineAnswer[index]) && ["cafe", "station"].every(item => next.excluded.includes(item))) { next.stage = "map"; next.message = "时间顺序与排除记录成立。现在点击地点重看档案，并连接三段证据链。"; }
        else next.message = "时间卡或排除项与画框、收据和地址证据冲突，可撤下后修正。";
      }
      return changed(state, next);
    }
    if (state.stage === "timeline" && action.type === "excludeMemory" && state.cards.includes(action.memory)) {
      if (state.timeline.includes(action.memory) || state.excluded.includes(action.memory)) return state;
      const next = snapshot(state); next.excluded.push(action.memory); next.moves += 1;
      if (next.timeline.length === 3 && next.excluded.length === 2) {
        if (next.timeline.every((item, index) => item === timelineAnswer[index]) && ["cafe", "station"].every(item => next.excluded.includes(item))) { next.stage = "map"; next.message = "时间顺序与排除记录成立。现在点击地点重看档案，并连接三段证据链。"; }
        else next.message = "时间卡或排除项与现有证据冲突，可撤下后修正。";
      }
      return changed(state, next);
    }
    if (state.stage === "timeline" && action.type === "removeMemory" && state.cards.includes(action.memory)) {
      if (!state.timeline.includes(action.memory) && !state.excluded.includes(action.memory)) return state;
      const next = snapshot(state); next.timeline = next.timeline.filter(item => item !== action.memory); next.excluded = next.excluded.filter(item => item !== action.memory); next.moves += 1; next.message = "卡片已撤下，可以重新判断。"; return changed(state, next);
    }
    if (state.stage === "map" && action.type === "connect") {
      const directKey = `${action.from}>${action.to}`;
      const reverseKey = `${action.to}>${action.from}`;
      const key = routeEdges.includes(directKey) ? directKey : routeEdges.includes(reverseKey) ? reverseKey : directKey;
      if (!state.locations.includes(action.from) || !state.locations.includes(action.to) || action.from === action.to || state.connections.includes(key)) return state;
      const next = snapshot(state); next.moves += 1;
      if (!routeEdges.includes(key)) { next.conflict = "这条连线与画框记录、画廊编号或保罗地址冲突。"; return changed(state, next); }
      next.connections.push(key); next.conflict = "";
      if (next.connections.length === routeEdges.length) {
        next.complete = true; next.rating = "reconstructed";
        next.output = [
          { route: "shop>gallery", certainty: "confirmed" },
          { route: "gallery>paul", certainty: "inferred" },
          { route: "paul", certainty: "unknown" }
        ];
        next.message = "路线已按确认、推测和未知分层。";
      }
      return changed(state, next);
    }
    return state;
  }

  function applyAction(nodeId, state, action) {
    if (!state || state.type !== TYPES[nodeId] || !action || typeof action !== "object") return state;
    if (nodeId === "c1_puzzle") return applyStorage(state, action);
    if (nodeId === "c1_scratch") return applyConservation(state, action);
    if (nodeId === "c2_inspect") return applyEvidence(state, action);
    if (nodeId === "c2_puzzle") return applyGallery(state, action);
    if (nodeId === "c3_puzzle") return applyJigsaw(state, action);
    if (nodeId === "c4_assembly") return applyRoute(state, action);
    return state;
  }

  function undo(nodeId, state) {
    if (!state || state.type !== TYPES[nodeId] || !state._history?.length) return state;
    const history = [...state._history];
    const previous = clone(history.pop()); previous._history = history.map(item => clone(item)); return previous;
  }
  function reset(nodeId) { return createState(nodeId); }

  const isRecord = value => Boolean(value) && typeof value === "object" && !Array.isArray(value) && !value.nodeType;
  const isIntegerIn = (value, minimum, maximum) => Number.isInteger(value) && value >= minimum && value <= maximum;
  const uniqueSubset = (items, allowed) => Array.isArray(items) && new Set(items).size === items.length && items.every(item => allowed.includes(item));
  const exactIdList = (items, expected) => uniqueSubset(items, expected) && items.length === expected.length && expected.every(item => items.includes(item));
  const keysAreSubset = (record, allowed) => isRecord(record) && Object.keys(record).every(key => allowed.includes(key));
  const commonSnapshotIsValid = (value, type, ratings) => isRecord(value)
    && value.type === type
    && typeof value.complete === "boolean"
    && (value.rating === null || ratings.includes(value.rating))
    && typeof value.message === "string"
    && isIntegerIn(value.moves, 0, 100000);

  const paintingIds = ["p1", "p2", "p3", "p4", "p5", "p6"];
  const storageLocations = ["main", "easelA", "easelB", "repair"];
  function validateStorage(value) {
    if (!commonSnapshotIsValid(value, TYPES.c1_puzzle, ["careful", "steady"])) return false;
    if (!isRecord(value.locations) || !storageLocations.every(location => Array.isArray(value.locations[location])) || Object.keys(value.locations).some(key => !storageLocations.includes(key))) return false;
    const located = storageLocations.flatMap(location => value.locations[location]);
    if (!exactIdList(located, paintingIds)) return false;
    if (!isRecord(value.pieces) || !exactIdList(Object.keys(value.pieces), paintingIds)) return false;
    for (const id of paintingIds) {
      const piece = value.pieces[id];
      if (!isRecord(piece) || typeof piece.label !== "string" || !isIntegerIn(piece.size, 1, 3) || !isIntegerIn(piece.weight, 1, 3) || typeof piece.fragile !== "boolean" || typeof piece.wet !== "boolean") return false;
    }
    if (!isIntegerIn(value.damage, 0, 100)) return false;
    const solved = value.locations.main.length === 1;
    return value.complete === solved && (solved ? ["careful", "steady"].includes(value.rating) : value.rating === null);
  }

  function validateConservation(value) {
    return conservation.validateState(value);
  }

  const evidenceTraces = ["sole", "lace", "toe", "paint"];
  const evidenceCards = ["labor", "repair", "weather", "studio", "poverty", "fashion"];
  function validateEvidence(value) {
    if (!commonSnapshotIsValid(value, TYPES.c2_inspect, ["recommended", "partial"])) return false;
    if (!exactIdList(value.traces, evidenceTraces) || !exactIdList(value.cards, evidenceCards) || !uniqueSubset(value.observed, evidenceTraces) || !["discover", "match"].includes(value.phase) || typeof value.submitted !== "boolean") return false;
    if (!keysAreSubset(value.matches, evidenceTraces)) return false;
    for (const [trace, card] of Object.entries(value.matches)) if (!value.observed.includes(trace) || !evidenceCards.includes(card)) return false;
    if (new Set(Object.values(value.matches)).size !== Object.values(value.matches).length) return false;
    if (!Array.isArray(value.explanation)) return false;
    if (!value.explanation.every(item => isRecord(item) && evidenceTraces.includes(item.trace) && evidenceCards.includes(item.card) && ["supported", "possible"].includes(item.relation))) return false;
    if ((value.phase === "discover") !== (value.observed.length < 4)) return false;
    if (value.complete !== value.submitted || (value.complete && (Object.keys(value.matches).length !== 4 || !["recommended", "partial"].includes(value.rating))) || (!value.complete && value.rating !== null)) return false;
    return true;
  }

  const galleryIds = ["g1", "g2", "g3", "g4", "g5", "g6"];
  const galleryReasons = ["size", "stamp", "date", "repair", "subject", "尺寸", "厂印", "日期", "修补", "题材"];
  function validateDeduction(value) {
    if (!commonSnapshotIsValid(value, TYPES.c2_puzzle, ["documented", "supported"])) return false;
    if (!exactIdList(value.paintings, galleryIds) || !keysAreSubset(value.inspected, galleryIds) || !keysAreSubset(value.marks, galleryIds) || !keysAreSubset(value.reasons, galleryIds)) return false;
    for (const sides of Object.values(value.inspected)) if (!uniqueSubset(sides, ["front", "back"])) return false;
    for (const mark of Object.values(value.marks)) if (!["candidate", "excluded"].includes(mark)) return false;
    for (const reason of Object.values(value.reasons)) if (!galleryReasons.includes(reason)) return false;
    if (value.selected !== null && !galleryIds.includes(value.selected)) return false;
    if (!isIntegerIn(value.inquiries, 0, 3) || !uniqueSubset(value.conflicts, ["size", "date", "stamp", "subject", "repair", "record"])) return false;
    for (const id of galleryIds) if (value.marks[id] === "excluded" && !galleryReasons.includes(value.reasons[id])) return false;
    if (value.complete) {
      if (value.selected !== "g4" || value.rating === null || galleryIds.some(id => !(value.inspected[id] || []).includes("front") || !(value.inspected[id] || []).includes("back")) || galleryIds.some(id => !["candidate", "excluded"].includes(value.marks[id])) || galleryIds.filter(id => value.marks[id] === "candidate").join() !== "g4") return false;
    } else if (value.rating !== null) return false;
    return true;
  }

  const jigsawIds = Array.from({ length: 12 }, (_, index) => `j${index}`).concat("decoy");
  const jigsawRotations = [0, 90, 180, 270];
  function validateRestoration(value) {
    if (!commonSnapshotIsValid(value, TYPES.c3_puzzle, ["observant", "assisted"])) return false;
    if (!["front", "back", "labels"].includes(value.face) || !Array.isArray(value.pieces) || value.pieces.length !== 13 || !exactIdList(value.pieces.map(piece => piece?.id), jigsawIds)) return false;
    const placedSlots = [];
    for (const piece of value.pieces) {
      if (!isRecord(piece) || typeof piece.decoy !== "boolean" || piece.decoy !== (piece.id === "decoy") || !jigsawRotations.includes(piece.rotation) || typeof piece.placed !== "boolean") return false;
      if (piece.slot !== null && !isIntegerIn(piece.slot, 0, 11)) return false;
      if (piece.targetSlot !== null && !isIntegerIn(piece.targetSlot, 0, 11)) return false;
      if (piece.decoy !== (piece.targetSlot === null)) return false;
      if (piece.placed) {
        if (piece.decoy || piece.slot === null || piece.slot !== piece.targetSlot || piece.rotation !== 0) return false;
        placedSlots.push(piece.slot);
      }
    }
    const labelIds = ["bernard", "year1888", "theo7", "otherFrame", "year1890"];
    if (new Set(placedSlots).size !== placedSlots.length || typeof value.frontComplete !== "boolean" || typeof value.backComplete !== "boolean" || typeof value.previewVisible !== "boolean" || !exactIdList(value.labelOptions, labelIds) || !keysAreSubset(value.labelAssignments, labelIds) || !isIntegerIn(value.labelMistakes, 0, 1000)) return false;
    for (const destination of Object.values(value.labelAssignments)) if (!labelDestinations.includes(destination)) return false;
    for (const destination of ["stamp", "date", "number"]) if (Object.values(value.labelAssignments).filter(value => value === destination).length > 1) return false;
    if (!isIntegerIn(value.previews, 0, 2)) return false;
    const allPlaced = value.pieces.filter(piece => !piece.decoy).every(piece => piece.placed);
    if (value.face === "front" && (value.backComplete || value.complete || value.rating !== null || value.frontComplete !== allPlaced)) return false;
    if (value.face === "back" && (!value.frontComplete || value.backComplete || allPlaced || value.complete || value.rating !== null)) return false;
    if (value.face === "labels") {
      const answers = { bernard: "stamp", year1888: "date", theo7: "number", otherFrame: "reject", year1890: "reject" };
      const labelsCorrect = Object.entries(answers).every(([label, destination]) => value.labelAssignments[label] === destination);
      if (!value.frontComplete || !value.backComplete || !allPlaced || (value.complete && !labelsCorrect) || (value.complete ? !["observant", "assisted"].includes(value.rating) : value.rating !== null)) return false;
    }
    return true;
  }

  const routeMemories = ["tanguy", "theo", "paul", "cafe", "station"];
  const routeLocations = ["shop", "gallery", "paul", "cafe", "station", "river"];
  const routeConnections = ["shop>gallery", "gallery>paul"];
  function validateRoute(value) {
    if (!commonSnapshotIsValid(value, TYPES.c4_assembly, ["reconstructed"])) return false;
    if (!["timeline", "map"].includes(value.stage) || !exactIdList(value.cards, routeMemories) || !uniqueSubset(value.timeline, routeMemories) || !uniqueSubset(value.excluded, routeMemories) || value.timeline.some(item => value.excluded.includes(item)) || !exactIdList(value.locations, routeLocations) || !uniqueSubset(value.connections, routeConnections) || typeof value.conflict !== "string" || !Array.isArray(value.output)) return false;
    if (!value.output.every(item => isRecord(item) && routeConnections.concat("paul").includes(item.route) && ["confirmed", "inferred", "unknown"].includes(item.certainty))) return false;
    if (value.stage === "map" && (!timelineAnswer.every((item, index) => value.timeline[index] === item) || !["cafe", "station"].every(item => value.excluded.includes(item)))) return false;
    if (value.complete !== (value.connections.length === 2) || (value.complete ? value.rating !== "reconstructed" || value.output.length !== 3 : value.rating !== null)) return false;
    return true;
  }

  const snapshotValidators = {
    c1_puzzle: validateStorage,
    c1_scratch: validateConservation,
    c2_inspect: validateEvidence,
    c2_puzzle: validateDeduction,
    c3_puzzle: validateRestoration,
    c4_assembly: validateRoute
  };

  function validateSnapshot(nodeId, value) {
    const validator = snapshotValidators[nodeId];
    if (!validator || !validator(value)) return false;
    if (value._history === undefined) return true;
    return Array.isArray(value._history) && value._history.length <= 80 && value._history.every(previous => validator(previous));
  }

  function validateState(raw) {
    const result = { puzzleStates: {}, puzzleHintStages: {}, puzzleRatings: {} };
    const states = raw && typeof raw.puzzleStates === "object" ? raw.puzzleStates : {};
    for (const id of NODE_IDS) {
      const value = id === "c1_scratch" && states[id]?.version === 2 ? conservation.restore(states[id]) : states[id];
      if (validateSnapshot(id, value)) result.puzzleStates[id] = clone(value);
    }
    const stages = raw && typeof raw.puzzleHintStages === "object" ? raw.puzzleHintStages : {};
    for (const id of NODE_IDS) result.puzzleHintStages[id] = Math.max(0, Math.min(3, Number.isFinite(Number(stages[id])) ? Math.floor(Number(stages[id])) : 0));
    const ratings = raw && typeof raw.puzzleRatings === "object" ? raw.puzzleRatings : {};
    for (const id of NODE_IDS) if (typeof ratings[id] === "string") result.puzzleRatings[id] = ratings[id];
    return result;
  }

  function serializeState(states) { return JSON.stringify(states); }
  function restoreState(serialized) {
    try {
      const parsed = typeof serialized === "string" ? JSON.parse(serialized) : clone(serialized);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
  }
  function nextHint(container, nodeId) {
    const next = clone(container || {});
    next.puzzleHintStages ||= {};
    next.puzzleHintStages[nodeId] = Math.min(3, (Number(next.puzzleHintStages[nodeId]) || 0) + 1);
    return next;
  }

  function describe(nodeId, state) {
    const common = { type: TYPES[nodeId], complete: Boolean(state?.complete), moves: Number(state?.moves || 0), rating: state?.rating || null, message: state?.message || "" };
    if (nodeId === "c1_puzzle") return { ...common, locations: clone(state.locations), damage: state.damage };
    if (nodeId === "c1_scratch") return conservation.describe(state);
    if (nodeId === "c2_inspect") return { ...common, phase: state.phase, observed: [...state.observed], matches: clone(state.matches), cards: [...state.cards], tracesRemaining: state.traces.filter(trace => !state.observed.includes(trace)), incompleteReason: state.observed.length < 4 ? `还需发现${4 - state.observed.length}条痕迹` : Object.keys(state.matches).length < 4 ? `还需匹配${4 - Object.keys(state.matches).length}条关系` : "可以提交" };
    if (nodeId === "c2_puzzle") return { ...common, inspected: clone(state.inspected), marks: clone(state.marks), reasons: clone(state.reasons), inquiries: state.inquiries, conflicts: [...state.conflicts] };
    if (nodeId === "c3_puzzle") return { ...common, face: state.face, pieces: state.pieces.map(piece => ({ id: piece.id, decoy: piece.decoy, rotation: piece.rotation, targetSlot: piece.targetSlot, slot: piece.slot, placed: piece.placed })), frontComplete: state.frontComplete, backComplete: state.backComplete, previewVisible: state.previewVisible, previews: state.previews, labelOptions: [...state.labelOptions], labelAssignments: clone(state.labelAssignments), labelMistakes: state.labelMistakes };
    if (nodeId === "c4_assembly") return { ...common, stage: state.stage, cards: [...state.cards], timeline: [...state.timeline], excluded: [...state.excluded], locations: [...state.locations], connections: [...state.connections], conflict: state.conflict, output: clone(state.output) };
    return common;
  }

  const knownSolutions = {
    c1_puzzle: [
      { type: "move", piece: "p6", to: "easelA" },
      { type: "move", piece: "p5", to: "repair" },
      { type: "move", piece: "p4", to: "easelB" },
      { type: "move", piece: "p3", to: "easelB" },
      { type: "move", piece: "p2", to: "easelB" }
    ],
    c1_scratch: (() => {
      const actions = [];
      Object.values(conservation.geometry.inspectTargets).forEach(point => actions.push({ type: "inspectLight", ...point }));
      conservation.geometry.dustLanes.forEach(y => actions.push({ type: "dustStroke", points: [{ x: .1, y, t: 0 }, { x: .48, y, t: 325 }, { x: .9, y, t: 650 }] }));
      for (const [stain, config] of Object.entries(conservation.geometry.stains)) {
        for (const ring of ["outer", "inner"]) {
          for (let quarter = 0; quarter < 4; quarter += 1) {
            const points = Array.from({ length: 7 }, (_, index) => {
              const angle = quarter * Math.PI / 2 + index * Math.PI / 12;
              return { x: config.center.x + Math.cos(angle) * config[ring], y: config.center.y + Math.sin(angle) * config[ring] };
            });
            actions.push({ type: "stainArc", stain, ring, points });
          }
        }
      }
      conservation.geometry.cracks.forEach((crack, crackIndex) => {
        crack.trace.forEach((_, node) => actions.push({ type: "traceCrackNode", crack: crackIndex, node }));
        crack.press.forEach(node => actions.push({ type: "pressCrackNode", crack: crackIndex, node }));
      });
      conservation.geometry.blisters.forEach((config, group) => {
        let previous = 0;
        config.windows.forEach(center => {
          actions.push({ type: "tick", ms: center - previous });
          actions.push({ type: "clickBlister", group });
          previous = center;
        });
      });
      actions.push({ type: "flipBack" });
      for (const [target, config] of Object.entries(conservation.geometry.revealTargets)) {
        config.lanes.forEach(y => actions.push({ type: "revealStroke", target, points: [{ x: config.x0, y }, { x: config.x1, y }] }));
      }
      return actions;
    })(),
    c2_inspect: [
      { type: "observe", trace: "sole" }, { type: "observe", trace: "lace" }, { type: "observe", trace: "toe" }, { type: "observe", trace: "paint" },
      { type: "match", trace: "sole", card: "labor" }, { type: "match", trace: "lace", card: "repair" },
      { type: "match", trace: "toe", card: "weather" }, { type: "match", trace: "paint", card: "studio" }, { type: "submit" }
    ],
    c2_puzzle: [
      { type: "inspect", painting: "g1", side: "front" }, { type: "inspect", painting: "g1", side: "back" }, { type: "mark", painting: "g1", mark: "excluded", reason: "date" },
      { type: "inspect", painting: "g2", side: "back" }, { type: "mark", painting: "g2", mark: "excluded", reason: "stamp" },
      { type: "inspect", painting: "g3", side: "front" }, { type: "mark", painting: "g3", mark: "excluded", reason: "repair" },
      { type: "inspect", painting: "g4", side: "front" }, { type: "inspect", painting: "g4", side: "back" }, { type: "mark", painting: "g4", mark: "candidate" }, { type: "submit", painting: "g4" }
    ],
    c3_puzzle: Array.from({ length: 12 }, (_, index) => [
      ...Array.from({ length: [0, 1, 2, 3, 1, 2, 3, 0, 2, 3, 0, 1][index] }, () => ({ type: "rotate", piece: `j${index}` })),
      { type: "place", piece: `j${index}`, slot: index }
    ]).flat().concat([
      { type: "flip" },
      { type: "assignLabel", label: "bernard", destination: "stamp" },
      { type: "assignLabel", label: "year1888", destination: "date" },
      { type: "assignLabel", label: "theo7", destination: "number" },
      { type: "assignLabel", label: "otherFrame", destination: "reject" },
      { type: "assignLabel", label: "year1890", destination: "reject" },
      { type: "submitLabels" }
    ]),
    c4_assembly: [
      { type: "timeline", memory: "tanguy" }, { type: "timeline", memory: "theo" }, { type: "timeline", memory: "paul" },
      { type: "excludeMemory", memory: "cafe" }, { type: "excludeMemory", memory: "station" },
      { type: "connect", from: "shop", to: "gallery" }, { type: "connect", from: "gallery", to: "paul" }
    ]
  };

  return Object.freeze({ createState, validateState, validateSnapshot, serializeState, restoreState, applyAction, undo, reset, nextHint, describe, storageMoveReason, labelActionReason, knownSolutions, nodeIds: [...NODE_IDS] });
});
