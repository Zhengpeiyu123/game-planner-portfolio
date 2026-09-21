(function () {
  "use strict";

  const logic = window.RedbeardPuzzleLogic;
  const conservation = window.RedbeardConservation;
  const gameplayAssets = window.RedbeardGameplayAssets;
  if (!logic) throw new Error("Redbeard puzzle logic is required");
  if (!conservation || !gameplayAssets) throw new Error("Redbeard conservation assets and interaction engine are required");

  const labels = {
    main: "主堆", easelA: "画架 A", easelB: "画架 B",
    brush: "软刷", swab: "棉签", cloth: "清洁布",
    sole: "鞋底磨痕", lace: "反复系补", toe: "鞋头裂纹", paint: "颜料飞点",
    labor: "长期劳动", repair: "多次修补", weather: "风雨侵蚀", studio: "画室作业", poverty: "贫穷身份", fashion: "时髦装饰",
    g1: "河畔晨雾", g2: "黄房子", g3: "果园", g4: "无名旧靴", g5: "夜间咖啡馆", g6: "花瓶与书",
    tanguy: "唐吉画框记录", theo: "提奥收据和画廊编号", paul: "保罗地址", cafe: "咖啡馆传闻", station: "车站便笺",
    shop: "唐吉画材店", gallery: "贝尔纳画廊", river: "河畔仓库",
    "shop>gallery": "画材店到画廊", "gallery>paul": "画廊到保罗住处"
  };
  const locationLabels = { main: "主堆", easelA: "画架 A", easelB: "画架 B", repair: "修复台" };
  const evidenceAnchors = Object.freeze({
    sole: Object.freeze({ x:.46, y:.82 }),
    lace: Object.freeze({ x:.47, y:.55 }),
    toe: Object.freeze({ x:.76, y:.75 }),
    paint: Object.freeze({ x:.72, y:.15 })
  });
  const routeDossiers = Object.freeze({
    shop: Object.freeze({ title:"唐吉画材店", image:"assets/images/backgrounds/chapter-1.png", witness:"唐吉老爹", event:"发现无名画，并在画框背面取得贝尔纳厂印与1888日期。", evidence:"画框记录、无名画、贝尔纳厂印", gameplay:"画框仓储与画作修复" }),
    gallery: Object.freeze({ title:"贝尔纳画廊", image:"assets/images/paintings-worn-boots.png", witness:"提奥", event:"旧靴画证明画家关注劳动者；画廊收据和编号把线索指向高更。", evidence:"提奥收据、画廊编号、旧靴证据", gameplay:"放大镜证据与委托单排除" }),
    paul: Object.freeze({ title:"保罗住址", image:"assets/images/backgrounds/chapter-3.png", witness:"保罗 高更", event:"高更确认画风与争论，并交出梵高最后地址。", evidence:"高更证词、画风判断、最后地址", gameplay:"木雕稳固与双面拼画" }),
    cafe: Object.freeze({ title:"咖啡馆传闻", image:"assets/images/backgrounds/chapter-4.png", witness:"无正式见证人", event:"只有传闻，没有画框、收据或地址可以交叉验证。", evidence:"不可核验的口述", gameplay:"应排除" }),
    station: Object.freeze({ title:"车站便笺", image:"assets/images/backgrounds/title.png", witness:"来源不明", event:"便笺没有署名，也没有与画作对应的编号。", evidence:"来源不明的纸条", gameplay:"应排除" }),
    river: Object.freeze({ title:"河畔仓库", image:"assets/images/backgrounds/chapter-2.png", witness:"无", event:"与前三章人物、画作和地址均无对应记录。", evidence:"没有证据支持", gameplay:"错误地点" })
  });
  const goals = {
    c1_puzzle: "安全移开上层五幅画，让底层红胡子习作显露",
    c1_scratch: "先用侧光判断表层，再显露贝尔纳印记和日期",
    c2_inspect: "用放大镜发现痕迹，并把痕迹与判断卡对应",
    c2_puzzle: "按委托单逐幅核对正背面，提交唯一符合的画作及排除记录",
    c3_puzzle: "拼合十二块正面画面，剔除干扰块，翻面后再拼合背面",
    c4_assembly: "先重建证据时间轴，再连接地点并区分确定程度"
  };
  const hints = {
    c1_puzzle: ["先看主堆最上方，未干的画只能进入修复台。", "裂纹画不能承托其他画，厚重画适合作为画架底层。", "依次处理裂纹小画、未干静物、厚重肖像，再把较小画放到厚重画上。"],
    c1_scratch: ["先拖动侧光带扫过画面起伏，记录纸只会写下已经发现的病害。", "软刷保持左到右稳定刷速；棉签贴边做短圆周；裂迹要先描后压。", "四组凸点各有不同节奏，完成后翻背面沿纤维刷出厂印与日期。"],
    c2_inspect: ["放大镜经过鞋底、鞋带、鞋头和右侧颜料点时才能记录。", "先点痕迹，再点一张判断卡建立对应。", "推荐关系是鞋底对应劳动、鞋带对应修补、鞋头对应风雨、颜料点对应画室。"],
    c2_puzzle: ["每幅画的正面和背面信息不同，至少留下一条排除记录。", "委托要求中等尺寸、贝尔纳画框厂印、1888 年、右下修补和劳动题材。", "无名旧靴满足全部条件；提交前给其他画记录日期、厂印或修补冲突。"],
    c3_puzzle: ["先找四角和连续边缘，界面不显示正确块数。", "选中画布后每次旋转 90 度，再选择轮廓连续的槽位；干扰块两面都无位置。", "背面拼好后，厂印、日期和编号各放一张相符标签，其余两张判为不属于。"],
    c4_assembly: ["先按唐吉、提奥、保罗的证据出现顺序排列。", "时间轴确认后，连接画材店、画廊、保罗住处和最后地址。", "前段是确认，中段是推测，最后地址仍应标为未知。"]
  };

  let context = null;
  let selected = null;
  let magnifierTrace = null;
  let selectedLocation = null;
  let conservationClockMark = performance.now();
  let conservationDeterministicClock = false;
  let storageGuideReplay = false;
  let storagePointerDrag = null;
  let suppressStorageClickUntil = 0;
  let conservationGuideReplayPhase = null;
  let conservationDirectHintPhase = null;
  let conservationLiveTrace = null;
  let activeHint = null;
  let guidedHintNode = null;
  const conservationCursor = { x: .5, y: .5 };
  const conservationImageCache = new Map();
  const completionMediaDismissed = new Set();
  const completionMediaFailed = new Set();
  let completionMediaObserver = null;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, action, className = "") => {
    const node = el("button", `overhaul-button ${className}`.trim(), text);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  };
  const currentState = () => context.state.puzzleStates[context.nodeId];
  function flashError(message) {
    context.toast(message);
    const surface = context.content.querySelector(".overhaul");
    const status = context.content.querySelector(".overhaul-status");
    if (status) { status.textContent = message; status.setAttribute("role", "alert"); }
    surface?.classList.add("is-error");
    (window.__redbeardHostTimers?.setTimeout || window.setTimeout)(() => surface?.classList.remove("is-error"), 240);
  }

  function ensureState() {
    context.state.puzzleStates ||= {};
    context.state.puzzleHintStages ||= {};
    context.state.puzzleRatings ||= {};
    const candidate = context.state.puzzleStates[context.nodeId];
    if (context.nodeId === "c1_scratch" && !candidate) {
      context.state.puzzleStates[context.nodeId] = conservation.createState();
    } else if (context.nodeId === "c1_scratch" && !logic.validateSnapshot(context.nodeId, candidate)) {
      context.state.puzzleStates[context.nodeId] = conservation.restore(candidate);
    } else if (!candidate || candidate.type !== logic.createState(context.nodeId).type) context.state.puzzleStates[context.nodeId] = logic.createState(context.nodeId);
  }

  function dispatch(action) {
    activeHint = null;
    conservationDirectHintPhase = null;
    const before = currentState();
    const restoreCanvasFocus = document.activeElement?.classList.contains("conservation-picture");
    const next = logic.applyAction(context.nodeId, before, action);
    if (next === before) {
      context.audio.play("error");
      flashError(context.nodeId === "c1_scratch" ? phaseInputError(before) : "这一步不符合当前规则，状态没有改变。");
      return;
    }
    if (before.phase !== "blister" && next.phase === "blister") { conservationClockMark = performance.now(); conservationDeterministicClock = false; }
    if (before.phase !== next.phase) { conservationGuideReplayPhase = null; conservationLiveTrace = null; }
    context.state.puzzleStates[context.nodeId] = next;
    if (next.complete) context.state.puzzleRatings[context.nodeId] = next.rating || "complete";
    else delete context.state.puzzleRatings[context.nodeId];
    context.setProgress(next.complete ? 1 : 0);
    context.save();
    context.audio.play(next.complete ? "discover" : "place");
    renderCurrent();
    if (restoreCanvasFocus) requestAnimationFrame(() => context?.content.querySelector(".conservation-picture")?.focus({ preventScroll: true }));
    if (action.type === "preview" && next.previewVisible) {
      const previewNode = context.nodeId;
      (window.__redbeardHostTimers?.setTimeout || window.setTimeout)(() => {
        if (context?.nodeId === previewNode && currentState()?.previewVisible) dispatch({ type: "hidePreview" });
      }, 3000);
    }
  }

  function dispatchMany(actions) {
    activeHint = null;
    conservationDirectHintPhase = null;
    const before = currentState();
    const restoreCanvasFocus = document.activeElement?.classList.contains("conservation-picture");
    let next = before;
    for (const action of actions) next = logic.applyAction(context.nodeId, next, action);
    if (next === before) {
      context.audio.play("error");
      flashError(context.nodeId === "c1_scratch" ? phaseInputError(before) : "这一步不符合当前规则，状态没有改变。");
      return;
    }
    if (before.phase !== "blister" && next.phase === "blister") { conservationClockMark = performance.now(); conservationDeterministicClock = false; }
    if (before.phase !== next.phase) { conservationGuideReplayPhase = null; conservationLiveTrace = null; }
    context.state.puzzleStates[context.nodeId] = next;
    if (next.complete) context.state.puzzleRatings[context.nodeId] = next.rating || "complete";
    else delete context.state.puzzleRatings[context.nodeId];
    context.setProgress(next.complete ? 1 : 0);
    context.save();
    context.audio.play(next.complete ? "discover" : "place");
    renderCurrent();
    if (restoreCanvasFocus) requestAnimationFrame(() => context?.content.querySelector(".conservation-picture")?.focus({ preventScroll: true }));
  }

  function syncConservationRealClock() {
    if (!context || context.nodeId !== "c1_scratch") return;
    const state = currentState();
    const now = performance.now();
    if (state.phase === "blister" && !conservationDeterministicClock && !state.hostPaused && !state.audioPending) {
      context.state.puzzleStates[context.nodeId] = logic.applyAction(context.nodeId, state, { type: "tick", ms: Math.max(0, now - conservationClockMark) });
    }
    conservationClockMark = now;
  }

  function syncBlisterIndicator(ring) {
    let wasConnected = false;
    const update = () => {
      if (!ring.isConnected) {
        if (!wasConnected) requestAnimationFrame(update);
        return;
      }
      wasConnected = true;
      if (!context || context.nodeId !== "c1_scratch") return;
      const state = currentState();
      let clock = state.hostClock;
      if (!conservationDeterministicClock && !state.hostPaused && !state.audioPending) clock += Math.max(0, performance.now() - conservationClockMark);
      const timing = conservation.getBlisterWindow(state, clock);
      if (!timing) return;
      ring.dataset.stable = timing.stable ? "true" : "false";
      ring.dataset.distance = String(Math.round(timing.distance));
      ring.classList.toggle("is-stable", timing.stable);
      ring.classList.toggle("is-clock-frozen", state.hostPaused || state.audioPending);
      ring.style.setProperty("--blister-period", `${timing.period}ms`);
      const visualPhase = ((timing.phase - timing.target + timing.period * .5) % timing.period + timing.period) % timing.period;
      if (!ring.dataset.phaseAligned) {
        ring.style.setProperty("--blister-delay", `${-visualPhase}ms`);
        ring.dataset.phaseAligned = "true";
      }
      requestAnimationFrame(update);
    };
    update();
  }

  function undo() {
    activeHint = null;
    conservationDirectHintPhase = null;
    conservationLiveTrace = null;
    const before = currentState();
    const next = logic.undo(context.nodeId, before);
    if (next === before) return flashError("还没有可以撤回的步骤。");
    context.state.puzzleStates[context.nodeId] = next;
    if (!next.complete) delete context.state.puzzleRatings[context.nodeId];
    context.setProgress(next.complete ? 1 : 0);
    context.save(); renderCurrent();
  }
  function reset() {
    activeHint = null;
    conservationDirectHintPhase = null;
    context.state.puzzleStates[context.nodeId] = logic.reset(context.nodeId);
    if (context.nodeId === "c1_scratch") { conservationDeterministicClock = false; conservationClockMark = performance.now(); }
    delete context.state.puzzleRatings[context.nodeId];
    completionMediaDismissed.delete(context.nodeId); completionMediaFailed.delete(context.nodeId);
    context.setProgress(0); context.save(); selected = null; conservationGuideReplayPhase = null; renderCurrent();
  }

  function shell(state) {
    const root = el("div", `overhaul overhaul--${state.type} ${state.complete ? "is-completed" : ""}`);
    const goal = el("p", "overhaul-goal", goals[context.nodeId]);
    const status = el("p", "overhaul-status", state.message);
    status.setAttribute("role", "status");
    root.append(goal, status);
    return root;
  }

  function updateChrome(state) {
    context.counter.textContent = counterText(state);
    context.finish.hidden = !state.complete;
    context.finish.textContent = context.nodeId === "c4_assembly" ? "确认路线" : "收下线索";
  }
  function ratingLabel(rating) {
    return ({ careful: "细致", steady: "稳妥", recovered: "已恢复", recommended: "关系完整", partial: "部分成立", documented: "记录完整", supported: "记录可用", observant: "观察细致", assisted: "借助预览", reconstructed: "路线已重建" })[rating] || "可继续";
  }
  function counterText(state) {
    if (state.type === "storage") return `${state.moves}步 损伤${state.damage}`;
    if (state.type === "conservation") return `完整度${state.integrity}% 线索${state.clues.length}/2`;
    if (state.type === "evidence") return `痕迹${state.observed.length}/4 匹配${Object.keys(state.matches).length}/4`;
    if (state.type === "gallery-deduction") return `检查${Object.values(state.inspected).filter(sides => sides?.includes("front") && sides?.includes("back")).length}/6 排除${Object.values(state.marks).filter(mark => mark === "excluded").length}/5`;
    if (state.type === "double-jigsaw") return `${state.face === "front" ? "正面" : state.face === "back" ? "背面" : "标签"} ${state.moves}步`;
    return `${state.stage === "timeline" ? "时间" : "地图"} ${state.moves}步`;
  }

  function reducedMotionEnabled() {
    return document.querySelector("#game")?.classList.contains("reduced-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function renderCompletionMedia(state) {
    const spec = context.nodeId === "c1_puzzle" ? gameplayAssets.storage.completion : context.nodeId === "c2_inspect" ? gameplayAssets.evidence.completion : null;
    if (!state.complete || !spec || completionMediaDismissed.has(context.nodeId)) return;
    const completion = el("div", "puzzle-completion-media");
    completion.dataset.node = context.nodeId;
    const poster = document.createElement("img");
    poster.src = spec.poster;
    poster.alt = context.nodeId === "c1_puzzle" ? "目标画已安全立上画架" : "四条旧靴证据已整理成档案";
    completion.append(poster);
    const reduced = reducedMotionEnabled();
    if (!reduced && !completionMediaFailed.has(context.nodeId)) {
      const video = document.createElement("video");
      video.src = spec.video;
      video.poster = spec.poster;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.addEventListener("error", () => { completionMediaFailed.add(context.nodeId); completion.classList.add("is-video-error"); });
      video.addEventListener("ended", () => completion.classList.add("is-video-ended"));
      completion.prepend(video);
      video.play().catch(() => { completionMediaFailed.add(context.nodeId); completion.classList.add("is-video-error"); });
    } else completion.classList.add("is-reduced-motion");
    completion.append(button("跳过演出，查看完成状态", () => { completionMediaObserver?.disconnect(); completionMediaObserver = null; completionMediaDismissed.add(context.nodeId); renderCurrent(); }, "skip-puzzle-completion-video"));
    context.content.append(completion);
    const syncFrame = () => {
      if (!completion.isConnected) return;
      const rect = context.content.getBoundingClientRect();
      completion.style.left = `${rect.left}px`;
      completion.style.top = `${rect.top}px`;
      completion.style.width = `${rect.width}px`;
      completion.style.height = `${rect.height}px`;
    };
    syncFrame();
    completionMediaObserver = new ResizeObserver(syncFrame);
    completionMediaObserver.observe(context.content);
  }

  function renderStorage(state, root) {
    root.style.setProperty("--puzzle-scene", 'url("assets/images/frame-storage-workroom.png")');
    const status = root.querySelector(".overhaul-status");
    const rejectDrop = (pieceId, location, reason) => {
      status.textContent = reason;
      status.setAttribute("role", "alert");
      context.toast(reason);
      context.audio.play("error");
      const zone = root.querySelector(`[data-location="${location}"]`);
      const piece = root.querySelector(`[data-piece="${pieceId}"]`);
      zone?.classList.add("is-rejecting");
      piece?.classList.add("is-returning");
      (window.__redbeardHostTimers?.setTimeout || window.setTimeout)(() => {
        zone?.classList.remove("is-rejecting");
        piece?.classList.remove("is-returning");
      }, 520);
    };
    const attemptDrop = (pieceId, location) => {
      if (!pieceId) return rejectDrop("", location, "先选择或拖动一幅画。");
      const reason = logic.storageMoveReason(state, pieceId, location);
      if (reason) return rejectDrop(pieceId, location, reason);
      selected = null;
      storageGuideReplay = false;
      suppressStorageClickUntil = 0;
      dispatch({ type: "move", piece: pieceId, to: location });
    };
    const cleanupPointerDrag = () => {
      storagePointerDrag?.ghost?.remove();
      storagePointerDrag = null;
      root.querySelectorAll(".storage-zone.is-drag-over").forEach(zone => zone.classList.remove("is-drag-over"));
    };
    const showDragGuide = state.moves === 0 || storageGuideReplay;
    const guideRow = el("div", "storage-guide-row");
    if (showDragGuide) {
      const guide = el("div", "storage-drag-guide");
      guide.append(el("span", "storage-guide-frame"), el("p", "", "抓住画框边缘，拖动一小段后再自行判断放置区域。"));
      guideRow.append(guide);
    }
    guideRow.append(button("重看拖动示范", () => { storageGuideReplay = true; renderCurrent(); }, "storage-guide-replay"));
    root.append(guideRow);
    const board = el("div", "storage-board");
    const zoneRules = {
      main: "主堆，只取画，不放回",
      easelA: "容量3，底层需承受上层尺寸与重量",
      easelB: "容量3，底层需承受上层尺寸与重量",
      repair: "容量1，只接收未干画"
    };
    for (const location of ["main", "easelA", "easelB", "repair"]) {
      const zone = el("section", `storage-zone storage-zone--${location}`);
      zone.dataset.location = location;
      const heading = el("h3", "", locationLabels[location]);
      heading.append(el("small", "storage-zone-rule", zoneRules[location]));
      zone.append(heading);
      const stack = el("div", "storage-stack");
      state.locations[location].forEach(pieceId => {
        const piece = state.pieces[pieceId];
        const item = button(piece.label, () => {
          if (performance.now() < suppressStorageClickUntil) return;
          selected = selected === pieceId ? null : pieceId;
          renderCurrent();
        }, `storage-piece frame-rivet ${piece.wet ? "is-wet wet-reflection" : ""} ${piece.fragile ? "is-fragile cracked-frame" : ""} ${piece.weight >= 3 ? "is-heavy" : ""} ${selected === pieceId ? "is-selected" : ""}`);
        item.dataset.piece = pieceId;
        item.dataset.size = String(piece.size);
        item.dataset.weight = String(piece.weight);
        const storageArt = { p1:"backgrounds/title.png",p2:"backgrounds/chapter-1.png",p3:"backgrounds/chapter-2.png",p4:"paintings-worn-boots.png",p5:"backgrounds/chapter-3.png",p6:"backgrounds/chapter-4.png" };
        item.style.backgroundImage = `linear-gradient(90deg,rgba(43,27,16,.12),rgba(43,27,16,.5)),url("assets/images/${storageArt[pieceId]}")`;
        item.style.setProperty("--piece-aspect", String(1.15 + piece.size * .18));
        item.textContent = "";
        const sizeName = ["", "小幅", "中幅", "大幅"][piece.size];
        const weightName = ["", "轻", "中重", "重"][piece.weight];
        item.append(el("span", "storage-piece-spec", `${sizeName} ${weightName}${piece.fragile ? " 脆弱" : ""}${piece.wet ? " 未干" : ""}`));
        item.setAttribute("aria-label", `${piece.label}，尺寸${piece.size}，重量${piece.weight}${piece.fragile ? "，脆弱" : ""}${piece.wet ? "，未干" : ""}`);
        item.draggable = true;
        item.title = `尺寸 ${piece.size}  重量 ${piece.weight}${piece.fragile ? "  脆弱" : ""}${piece.wet ? "  未干" : ""}`;
        item.addEventListener("dragstart", event => {
          if (!event.ctrlKey) { event.preventDefault(); return; }
          event.dataTransfer.setData("text/plain", pieceId);
          event.dataTransfer.effectAllowed = "move";
        });
        item.addEventListener("pointerdown", event => {
          if (event.button !== 0) return;
          item.setPointerCapture?.(event.pointerId);
          storagePointerDrag = { pieceId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, ghost: null };
        });
        item.addEventListener("pointermove", event => {
          if (!storagePointerDrag || storagePointerDrag.pointerId !== event.pointerId) return;
          const moved = Math.hypot(event.clientX - storagePointerDrag.startX, event.clientY - storagePointerDrag.startY) > 6;
          if (!storagePointerDrag.moved && moved) {
            storagePointerDrag.moved = true;
            const ghost = item.cloneNode(true);
            ghost.className = "storage-drag-ghost";
            ghost.removeAttribute("id");
            ghost.setAttribute("aria-hidden", "true");
            document.body.append(ghost);
            storagePointerDrag.ghost = ghost;
          }
          if (!storagePointerDrag.moved) return;
          event.preventDefault();
          storagePointerDrag.ghost.style.left = `${event.clientX}px`;
          storagePointerDrag.ghost.style.top = `${event.clientY}px`;
          root.querySelectorAll(".storage-zone.is-drag-over").forEach(candidate => candidate.classList.remove("is-drag-over"));
          const hoverZone = document.elementFromPoint(event.clientX, event.clientY)?.closest(".storage-zone");
          storagePointerDrag.targetLocation = hoverZone?.dataset.location || null;
          hoverZone?.classList.add("is-drag-over");
        });
        item.addEventListener("pointerup", event => {
          if (!storagePointerDrag || storagePointerDrag.pointerId !== event.pointerId) return;
          if (storagePointerDrag.moved) {
            event.preventDefault();
            suppressStorageClickUntil = performance.now() + 350;
            const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".storage-zone");
            const draggedPiece = storagePointerDrag.pieceId;
            const targetLocation = target?.dataset.location || storagePointerDrag.targetLocation;
            cleanupPointerDrag();
            if (targetLocation) attemptDrop(draggedPiece, targetLocation);
            else rejectDrop(draggedPiece, location, "画框没有落在任何承放区域，已回到原位。");
          } else cleanupPointerDrag();
        });
        item.addEventListener("pointercancel", cleanupPointerDrag);
        stack.append(item);
      });
      const dropzone = button("承放区", () => attemptDrop(selected, location), `storage-dropzone ${selected ? "has-selection" : ""}`);
      dropzone.dataset.destination = location;
      dropzone.setAttribute("aria-label", `${locationLabels[location]}承放区，${zoneRules[location]}`);
      dropzone.addEventListener("dragover", event => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; zone.classList.add("is-drag-over"); });
      dropzone.addEventListener("dragleave", () => zone.classList.remove("is-drag-over"));
      dropzone.addEventListener("drop", event => {
        event.preventDefault();
        zone.classList.remove("is-drag-over");
        attemptDrop(event.dataTransfer.getData("text/plain"), location);
      });
      zone.append(stack, dropzone); board.append(zone);
    }
    root.append(board, el("p", "keyboard-guide", "键盘：Tab选择画作，Enter拿起；再Tab到主堆、两座画架或修复台的任意承放区，Enter确认。鼠标与触控可直接抓住画框边缘拖放。"));
  }

  function loadConservationImage(src, callback) {
    let image = conservationImageCache.get(src);
    if (!image) {
      image = new Image();
      image.decoding = "async";
      image.src = src;
      conservationImageCache.set(src, image);
    }
    if (image.complete && image.naturalWidth) callback(image);
    else image.addEventListener("load", () => callback(image), { once: true });
  }

  function drawConservationMask(canvas, state) {
    canvas.width = 766;
    canvas.height = 520;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    loadConservationImage(gameplayAssets.conservation.restored, image => {
      if (state.complete) {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.dataset.maskRendered = "true";
        return;
      }
      const mask = document.createElement("canvas");
      mask.width = canvas.width;
      mask.height = canvas.height;
      const maskContext = mask.getContext("2d");
      maskContext.fillStyle = "#fff";
      const stamp = (x, y, radius, opacity = 1) => {
        const gradient = maskContext.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(255,255,255,${opacity})`);
        gradient.addColorStop(.58, `rgba(255,255,255,${opacity * .78})`);
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        maskContext.fillStyle = gradient;
        maskContext.beginPath(); maskContext.arc(x, y, radius, 0, Math.PI * 2); maskContext.fill();
      };
      for (const operation of state.revealOps.filter(item => item.kind !== "back")) {
        const radius = operation.width * canvas.width / 2;
        for (const [pathIndex, points] of operation.paths.entries()) {
          for (let segment = 0; segment < Math.max(1, points.length - 1); segment += 1) {
            const from = points[segment]; const to = points[Math.min(segment + 1, points.length - 1)];
            const pixelDistance = Math.hypot((to.x - from.x) * canvas.width, (to.y - from.y) * canvas.height);
            const steps = Math.max(1, Math.ceil(pixelDistance / Math.max(2, radius * .45)));
            for (let step = 0; step <= steps; step += 1) {
              const amount = step / steps;
              const x = (from.x + (to.x - from.x) * amount) * canvas.width;
              const y = (from.y + (to.y - from.y) * amount) * canvas.height;
              const jitter = (((segment * 17 + step * 13 + pathIndex * 7) % 9) - 4) * .18;
              stamp(x, y + jitter, radius, operation.kind === "crack" ? .82 : 1);
              if (operation.kind === "dust") for (const offset of [-.58, -.28, .28, .58]) stamp(x, y + offset * radius + jitter, radius * .16, .52);
            }
          }
        }
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      canvas.dataset.maskRendered = "true";
    });
  }

  const normalizePointer = (event, picture) => {
    const box = picture.querySelector("canvas.conservation-mask").getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)), y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)), t: performance.now() };
  };

  function keyboardConservationAction(state) {
    if (state.phase === "inspect") return state.tool === "light" ? [{ type: "inspectLight", x: conservationCursor.x, y: conservationCursor.y }] : [];
    if (state.phase === "dust") {
      if (state.tool !== "brush") return [];
      const y = conservation.geometry.dustLanes.reduce((best, item) => Math.abs(item - conservationCursor.y) < Math.abs(best - conservationCursor.y) ? item : best, conservation.geometry.dustLanes[0]);
      return [{ type: "dustStroke", points: [{ x: .1, y, t: 0 }, { x: .48, y, t: 325 }, { x: .9, y, t: 650 }] }];
    }
    if (state.phase === "stain") {
      if (state.tool !== "swab") return [];
      const name = conservationCursor.x < .52 ? "left" : "right";
      const config = conservation.geometry.stains[name];
      const ring = state.stains[name].outer < Math.PI * 2 - .12 ? "outer" : "inner";
      const start = state.stains[name][ring];
      const points = Array.from({ length: 7 }, (_, index) => {
        const angle = start + index * Math.PI / 12;
        return { x: config.center.x + Math.cos(angle) * config[ring], y: config.center.y + Math.sin(angle) * config[ring] };
      });
      return [{ type: "stainArc", stain: name, ring, points }];
    }
    if (state.phase === "crack") {
      const crack = state.cracks.findIndex(item => !item.complete);
      const progress = state.cracks[crack];
      if (progress.traced && state.tool !== "press" || !progress.traced && state.tool !== "light") return [];
      return [progress.traced
        ? { type: "pressCrackNode", crack, node: conservation.geometry.cracks[crack].press[progress.pressIndex] }
        : { type: "traceCrackNode", crack, node: progress.traceIndex }];
    }
    if (state.phase === "blister") return state.tool === "press" ? [{ type: "clickBlister", group: state.blister.currentGroup }] : [];
    if (state.phase === "back") return state.tool === "light" ? [{ type: "flipBack" }] : [];
    if (state.phase === "reveal") {
      if (state.tool !== "brush") return [];
      const target = conservationCursor.x < .5 ? "Bernard" : "1888";
      const config = conservation.geometry.revealTargets[target];
      const lane = config.lanes[state.reveal[target].length] ?? config.lanes[0];
      return [{ type: "revealStroke", target, points: [{ x: config.x0, y: lane }, { x: config.x1, y: lane }] }];
    }
    return [];
  }

  function conservationPhaseInfo(state) {
    const ringDone = value => value >= Math.PI * 2 - .12;
    const activeCrackIndex = state.cracks?.findIndex(item => !item.complete) ?? -1;
    const activeCrack = activeCrackIndex >= 0 ? state.cracks[activeCrackIndex] : null;
    const stainStep = nextStainStep(state);
    const revealStep = nextRevealStep(state);
    const info = {
      inspect: { target: "用侧光找到四类异常起伏", tool: "侧光", method: "按住并拖动侧光，依次扫过尘粒、晕染、裂纹高光和凸起", progress: `${state.inspection.seen.length}/4处异常` },
      dust: { target: "刷净四条浮尘灰带", tool: "软刷", method: "按住软刷，沿灰带从左向右缓慢、连续拖动", progress: `${state.dust.lanes.length}/4条灰带` },
      stain: { target: `下一圈：${stainStep?.location || "两处"}${stainStep?.ringLabel || "晕痕"}`, tool: "棉签", method: stainStep ? `沿画面标出的${stainStep.location}${stainStep.ringLabel}闭合一周` : "两处晕痕已经完成", progress: `${[state.stains.left.outer,state.stains.left.inner,state.stains.right.outer,state.stains.right.inner].filter(ringDone).length}/4个圆周` },
      crack: { target: `当前裂迹 ${activeCrackIndex + 1}/3：${activeCrack?.traced ? "压合" : "描线"}`, tool: activeCrack?.traced ? "压合工具" : "侧光", method: activeCrack?.traced ? "按圆点编号依次点击，或按住沿蓝线从1拖到最后" : "从发亮的起点开始，沿节点顺序拖动侧光描线", progress: activeCrack?.traced ? `第${activeCrackIndex + 1}条压合 ${activeCrack.pressIndex}/${conservation.geometry.cracks[activeCrackIndex].press.length}` : `${state.cracks.filter(item => item.complete).length}/3条裂迹` },
      blister: { target: "压平四组凸点", tool: "压合工具", method: "观察环形指示，等它收进窄稳定区时点击；每组需命中2到3次", progress: `${state.blister.currentGroup}/4组凸点` },
      back: { target: "翻到画框背面", tool: "侧光", method: "选择翻面，检查厂印与日期区域", progress: "正面处理完成" },
      reveal: { target: revealStep ? `下一刷：${revealStep.label} 第${revealStep.lane + 1}/3条` : "背标已经显露", tool: "软刷", method: revealStep ? `只沿当前虚线从左向右刷，不必跨到另一侧区域` : "厂印和日期已经完成", progress: `${state.reveal.Bernard.length + state.reveal["1888"].length}/6条刷痕` },
      complete: { target: "查看修复后的原画", tool: "无", method: "修复已经完成，可以收下线索", progress: "100%" }
    };
    return info[state.phase] || info.inspect;
  }

  function nextStainStep(state) {
    const done = value => value >= Math.PI * 2 - .12;
    for (const name of ["left", "right"]) {
      const progress = state.stains?.[name];
      if (!progress) continue;
      if (!done(progress.outer)) return { name, ring:"outer", location:name === "left" ? "左侧晕痕" : "右侧晕痕", ringLabel:"外圈" };
      if (!done(progress.inner)) return { name, ring:"inner", location:name === "left" ? "左侧晕痕" : "右侧晕痕", ringLabel:"内圈" };
    }
    return null;
  }

  function revealTargetForStroke(points) {
    return Array.isArray(points) && points[0]?.x < .5 ? "Bernard" : "1888";
  }

  function nextRevealStep(state) {
    for (const target of ["Bernard", "1888"]) {
      const config = conservation.geometry.revealTargets[target];
      const completed = state.reveal?.[target]?.length || 0;
      if (completed < config.lanes.length) return { target, lane:completed, y:config.lanes[completed], x0:config.x0, x1:config.x1, label:target === "Bernard" ? "左侧厂印" : "右侧日期" };
    }
    return null;
  }

  function conservationGuideDescriptor(state) {
    if (state.phase === "complete") return null;
    const activeCrackIndex = state.cracks?.findIndex(item => !item.complete) ?? -1;
    const activeCrack = activeCrackIndex >= 0 ? state.cracks[activeCrackIndex] : null;
    const crackGeometry = activeCrackIndex >= 0 ? conservation.geometry.cracks[activeCrackIndex] : null;
    const crackGuidePoints = crackGeometry ? (activeCrack?.traced ? crackGeometry.press.map(index => crackGeometry.trace[index]) : crackGeometry.trace) : [];
    const crackPath = crackGuidePoints.length ? `M ${crackGuidePoints.map((point, index) => `${point.x * 100} ${point.y * 100}${index < crackGuidePoints.length - 1 ? " L" : ""}`).join(" ")}` : "";
    const stainStep = nextStainStep(state);
    const stainConfig = stainStep ? conservation.geometry.stains[stainStep.name] : null;
    const stainRadius = stainStep ? stainConfig[stainStep.ring] : 0;
    const stainX = stainConfig ? stainConfig.center.x * 100 : 30;
    const stainY = stainConfig ? stainConfig.center.y * 100 : 64;
    const stainR = stainRadius * 100;
    const revealStep = nextRevealStep(state);
    return ({
      inspect: { path: "M 8 10 L 20 18 L 80 35 L 61 30 L 80 58", tool: "light", label: "拖动侧光扫过四处异常" },
      dust: { path: "M 10 22 L 90 22", tool: "brush", label: "沿第一条灰带从左向右" },
      stain: stainStep ? { path: `M ${stainX + stainR} ${stainY} A ${stainR} ${stainR} 0 1 1 ${stainX - stainR} ${stainY} A ${stainR} ${stainR} 0 1 1 ${stainX + stainR} ${stainY}`, tool: "swab", label: `${stainStep.location}${stainStep.ringLabel}`, stepLabel:`下一圈 ${stainStep.location}${stainStep.ringLabel}`, labelX:stainX, labelY:Math.max(7, stainY - stainR - 4) } : null,
      crack: activeCrack ? { path: crackPath, tool: activeCrack.traced ? "press" : "light", label: activeCrack.traced ? `第${activeCrackIndex + 1}条：按1到${crackGeometry.press.length}压合，也可沿线拖动` : `第${activeCrackIndex + 1}条：从起点沿高光描线` } : null,
      blister: { path: "M 82 44 A 8 8 0 1 1 81.9 44", tool: "press", label: "稳定环收拢时点击" },
      back: { path: "M 28 50 C 40 24 60 24 72 50", tool: "light", label: "翻到背面继续检查" },
      reveal: revealStep ? { path:`M ${revealStep.x0 * 100} ${revealStep.y * 100} L ${revealStep.x1 * 100} ${revealStep.y * 100}`, tool:"brush", label:`${revealStep.label}第${revealStep.lane + 1}/3条`, stepLabel:`下一刷 ${revealStep.label} 第${revealStep.lane + 1}/3条`, labelX:(revealStep.x0 + revealStep.x1) * 50, labelY:Math.max(7, revealStep.y * 100 - 5) } : null
    })[state.phase] || null;
  }

  function conservationGuideNeeded(state) {
    if (conservationGuideReplayPhase === state.phase) return true;
    if (state.phase === "inspect") return state.inspection.seen.length === 0;
    if (state.phase === "dust") return state.dust.lanes.length === 0;
    if (state.phase === "stain") return Boolean(nextStainStep(state));
    if (state.phase === "crack") return state.cracks.some(item => !item.complete);
    if (state.phase === "blister") return state.blister.currentGroup === 0;
    if (state.phase === "back") return true;
    if (state.phase === "reveal") return Boolean(nextRevealStep(state));
    return false;
  }

  function createConservationGuide(state, reduced) {
    const descriptor = conservationGuideDescriptor(state);
    if (!descriptor || !conservationGuideNeeded(state)) return null;
    const guide = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    guide.setAttribute("viewBox", "0 0 100 100");
    guide.setAttribute("preserveAspectRatio", "none");
    const direct = conservationDirectHintPhase === state.phase;
    guide.classList.add("phase-guide", `guide-${state.phase}`);
    if (direct) guide.classList.add("is-hint-direct");
    guide.setAttribute("aria-label", descriptor.label);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", descriptor.path);
    path.classList.add("phase-guide-path");
    guide.append(path);
    const match = descriptor.path.match(/M\s*([\d.]+)\s*([\d.]+)/);
    const start = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    start.setAttribute("cx", match?.[1] || "10"); start.setAttribute("cy", match?.[2] || "10"); start.setAttribute("r", "2.1"); start.classList.add("phase-guide-start");
    guide.append(start);
    if (descriptor.stepLabel) {
      const stepLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      stepLabel.setAttribute("x", String(descriptor.labelX || 50)); stepLabel.setAttribute("y", String(descriptor.labelY || 10));
      stepLabel.setAttribute("text-anchor", "middle"); stepLabel.textContent = descriptor.stepLabel; stepLabel.classList.add("phase-guide-step-label");
      guide.append(stepLabel);
    }
    if (direct) {
      const coordinates = [...descriptor.path.matchAll(/(?:M|L)\s*([\d.]+)\s*([\d.]+)/g)];
      const end = coordinates.at(-1);
      const endX = end?.[1] || match?.[1] || "90";
      const endY = end?.[2] || match?.[2] || "22";
      const finish = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      finish.setAttribute("cx", endX); finish.setAttribute("cy", endY); finish.setAttribute("r", "2.1"); finish.classList.add("phase-guide-end");
      const startLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      startLabel.setAttribute("x", String((Number(match?.[1]) || 10) + 3)); startLabel.setAttribute("y", String((Number(match?.[2]) || 10) - 3)); startLabel.textContent = state.phase === "blister" ? "稳定时点击" : "从这里按住";
      const endLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      endLabel.setAttribute("x", String(Math.max(4, Number(endX) - 18))); endLabel.setAttribute("y", String(Math.min(96, Number(endY) + 7))); endLabel.textContent = state.phase === "blister" ? "点击这里" : "拖到这里松开";
      startLabel.classList.add("phase-guide-label"); endLabel.classList.add("phase-guide-label");
      guide.append(finish, startLabel, endLabel);
    }
    const ghost = document.createElementNS("http://www.w3.org/2000/svg", "image");
    ghost.setAttribute("href", gameplayAssets.conservation.tools[descriptor.tool]);
    ghost.setAttribute("width", "10"); ghost.setAttribute("height", "14"); ghost.setAttribute("x", "-5"); ghost.setAttribute("y", "-7"); ghost.classList.add("phase-guide-tool");
    if (!reduced) {
      const motion = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
      motion.setAttribute("path", descriptor.path); motion.setAttribute("dur", "1.8s"); motion.setAttribute("repeatCount", "indefinite"); motion.setAttribute("rotate", "auto"); ghost.append(motion);
    } else {
      ghost.setAttribute("x", String((Number(match?.[1]) || 10) - 5)); ghost.setAttribute("y", String((Number(match?.[2]) || 10) - 7));
    }
    guide.append(ghost);
    return guide;
  }

  function phaseInputError(state) {
    return ({
      inspect: "当前目标需要侧光：拖动侧光扫过画面异常起伏。",
      dust: "当前目标需要软刷：沿灰带从左向右缓慢拖动。",
      stain: "当前目标需要棉签：贴住晕痕边缘做短圆周。",
      crack: state.cracks.find(item => !item.complete)?.traced ? "裂迹已描出：换压合工具并按两端到交汇处的顺序点击。" : "描线顺序错误：从裂迹发亮的起点沿节点依次拖动侧光。",
      blister: "点击不在稳定区：等待环形指示收进窄区后再压合。",
      reveal: "沿当前标出的虚线从左向右刷；这一笔只处理一个区域，不必横跨整幅背面。"
    })[state.phase] || "当前操作没有符合阶段要求。";
  }

  function conservationRequiredTool(state) {
    if (state.phase === "inspect" || state.phase === "back") return "light";
    if (state.phase === "dust" || state.phase === "reveal") return "brush";
    if (state.phase === "stain") return "swab";
    if (state.phase === "crack") return state.cracks.find(item => !item.complete)?.traced ? "press" : "light";
    if (state.phase === "blister") return "press";
    return null;
  }

  function conservationToolMessage(state, tool) {
    const names = { light:"侧光", brush:"软刷", swab:"棉签", press:"压合工具" };
    const required = conservationRequiredTool(state);
    if (tool === required) return `已拿起${names[tool]}。${conservationPhaseInfo(state).method}。`;
    const waiting = {
      inspect:"先用侧光找齐四类异常，之后才会进入清理。",
      dust:"棉签要在浮尘清完后处理晕痕。当前先用软刷完成4条灰带，按住画面从左向右拖。",
      stain:"软刷阶段已经完成。当前用棉签贴住晕痕，先外圈再内圈。",
      crack:`当前先用${names[required]}处理裂迹，完成这一小步后系统会提示换工具。`,
      blister:"当前要等稳定环收拢，再用压合工具点击凸点。",
      back:"当前先用侧光翻到背面检查。",
      reveal:"当前用软刷沿背面纤维从左向右拖，显露厂印和日期。"
    };
    return `已拿起${names[tool]}，但这一步暂时用不上。${waiting[state.phase] || `当前应使用${names[required]}。`}`;
  }

  function setPersistentStatus(message) {
    const status = context?.content.querySelector(".overhaul-status");
    if (!status) return;
    status.textContent = message;
    status.setAttribute("role", "status");
  }

  function renderConservation(state, root) {
    const settingReduced = document.querySelector("#game")?.classList.contains("reduced-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (state.complete && settingReduced && state.completionMode === "video") {
      state = logic.applyAction(context.nodeId, state, { type: "completionMode", mode: "poster" });
      context.state.puzzleStates[context.nodeId] = state;
      context.save();
    }
    root.style.setProperty("--puzzle-scene", "none");
    const studio = el("section", `conservation-studio phase-${state.phase}`);
    const main = el("div", "conservation-main");
    const picture = el("div", `conservation-picture tool-${state.tool} ${state.backFlipped && !state.complete ? "is-back" : ""}`);
    picture.tabIndex = 0;
    picture.setAttribute("role", "application");
    picture.setAttribute("aria-label", `画作修复工作区，当前阶段 ${state.phase}`);
    const base = document.createElement("img");
    base.alt = state.complete ? "修复完成的原画" : state.backFlipped ? "画框背面" : "等待修复的受损原画";
    base.src = state.complete ? gameplayAssets.conservation.restored : state.backFlipped ? "assets/images/canvas-back.png" : gameplayAssets.conservation.damaged;
    const canvas = el("canvas", "conservation-mask");
    canvas.setAttribute("aria-hidden", "true");
    const lightBeam = el("div", "conservation-light-beam");
    const cursor = el("div", "conservation-tool-cursor");
    const cursorImage = document.createElement("img");
    cursorImage.src = gameplayAssets.conservation.tools[state.tool];
    cursorImage.alt = "";
    cursor.append(cursorImage);
    picture.append(base, canvas, lightBeam, cursor);
    drawConservationMask(canvas, state);
    const phaseGuide = createConservationGuide(state, settingReduced);
    if (phaseGuide) picture.append(phaseGuide);
    const liveTrace = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    liveTrace.setAttribute("viewBox", "0 0 100 100");
    liveTrace.setAttribute("preserveAspectRatio", "none");
    liveTrace.classList.add("conservation-live-trace");
    liveTrace.setAttribute("aria-label", "当前棉签或刷具轨迹");
    const liveTraceLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    liveTrace.append(liveTraceLine);
    const paintLiveTrace = () => {
      const trace = conservationLiveTrace?.phase === state.phase ? conservationLiveTrace : null;
      liveTrace.hidden = !trace?.points?.length;
      liveTrace.dataset.result = trace?.result || "drawing";
      liveTraceLine.setAttribute("points", trace?.points?.map(point => `${(point.x * 100).toFixed(2)},${(point.y * 100).toFixed(2)}`).join(" ") || "");
    };
    paintLiveTrace();
    picture.append(liveTrace);

    if (state.phase === "crack") {
      state.cracks.forEach((progress, crackIndex) => conservation.geometry.cracks[crackIndex].trace.forEach((point, nodeIndex) => {
        const pressOrder = progress.traced ? conservation.geometry.cracks[crackIndex].press.indexOf(nodeIndex) : -1;
        const node = button(progress.traced ? String(pressOrder + 1) : "", () => progress.traced && !progress.complete && dispatch({ type: "pressCrackNode", crack: crackIndex, node: nodeIndex }), `crack-node ${progress.complete ? "is-complete" : progress.traced ? "is-pressable" : "is-trace-guide"} ${progress.traced ? pressOrder < progress.pressIndex ? "is-done" : pressOrder === progress.pressIndex ? "is-next-press" : "is-pending-press" : nodeIndex < progress.traceIndex ? "is-done" : ""}`);
        node.dataset.crack = crackIndex;
        node.dataset.node = nodeIndex;
        node.setAttribute("aria-label", progress.traced ? `第${crackIndex + 1}条裂迹，第${pressOrder + 1}步压合点${pressOrder === progress.pressIndex ? "，现在点击" : ""}` : `第${crackIndex + 1}条裂迹描线点${nodeIndex + 1}`);
        node.style.left = `${point.x * 100}%`;
        node.style.top = `${point.y * 100}%`;
        picture.append(node);
      }));
    }
    if (state.phase === "blister" && state.blister.currentGroup < conservation.geometry.blisters.length) {
      const group = state.blister.currentGroup;
      const position = conservation.geometry.blisterPositions[group];
      const ring = button("", () => {
        syncConservationRealClock();
        dispatch({ type: "clickBlister", group, x: position.x, y: position.y });
      }, "blister-ring");
      ring.dataset.group = group;
      ring.setAttribute("aria-label", `第${group + 1}组凸点，稳定区点击`);
      ring.style.left = `${position.x * 100}%`;
      ring.style.top = `${position.y * 100}%`;
      picture.append(ring);
      syncBlisterIndicator(ring);
    }
    if (state.phase === "back") picture.append(button("翻到背面检查", () => dispatch({ type: "flipBack" }), "flip-conservation"));
    if (state.backFlipped && !state.complete) {
      const mark = el("strong", `back-mark mark-bernard ${state.clues.includes("Bernard") ? "is-revealed" : ""}`, "BERNARD");
      const date = el("strong", `back-mark mark-1888 ${state.clues.includes("1888") ? "is-revealed" : ""}`, "1888");
      picture.append(mark, date);
    }

    let pointerPath = null;
    const updatePointerVisual = point => {
      conservationCursor.x = point.x;
      conservationCursor.y = point.y;
      picture.style.setProperty("--pointer-x", `${point.x * 100}%`);
      picture.style.setProperty("--pointer-y", `${point.y * 100}%`);
      if (state.tool === "light") {
        picture.classList.add("is-side-lit");
        picture.querySelectorAll(".crack-node.is-trace-guide").forEach(node => {
          const dx = Number.parseFloat(node.style.left) / 100 - point.x;
          const dy = Number.parseFloat(node.style.top) / 100 - point.y;
          node.style.opacity = Math.hypot(dx, dy) < .19 ? "1" : ".08";
        });
      }
    };
    picture.addEventListener("pointerdown", event => {
      const pressStart = state.phase === "crack" && state.tool === "press" && event.target.closest(".crack-node.is-pressable");
      if (state.complete || event.target.closest("button") && !pressStart) return;
      event.preventDefault();
      picture.setPointerCapture?.(event.pointerId);
      const point = normalizePointer(event, picture);
      pointerPath = [point];
      conservationLiveTrace = { phase:state.phase, points:[point], result:"drawing" };
      paintLiveTrace();
      updatePointerVisual(point);
    });
    picture.addEventListener("pointermove", event => {
      const point = normalizePointer(event, picture);
      updatePointerVisual(point);
      if (pointerPath) {
        pointerPath.push(point);
        conservationLiveTrace = { phase:state.phase, points:[...pointerPath], result:"drawing" };
        paintLiveTrace();
      }
    });
    const finishPointer = event => {
      if (!pointerPath) return;
      pointerPath.push(normalizePointer(event, picture));
      const points = pointerPath;
      pointerPath = null;
      const live = currentState();
      const traceGap = points.length > 1 ? Math.hypot(points[0].x - points.at(-1).x, points[0].y - points.at(-1).y) : 1;
      conservationLiveTrace = { phase:live.phase, points, result:live.phase === "stain" ? (traceGap <= .09 ? "closed" : "open") : "released" };
      paintLiveTrace();
      if (live.phase === "inspect" && live.tool === "light") return dispatchMany(points.map(point => ({ type: "inspectLight", x: point.x, y: point.y })));
      if (live.phase === "dust" && live.tool === "brush") return dispatch({ type: "dustStroke", points });
      if (live.phase === "stain" && live.tool === "swab") {
        const middle = points[Math.floor(points.length / 2)];
        const stain = Math.hypot(middle.x - conservation.geometry.stains.left.center.x, middle.y - conservation.geometry.stains.left.center.y) < Math.hypot(middle.x - conservation.geometry.stains.right.center.x, middle.y - conservation.geometry.stains.right.center.y) ? "left" : "right";
        const ring = live.stains[stain].outer < Math.PI * 2 - .12 ? "outer" : "inner";
        return dispatch({ type: "stainArc", stain, ring, points });
      }
      if (live.phase === "crack" && live.tool === "light") {
        const actions = [];
        const expected = live.cracks.map(item => item.traceIndex);
        points.forEach(point => conservation.geometry.cracks.forEach((crack, crackIndex) => {
          const node = expected[crackIndex];
          const target = crack.trace[node];
          if (target && Math.hypot(point.x - target.x, point.y - target.y) < .055) {
            actions.push({ type: "traceCrackNode", crack: crackIndex, node });
            expected[crackIndex] += 1;
          }
        }));
        if (actions.length) { actions[actions.length - 1].strokePoints = points; return dispatchMany(actions); }
      }
      if (live.phase === "crack" && live.tool === "press") {
        const crackIndex = live.cracks.findIndex(item => !item.complete);
        const progress = live.cracks[crackIndex];
        const config = conservation.geometry.cracks[crackIndex];
        const actions = [];
        let pressIndex = progress?.pressIndex || 0;
        points.forEach(point => {
          const nodeIndex = config?.press[pressIndex];
          const target = config?.trace[nodeIndex];
          if (target && Math.hypot(point.x - target.x, point.y - target.y) < .075) {
            actions.push({ type:"pressCrackNode", crack:crackIndex, node:nodeIndex });
            pressIndex += 1;
          }
        });
        if (actions.length) return dispatchMany(actions);
      }
      if (live.phase === "reveal" && live.tool === "brush") {
        return dispatch({ type: "revealStroke", target: revealTargetForStroke(points), points });
      }
      flashError(phaseInputError(live));
    };
    picture.addEventListener("pointerup", finishPointer);
    picture.addEventListener("pointercancel", () => { pointerPath = null; conservationLiveTrace = null; paintLiveTrace(); });
    picture.addEventListener("keydown", event => {
      const step = event.shiftKey ? .08 : .025;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        if (event.key === "ArrowLeft") conservationCursor.x -= step;
        if (event.key === "ArrowRight") conservationCursor.x += step;
        if (event.key === "ArrowUp") conservationCursor.y -= step;
        if (event.key === "ArrowDown") conservationCursor.y += step;
        conservationCursor.x = Math.max(0, Math.min(1, conservationCursor.x));
        conservationCursor.y = Math.max(0, Math.min(1, conservationCursor.y));
        updatePointerVisual({ ...conservationCursor });
        return;
      }
      const shortcut = { "1": "light", "2": "brush", "3": "swab", "4": "press" }[event.key];
      if (shortcut) { event.preventDefault(); dispatch({ type: "tool", tool: shortcut }); return; }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (currentState().phase === "blister") syncConservationRealClock();
        const actions = keyboardConservationAction(currentState());
        if (actions.length) dispatchMany(actions); else flashError("当前工具不符合这一步，状态没有推进。");
      }
    });

    const tray = el("aside", "conservation-tools");
    tray.setAttribute("aria-label", "真实修复工具托盘");
    const toolNames = { light: "侧光", brush: "软刷", swab: "棉签", press: "压合工具" };
    const requiredTool = conservationRequiredTool(state);
    ["light", "brush", "swab", "press"].forEach((tool, index) => {
      const selectTool = () => {
        if (currentState().tool !== tool) dispatch({ type: "tool", tool });
        setPersistentStatus(conservationToolMessage(currentState(), tool));
      };
      const control = button("", selectTool, `conservation-tool ${state.tool === tool ? "is-active" : ""} ${requiredTool === tool ? "is-required" : ""}`);
      const image = document.createElement("img");
      image.src = gameplayAssets.conservation.tools[tool];
      image.alt = "";
      control.append(image, el("span", "", `${index + 1} ${toolNames[tool]}`));
      control.setAttribute("aria-label", `${toolNames[tool]}，快捷键${index + 1}，${requiredTool === tool ? "当前步骤需要" : "当前步骤暂不需要"}`);
      tray.append(control);
    });
    const record = el("details", "conservation-record");
    record.open = innerWidth > 980;
    record.append(el("summary", "", "修复记录"));
    if (!state.identified.length) record.append(el("p", "record-empty", "记录纸仍为空，先让侧光经过异常起伏。"));
    else {
      const names = { dust: "浮尘", stain: "晕痕", crack: "裂迹", blister: "凸点" };
      const list = el("ul", "");
      state.identified.forEach(item => list.append(el("li", "", names[item])));
      record.append(list);
    }
    if (state.clues.length) record.append(el("p", "record-clues", `背面记录：${state.clues.join("、")}`));
    tray.append(record);
    main.append(picture, el("p", "keyboard-guide conservation-keyboard", "键盘：方向键移动工作光标，1侧光、2软刷、3棉签、4压合；空格或Enter执行当前动作。鼠标与触控可直接拖动画面。"));
    studio.append(main, tray);
    const phaseInfo = conservationPhaseInfo(state);
    const taskCard = el("section", "conservation-task-card");
    taskCard.setAttribute("aria-label", "当前修复步骤");
    for (const [label, value, className] of [["当前目标", phaseInfo.target, "target"], ["应使用工具", `${phaseInfo.tool}（手中：${toolNames[state.tool]}）`, "tool"], ["操作方法", phaseInfo.method, "method"], ["完成度", phaseInfo.progress, "progress"]]) {
      const item = el("div", `task-card-item task-${className}`);
      item.append(el("strong", "", label), el("span", "", value));
      taskCard.append(item);
    }
    const liveFeedback = root.querySelector(".overhaul-status");
    liveFeedback.classList.add("task-live-feedback");
    taskCard.append(liveFeedback);
    taskCard.append(button("重看示范", () => { conservationGuideReplayPhase = state.phase; renderCurrent(); }, "replay-phase-guide"));
    studio.append(taskCard);
    root.append(studio);

    if (state.complete && state.completionMode !== "dismissed") {
      const completion = el("div", "conservation-completion");
      const reduced = state.completionMode === "poster";
      const poster = document.createElement("img");
      poster.src = gameplayAssets.conservation.poster;
      poster.alt = "修复完成的原画";
      completion.append(poster);
      if (!reduced) {
        const video = document.createElement("video");
        video.src = gameplayAssets.conservation.fallbackVideo;
        video.poster = gameplayAssets.conservation.poster;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.addEventListener("error", () => dispatch({ type: "completionMode", mode: "poster" }));
        video.addEventListener("ended", () => completion.classList.add("is-video-ended"));
        completion.prepend(video);
        video.play().catch(() => dispatch({ type: "completionMode", mode: "poster" }));
      } else completion.classList.add("is-reduced-motion");
      completion.append(button("跳过演出，查看修复原图", () => dispatch({ type: "completionMode", mode: "dismissed" }), "skip-conservation-video"));
      root.append(completion);
    }
  }

  function renderEvidence(state, root) {
    const checklist = el("ul", "evidence-checklist");
    state.traces.forEach(trace => checklist.append(el("li", state.observed.includes(trace) ? "is-found" : "is-missing", `${state.observed.includes(trace) ? "已发现" : "未发现"}：${state.observed.includes(trace) ? labels[trace] : "待观察痕迹"}`)));
    const painting = el("div", "boots-inspection");
    painting.setAttribute("aria-label", "旧靴画作观察区");
    const subject = document.createElement("img");
    subject.className = "boots-subject-image";
    subject.src = gameplayAssets.evidence.subjects[0];
    subject.alt = "磨损的旧靴画作";
    painting.append(subject);
    state.traces.forEach((trace, index) => {
      const point = button(state.observed.includes(trace) ? labels[trace] : "移动放大镜", () => dispatch({ type: "observe", trace }), `trace-point trace-${index + 1} ${state.observed.includes(trace) ? "is-observed" : ""}`);
      const anchor = evidenceAnchors[trace];
      point.dataset.trace = trace;
      point.style.left = `${anchor.x * 100}%`;
      point.style.top = `${anchor.y * 100}%`;
      point.setAttribute("aria-label", state.observed.includes(trace) ? `已发现${labels[trace]}` : `观察区域${index + 1}`);
      point.addEventListener("pointerenter", () => { magnifierTrace = trace; });
      painting.append(point);
    });
    const lens = el("div", "magnifier lens-glass", "＋");
    if (state.phase === "discover") {
      lens.setAttribute("aria-hidden", "true"); painting.append(lens);
      painting.addEventListener("pointermove", event => {
        const rect = painting.getBoundingClientRect();
        lens.style.left = `${Math.max(48, Math.min(rect.width - 48, event.clientX - rect.left))}px`;
        lens.style.top = `${Math.max(48, Math.min(rect.height - 48, event.clientY - rect.top))}px`;
      });
    }
    const cards = el("div", "evidence-cards");
    const evidenceSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    evidenceSvg.setAttribute("viewBox", "0 0 100 100"); evidenceSvg.classList.add("evidence-links");
    Object.keys(state.matches).forEach((trace,index) => { const line=document.createElementNS("http://www.w3.org/2000/svg","line"); line.setAttribute("x1",String(16+index*22)); line.setAttribute("y1","8"); line.setAttribute("x2",String(12+index*24)); line.setAttribute("y2","92"); evidenceSvg.append(line); });
    if (state.phase === "match") state.traces.forEach(trace => {
      const row = el("section", "evidence-row"); row.append(el("strong", "", labels[trace]));
      state.cards.forEach(card => {
        const usedElsewhere = Object.entries(state.matches).some(([otherTrace, used]) => otherTrace !== trace && used === card);
        const cardButton = button(labels[card], () => dispatch({ type: "match", trace, card }), state.matches[trace] === card ? "is-active" : "");
        cardButton.disabled = usedElsewhere;
        row.append(cardButton);
      });
      if (state.matches[trace]) row.append(button("撤下本卡", () => dispatch({ type: "unmatch", trace }), "unmatch-card"));
      cards.append(row);
    });
    const submit = button("提交证据关系", () => dispatch({ type: "submit" }), "primary");
    submit.disabled = state.traces.some(trace => !state.matches[trace]);
    const reason = el("p", "incomplete-reason", state.phase === "discover" ? `先发现全部4条痕迹，还差${4 - state.observed.length}条。` : state.traces.some(trace => !state.matches[trace]) ? `每条痕迹需一张不重复的判断卡，还差${4 - Object.keys(state.matches).length}条。` : "四条关系已覆盖，可以提交。");
    root.append(checklist, painting, evidenceSvg, cards, reason, submit, el("p", "keyboard-guide", "键盘：Tab 遍历观察区域和判断卡，Enter 发现或匹配。观察点不会预先发光。"));
  }

  const facts = {
    g1: ["大尺寸", "1887 年", "无厂印", "无修补", "风景"], g2: ["中尺寸", "其他厂印", "1888 年", "无修补", "建筑"],
    g3: ["中尺寸", "贝尔纳厂印", "1888 年", "左上修补", "果园"], g4: ["中尺寸", "贝尔纳厂印", "1888 年", "右下修补", "劳动"],
    g5: ["小尺寸", "其他厂印", "1888 年", "右下修补", "室内"], g6: ["中尺寸", "贝尔纳厂印", "1889 年", "无修补", "静物"]
  };
  const galleryImages = {
    g1: "assets/images/backgrounds/title.png", g2: "assets/images/backgrounds/chapter-1.png", g3: "assets/images/backgrounds/chapter-2.png",
    g4: "assets/images/paintings-worn-boots.png", g5: "assets/images/backgrounds/chapter-3.png", g6: "assets/images/backgrounds/chapter-4.png"
  };
  function renderGallery(state, root) {
    const commission = el("aside", "commission", "委托单：中尺寸  贝尔纳画框厂印  1888 年  右下修补  劳动题材");
    const workflow = el("ol", "commission-workflow");
    ["检查正面", "检查背面", "标记符合或选择排除理由", "六幅完成后提交唯一候选"].forEach(step => workflow.append(el("li", "", step)));
    const grid = el("div", "deduction-grid");
    state.paintings.forEach((id, index) => {
      const card = el("article", `deduction-card ${state.marks[id] ? `mark-${state.marks[id]}` : ""}`);
      card.dataset.painting = id;
      card.append(el("h3", "", labels[id]));
      const seen = state.inspected[id] || [];
      const image = el("div", `gallery-thumb gallery-thumb-${index + 1}`);
      image.style.backgroundImage = `linear-gradient(rgba(4,14,22,.18),rgba(4,14,22,.55)), url("${galleryImages[id]}")`;
      image.append(el("span", "gallery-facts", seen.length ? facts[id].filter((_, factIndex) => seen.includes(factIndex < 2 ? "front" : "back")).join("　") : "检查后显示画面与背标记录"));
      const inspect = el("div", "inspect-actions");
      inspect.append(button("检查正面", () => dispatch({ type: "inspect", painting: id, side: "front" }), `inspect-front ${seen.includes("front") ? "is-active" : ""}`), button("检查背面", () => dispatch({ type: "inspect", painting: id, side: "back" }), `inspect-back ${seen.includes("back") ? "is-active" : ""}`));
      const marks = el("div", "mark-actions");
      if (seen.includes("front") && seen.includes("back")) {
        marks.append(button("符合委托", () => dispatch({ type: "mark", painting: id, mark: "candidate" }), `stamp-action stamp-candidate ${state.marks[id] === "candidate" ? "is-active" : ""}`));
        for (const reason of ["尺寸", "厂印", "日期", "修补", "题材"]) { const control = button(`排除：${reason}`, () => dispatch({ type: "mark", painting: id, mark: "excluded", reason }), `reason-slip ${state.marks[id] === "excluded" && state.reasons[id] === reason ? "is-active" : ""}`); control.dataset.reason = reason; marks.append(control); }
      } else marks.append(el("p", "mark-locked", "正面与背标都检查后才能判定。"));
      const status = el("p", "deduction-status", state.marks[id] === "candidate" ? "状态：符合" : state.marks[id] === "excluded" ? `状态：排除，理由 ${state.reasons[id]}` : "状态：未完成判定");
      const drawer = el("aside", "inspection-drawer");
      drawer.append(inspect, marks, status);
      card.append(image, drawer);
      grid.append(card);
    });
    if (state.conflicts.length) root.append(el("p", "conflict", `冲突：${state.conflicts.join("  ")}`));
    const candidate = state.paintings.find(id => state.marks[id] === "candidate");
    const submit = button(candidate ? `提交候选：${labels[candidate]}` : "完成六幅判定后提交", () => candidate && dispatch({ type: "submit", painting: candidate }), "primary gallery-submit");
    submit.disabled = !candidate || state.paintings.some(id => !state.marks[id]);
    root.append(commission, workflow, grid, submit);
  }

  function renderJigsaw(state, root) {
    root.style.setProperty("--jigsaw-front", 'url("assets/images/backgrounds/chapter-3.png")');
    root.style.setProperty("--jigsaw-back", 'url("assets/images/canvas-back.png")');
    if (state.face === "labels") {
      root.append(el("h3", "jigsaw-face-title", "背面标签推理"));
      const panel = el("div", "label-reasoning");
      const labelNames = { bernard: "贝尔纳画框厂印", year1888: "1888 年日期", theo7: "Theo-7 画廊编号", otherFrame: "其他画框厂印", year1890: "1890 年日期" };
      const destinationNames = { stamp: "放入厂印区", date: "放入日期区", number: "放入编号区", reject: "判断不属于" };
      const zones = el("div", "label-zones");
      for (const destination of ["stamp", "date", "number"]) {
        const assigned = Object.entries(state.labelAssignments).find(([, value]) => value === destination)?.[0];
        zones.append(el("div", `label-zone zone-${destination}`, `${destinationNames[destination]}：${assigned ? labelNames[assigned] : "待放置"}`));
      }
      panel.append(zones);
      for (const label of state.labelOptions) {
        const row = el("section", "label-card"); row.dataset.label = label; row.append(el("strong", "", labelNames[label]));
        for (const destination of ["stamp", "date", "number", "reject"]) {
          const control = button(destinationNames[destination], () => {
            const reason = logic.labelActionReason(state, label, destination);
            if (reason) flashError(reason); else dispatch({ type: "assignLabel", label, destination });
          }, state.labelAssignments[label] === destination ? "is-active" : "");
          control.dataset.destination = destination; row.append(control);
        }
        panel.append(row);
      }
      const remaining = state.labelOptions.filter(label => !state.labelAssignments[label]).length;
      const submit = button(remaining ? `还有 ${remaining} 张标签未判定` : "提交全部标签推理", () => dispatch({ type: "submitLabels" }), "primary submit-labels"); submit.disabled = remaining > 0;
      root.append(panel, submit, el("p", "keyboard-guide", "键盘：Tab 遍历五张标签的四个判定，Enter 放置。三个背面区域各放一张，干扰标签判为不属于。"));
      return;
    }
    root.append(el("h3", "jigsaw-face-title", state.face === "front" ? "正面画面修复" : "背面画布修复"));
    const preview = button(`完整画面预览 ${state.previews}`, () => dispatch({ type: "preview" }));
    preview.disabled = state.previews <= 0 || state.previewVisible;
    const layout = el("div", "jigsaw-layout");
    const tray = el("div", "jigsaw-tray");
    state.pieces.forEach(piece => {
      const item = button(piece.decoy ? "多余画布" : "", () => { selected = piece.id; renderCurrent(); }, `jigsaw-piece ${piece.decoy ? "is-decoy" : ""} ${piece.placed ? "is-placed" : ""} ${selected === piece.id ? "is-selected" : ""}`);
      item.dataset.piece = piece.id;
      item.setAttribute("aria-label", piece.decoy ? "可能的多余画布块" : "可旋转的拼画块");
      item.style.setProperty("--rotation", `${piece.rotation}deg`);
      if (!piece.decoy) {
        const slice = state.face === "front" ? Number(piece.id.slice(1)) : piece.targetSlot;
        item.style.backgroundImage = state.face === "front" ? "var(--jigsaw-front)" : "var(--jigsaw-back)";
        item.style.backgroundPosition = `${(slice % 4) * 33.333}% ${Math.floor(slice / 4) * 50}%`;
      }
      item.disabled = piece.placed; item.draggable = !piece.placed;
      item.addEventListener("dragstart", event => event.dataTransfer.setData("text/plain", piece.id));
      item.addEventListener("dblclick", event => { event.preventDefault(); selected = piece.id; dispatch({ type:"rotate", piece:piece.id }); });
      tray.append(item);
    });
    const board = el("div", `jigsaw-grid face-${state.face}`);
    for (let slot = 0; slot < 12; slot += 1) {
      const target = button("", () => {
        if (!selected) return flashError("先选一块画布。");
        const piece = selected; selected = null; dispatch({ type: "place", piece, slot });
      }, "jigsaw-slot");
      target.dataset.slot = String(slot); target.setAttribute("aria-label", "空的拼接位置");
      const placed = state.pieces.find(piece => piece.placed && piece.slot === slot);
      if (placed) {
        target.classList.add("is-filled");
        target.style.backgroundImage = state.face === "front" ? "var(--jigsaw-front)" : "var(--jigsaw-back)";
        target.style.setProperty("--piece-x", `${(slot % 4) * 33.333}%`); target.style.setProperty("--piece-y", `${Math.floor(slot / 4) * 50}%`);
      }
      target.addEventListener("dragover", event => event.preventDefault());
      target.addEventListener("drop", event => { event.preventDefault(); const piece = event.dataTransfer.getData("text/plain"); selected = null; dispatch({ type: "place", piece, slot }); });
      board.append(target);
    }
    if (state.previewVisible) {
      const overlay = el("div", `jigsaw-preview face-${state.face}`);
      overlay.setAttribute("aria-label", "限时完整画面预览"); board.append(overlay);
    }
    layout.append(tray, board);
    const rotate = button("旋转所选画布 90°", () => selected ? dispatch({ type: "rotate", piece: selected }) : flashError("先选一块画布。"), "rotate-piece");
    const controls = el("div", "jigsaw-controls");
    controls.append(preview, rotate);
    root.append(controls, layout);
    if (state.face === "front" && state.frontComplete) root.append(button("翻到背面继续拼接", () => { selected = null; dispatch({ type: "flip" }); }, "primary flip-board"));
    root.append(el("p", "keyboard-guide", "键盘：Tab 选择拼块和槽位，Enter 操作。双击拼块或使用旋转按钮转 90 度。"));
  }

  function renderRoute(state, root) {
    const board = el("div", "route-board");
    if (state.stage === "timeline") {
      board.append(el("h3", "", "五张时间卡：排列三张证据，排除两张干扰"));
      const cardGrid = el("div", "route-card-grid");
      for (const memory of state.cards) {
        const card = el("article", `route-card ${state.timeline.includes(memory) ? "is-timeline" : state.excluded.includes(memory) ? "is-excluded" : ""}`);
        card.dataset.memory = memory;
        card.append(el("strong", "", labels[memory]));
        if (state.timeline.includes(memory) || state.excluded.includes(memory)) card.append(button("撤下重判", () => dispatch({ type: "removeMemory", memory }), "route-remove"));
        else card.append(button("加入时间轴", () => dispatch({ type: "timeline", memory }), "route-add"), button("排除为干扰", () => dispatch({ type: "excludeMemory", memory }), "route-exclude"));
        cardGrid.append(card);
      }
      const ordered = el("ol", "timeline-list"); state.timeline.forEach(memory => ordered.append(el("li", "", labels[memory])));
      const excluded = el("p", "excluded-list", `已排除：${state.excluded.map(memory => labels[memory]).join("、") || "无"}`);
      board.append(cardGrid, ordered, excluded);
    } else {
      board.append(el("h3", "", "三段证据链：点击地点查看档案，再连接空间路线"));
      board.append(el("p", "route-stage-brief", "时间轴已经确定。现在不再排序时间，而是重新查看每章画面、人物证词、关键物证与玩法经历，确认空间路线。"));
      const positions = { shop: [12, 48], gallery: [42, 22], paul: [78, 45], cafe: [23, 80], station: [61, 82], river: [88, 76] };
      const map = el("div", "route-map");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 100 100"); svg.classList.add("route-lines");
      state.connections.forEach(route => {
        const [from, to] = route.split(">"); const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        const certainty = state.output.find(item => item.route === route)?.certainty || "inferred";
        line.classList.add(`pencil-line-${certainty}`);
        line.setAttribute("x1", positions[from][0]); line.setAttribute("y1", positions[from][1]); line.setAttribute("x2", positions[to][0]); line.setAttribute("y2", positions[to][1]); svg.append(line);
      });
      map.append(svg);
      for (const location of state.locations) {
        const node = button(labels[location], () => {
          if (!selectedLocation) { selectedLocation = location; return renderCurrent(); }
          if (selectedLocation === location) { selectedLocation = null; return renderCurrent(); }
          const from = selectedLocation; selectedLocation = null; dispatch({ type: "connect", from, to: location });
        }, `route-node ${selectedLocation === location ? "is-selected" : ""}`);
        node.dataset.location = location; node.dataset.label = labels[location]; node.style.left = `${positions[location][0]}%`; node.style.top = `${positions[location][1]}%`; map.append(node);
      }
      if (state.conflict) board.append(el("p", "conflict route-conflict", state.conflict));
      board.append(map);
      const chain = el("ol", "route-evidence-chain");
      for (const step of ["shop", "gallery", "paul"]) chain.append(el("li", state.connections.some(edge => edge.includes(step)) ? "is-linked" : "", routeDossiers[step].title));
      board.append(chain);
      if (selectedLocation) {
        const dossier = routeDossiers[selectedLocation];
        const casefile = el("article", "route-casefile");
        const image = document.createElement("img"); image.src = dossier.image; image.alt = `${dossier.title}章节画面`;
        const copy = el("div", "route-casefile-copy");
        copy.append(el("h4", "", dossier.title), el("p", "", `见证人：${dossier.witness}`), el("p", "", `经历事件：${dossier.event}`), el("p", "", `关键线索：${dossier.evidence}`), el("p", "", `对应玩法：${dossier.gameplay}`));
        casefile.append(image, copy); board.append(casefile);
      }
      if (state.output.length) {
        const certainty = { confirmed: "确认", inferred: "推测", unknown: "未知" };
        const list = el("ul", "route-output"); state.output.forEach(item => list.append(el("li", `certainty-${item.certainty}`, `${labels[item.route]}：${certainty[item.certainty]}`))); board.append(list);
      }
    }
    root.append(board, el("p", "keyboard-guide", "键盘：Tab 选择记录或路线，Enter 添加。完成前可撤回或重置。"));
  }

  function addPuzzleHintFocus(target, label) {
    if (!target) return;
    target.classList.add("puzzle-hint-focus");
    const callout = el("span", "puzzle-hint-action", label);
    callout.setAttribute("aria-hidden", "true");
    target.append(callout);
  }

  function markPuzzleHintAction(state, stage, root) {
    if (stage < 1 || !root) return;
    if (context.nodeId === "c1_puzzle") {
      const topPiece = state.locations.main.at(-1);
      addPuzzleHintFocus(root.querySelector(`[data-piece="${topPiece}"]`), "抓住画框边缘");
      addPuzzleHintFocus(root.querySelector(".storage-dropzone"), "拖到承放区再松开");
    }
    if (context.nodeId === "c2_inspect") addPuzzleHintFocus(root.querySelector(".trace-point:not(.is-observed)"), "移动放大镜后点击");
    if (context.nodeId === "c2_puzzle") {
      const exclusionReason = { g1:"尺寸", g2:"厂印", g3:"修补", g5:"尺寸", g6:"日期" };
      let target = null; let label = "";
      for (const id of state.paintings) {
        const card = root.querySelector(`[data-painting="${id}"]`);
        const seen = state.inspected[id] || [];
        if (!seen.includes("front")) { target = card?.querySelector(".inspect-front"); label = "点击检查正面"; break; }
        if (!seen.includes("back")) { target = card?.querySelector(".inspect-back"); label = "点击检查背面"; break; }
        if (!state.marks[id]) {
          if (id === "g4") { target = card?.querySelector(".stamp-candidate"); label = "五项都符合，点这里"; }
          else { const reason = exclusionReason[id]; target = card?.querySelector(`[data-reason="${reason}"]`); label = `与委托的${reason}不符，点这里排除`; }
          break;
        }
      }
      if (!target) { target = root.querySelector(".gallery-submit:not(:disabled)"); label = "判定完成，提交唯一候选"; }
      addPuzzleHintFocus(target, label);
    }
    if (context.nodeId === "c3_puzzle") {
      if (state.face === "labels") addPuzzleHintFocus(root.querySelector(".label-card button"), "选择标签去向");
      else if (!selected) addPuzzleHintFocus(root.querySelector(".jigsaw-piece:not(.is-placed):not(.is-decoy)"), "先选一块画布");
      else {
        const piece = state.pieces.find(item => item.id === selected);
        if (piece?.rotation !== 0) addPuzzleHintFocus(root.querySelector(".rotate-piece"), `还需旋转${(360 - piece.rotation) / 90}次`);
        else addPuzzleHintFocus(root.querySelector(`.jigsaw-slot[data-slot="${piece?.targetSlot}"]`), "方向正确，放到这里");
      }
    }
    if (context.nodeId === "c4_assembly") {
      let target = null; let label = "";
      if (state.stage === "timeline") {
        const expectedTimeline = ["tanguy","theo","paul"];
        const nextMemory = expectedTimeline[state.timeline.length];
        if (nextMemory) { target = root.querySelector(`[data-memory="${nextMemory}"] .route-add`); label = "按证据顺序加入时间轴"; }
        else {
          const nextExcluded = ["cafe","station"].find(memory => !state.excluded.includes(memory));
          target = root.querySelector(`[data-memory="${nextExcluded}"] .route-exclude`); label = "这张是干扰记录，点此排除";
        }
      } else {
        const firstDone = state.connections.includes("shop>gallery");
        let wanted;
        if (!firstDone) {
          wanted = !selectedLocation ? "shop" : selectedLocation === "shop" ? "gallery" : selectedLocation === "gallery" ? "shop" : "shop";
          label = !selectedLocation ? "先点唐吉画材店，查看第一份物证" : `再点${labels[wanted]}，确认第一段路线`;
        } else {
          wanted = !selectedLocation ? "gallery" : selectedLocation === "gallery" ? "paul" : selectedLocation === "paul" ? "gallery" : "gallery";
          label = !selectedLocation ? "从贝尔纳画廊开始第二段" : `再点${labels[wanted]}，逼近最后地址`;
        }
        target = root.querySelector(`.route-node[data-location="${wanted}"]`);
      }
      addPuzzleHintFocus(target, label);
    }
  }

  function renderPuzzleHint(state, root) {
    const currentHint = activeHint?.nodeId === context.nodeId ? activeHint : null;
    const coached = guidedHintNode === context.nodeId;
    if (!currentHint && !coached) return;
    const labelsByStage = ["提示一　文字提示", "提示二　操作示范", "提示三　下一步"];
    const panel = el("aside", "puzzle-hint-panel");
    panel.dataset.stage = String((currentHint?.stage ?? 1) + 1);
    panel.setAttribute("role", "status");
    panel.append(el("strong", "", currentHint ? labelsByStage[currentHint.stage] || labelsByStage[2] : "操作演示进行中"), el("p", "", currentHint?.message || "点击画面中高亮的控件，完成后会自动标出下一步。"));
    root.append(panel);
    markPuzzleHintAction(state, Math.max(1, currentHint?.stage ?? 1), root);
  }

  function renderCurrent() {
    if (!context) return;
    completionMediaObserver?.disconnect(); completionMediaObserver = null;
    ensureState();
    const state = currentState();
    context.content.innerHTML = "";
    const root = shell(state);
    if (context.nodeId === "c1_puzzle") renderStorage(state, root);
    if (context.nodeId === "c1_scratch") renderConservation(state, root);
    if (context.nodeId === "c2_inspect") renderEvidence(state, root);
    if (context.nodeId === "c2_puzzle") renderGallery(state, root);
    if (context.nodeId === "c3_puzzle") renderJigsaw(state, root);
    if (context.nodeId === "c4_assembly") renderRoute(state, root);
    renderPuzzleHint(state, root);
    context.content.append(root);
    renderCompletionMedia(state);
    const tray = document.querySelector("#context-tool-tray");
    const toolConfig = ({
      c1_puzzle:["storage","支撑带与尺寸签","尺寸签、铆钉与承重记录"], c1_scratch:["cleaning","清理工具","侧光、软刷、棉签与清洁布"],
      c2_inspect:["magnifier","放大镜","真实镜片与证据纸签"], c2_puzzle:["collection","馆藏章","检查抽屉与馆藏章"],
      c3_puzzle:["jigsaw","翻面工具","旋转、完整预览与背标"], c4_assembly:["route","路线工具","旧地图、图钉与红铅笔"]
    })[context.nodeId] || ["archive","修复工具","修复档案"];
    if (tray) { tray.dataset.tool = toolConfig[0]; tray.querySelector("span").textContent = toolConfig[1]; tray.querySelector("p").textContent = toolConfig[2]; }
    const undoControl = document.querySelector("#puzzle-undo");
    const resetControl = document.querySelector("#puzzle-reset");
    if (undoControl) undoControl.onclick = undo;
    if (resetControl) resetControl.onclick = reset;
    updateChrome(state);
  }

  function render(nextContext) {
    if (!logic.nodeIds.includes(nextContext.nodeId)) return false;
    context = nextContext; selected = null; storageGuideReplay = false; storagePointerDrag = null; conservationGuideReplayPhase = null; conservationDirectHintPhase = null; activeHint = null; guidedHintNode = null; ensureState();
    context.setProgress(currentState().complete ? 1 : 0);
    renderCurrent(); return true;
  }

  function hint(nodeId, stage, state) {
    const list = hints[nodeId] || [];
    if (nodeId === "c1_scratch") return conservation.hint(state, stage);
    if (nodeId === "c4_assembly" && state.stage === "map") return [
      "时间轴已经确定。空间路线只使用有正式物证的三个地点：唐吉画材店、贝尔纳画廊、保罗住址。点击地点可重新查看章节画面和线索。",
      "从唐吉画材店开始，连接贝尔纳画廊；再从贝尔纳画廊连接保罗住址。正向或反向点选都可以。",
      "正确路线是：唐吉画材店 → 贝尔纳画廊 → 保罗住址。咖啡馆、车站和河畔仓库都缺少可核验物证。"
    ][Math.max(0, Math.min(2, stage))];
    if (stage >= 3) {
      if (nodeId === "c2_puzzle") return `证据回顾：已排除 ${Object.values(state.marks).filter(mark => mark === "excluded").length} 幅，剩余询问机会 ${state.inquiries}。哪项条件还没核对？`;
      return `证据回顾：${state.message}`;
    }
    return list[stage] || list[list.length - 1] || "回看当前已收集的证据。";
  }

  function applyHint(nodeId, stage, state) {
    if (!context || context.nodeId !== nodeId) return hint(nodeId, stage, state);
    const message = hint(nodeId, stage, state);
    activeHint = { nodeId, stage:Math.max(0, Math.min(2, stage)), message };
    if (stage >= 1) guidedHintNode = nodeId;
    if (nodeId === "c1_scratch" && stage >= 1) {
      conservationGuideReplayPhase = state.phase;
      conservationDirectHintPhase = state.phase;
    }
    renderCurrent();
    return message;
  }

  function getTextState(nodeId, state) { return logic.describe(nodeId, state || logic.createState(nodeId)); }

  function advanceTime(milliseconds, host = {}) {
    if (!context || context.nodeId !== "c1_scratch" || !Number.isFinite(milliseconds) || milliseconds < 0) return;
    let state = currentState();
    const clockBefore = state.hostClock;
    if (typeof host.hostPaused === "boolean") state = logic.applyAction(context.nodeId, state, { type: "hostPause", paused: host.hostPaused });
    if (typeof host.audioPending === "boolean") state = logic.applyAction(context.nodeId, state, { type: "audioPending", pending: host.audioPending });
    state = logic.applyAction(context.nodeId, state, { type: "tick", ms: milliseconds });
    context.state.puzzleStates[context.nodeId] = state;
    conservationClockMark = performance.now();
    if (state.hostClock > clockBefore) conservationDeterministicClock = true;
  }

  function setHostPaused(paused, audioPending = false) {
    if (!context) return;
    document.querySelectorAll(".puzzle-completion-media video").forEach(video => paused ? video.pause() : video.play().catch(() => {}));
    if (context.nodeId !== "c1_scratch") return;
    let state = logic.applyAction(context.nodeId, currentState(), { type: "hostPause", paused: Boolean(paused) });
    state = logic.applyAction(context.nodeId, state, { type: "audioPending", pending: Boolean(audioPending) });
    context.state.puzzleStates[context.nodeId] = state;
    conservationClockMark = performance.now();
    if (!paused && !audioPending) conservationDeterministicClock = false;
    document.querySelectorAll(".conservation-completion video").forEach(video => paused ? video.pause() : video.play().catch(() => {}));
  }

  function setReduceMotion(reduced) {
    if (!context) return;
    if (["c1_puzzle", "c2_inspect"].includes(context.nodeId) && currentState().complete) { renderCurrent(); return; }
    if (context.nodeId !== "c1_scratch") return;
    const state = currentState();
    if (reduced && state.complete && state.completionMode === "video") {
      context.state.puzzleStates[context.nodeId] = logic.applyAction(context.nodeId, state, { type: "completionMode", mode: "poster" });
      context.save();
      renderCurrent();
    }
  }

  window.RedbeardPuzzleOverhaul = Object.freeze({ render, hint, applyHint, revealTargetForStroke, getTextState, advanceTime, setHostPaused, setReduceMotion, goals, dispatch: action => context && dispatch(action) });
})();
