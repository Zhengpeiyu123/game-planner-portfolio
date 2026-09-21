(() => {
  'use strict';

  const levels = {
    potato: { title: '吃土豆的人', src: 'levels/potato/index.html' },
    redbeard: { title: '红胡子的人', src: 'levels/redbeard/index.html' }
  };
  const app = document.querySelector('#gallery-app');
  const startMenu = document.querySelector('#start-menu');
  const startVideo = document.querySelector('#start-menu-video');
  const startPoster = document.querySelector('#start-menu-poster');
  const pageTurnVideo = document.querySelector('#start-page-turn-video');
  const gallery = document.querySelector('#gallery');
  const shell = document.querySelector('#level-shell');
  const loading = document.querySelector('#loading-card');
  const loadError = document.querySelector('#load-error');
  const returnButton = document.querySelector('#gallery-return');
  const stateApi = window.HuazhongrenState.createGalleryState(window.localStorage);
  const qaMode = new URLSearchParams(window.location.search).get('qa') === 'redbeard' ? 'redbeard' : null;
  let save = stateApi.load();
  let mode = 'menu';
  let currentLevel = null;
  let currentFrame = null;
  let loadTimer = 0;
  let lastRequestedLevel = null;
  let orientationPaused = false;
  let clearTrigger = null;
  let settingsTrigger = null;
  let startTransitionTimer = 0;
  let startTransitionFinish = null;

  function setMode(next) {
    mode = next;
    app.dataset.state = next;
  }

  function isUnlocked(level) { return level === 'redbeard' && qaMode === 'redbeard' ? true : Boolean(save.unlocked[level]); }
  function isCompleted(level) { return Boolean(save.completed[level]); }
  function canContinue() { return Boolean(save.lastLevel && levels[save.lastLevel] && isUnlocked(save.lastLevel)); }

  function syncStartMenu() {
    document.querySelector('#continue-game').disabled = !canContinue();
  }

  function syncStartMedia() {
    const shouldPause = Boolean(save.settings.reduceMotion) || startMenu.hidden || mode !== 'menu' || !settingsDrawer?.hidden;
    if (shouldPause) { startVideo.pause(); return; }
    startVideo.play().catch(() => startVideo.classList.add('is-failed'));
  }

  function enterGallery(afterEnter = null) {
    if (mode !== 'menu') return;
    save = stateApi.update({ galleryVisited: true });
    gallery.hidden = false;
    setMode('opening');
    renderCards();
    const finish = () => {
      if (mode !== 'opening') return;
      clearTimeout(startTransitionTimer);
      startTransitionFinish = null;
      pageTurnVideo.pause();
      pageTurnVideo.hidden = true;
      startMenu.hidden = true;
      startMenu.classList.remove('is-opening-book', 'has-page-turn-video');
      setMode('gallery');
      syncStartMedia();
      if (typeof afterEnter === 'function') afterEnter();
    };
    if (save.settings.reduceMotion) { finish(); return; }
    startTransitionFinish = finish;
    startMenu.classList.add('is-opening-book');
    startVideo.pause();
    pageTurnVideo.volume = Math.max(0, Math.min(1, save.settings.volume));
    pageTurnVideo.currentTime = 0;
    pageTurnVideo.hidden = false;
    const useCssFallback = () => {
      if (mode !== 'opening') return;
      clearTimeout(startTransitionTimer);
      pageTurnVideo.pause();
      pageTurnVideo.hidden = true;
      startMenu.classList.remove('has-page-turn-video', 'is-opening-book');
      void startMenu.offsetWidth;
      startMenu.classList.add('is-opening-book');
      startTransitionTimer = setTimeout(finish, 920);
    };
    if (pageTurnVideo.error) { useCssFallback(); return; }
    startTransitionTimer = setTimeout(() => {
      if (mode === 'opening' && !startMenu.classList.contains('has-page-turn-video')) useCssFallback();
    }, 500);
    pageTurnVideo.play().then(() => {
      if (mode !== 'opening') return;
      clearTimeout(startTransitionTimer);
      startMenu.classList.add('has-page-turn-video');
      startTransitionTimer = setTimeout(finish, 5200);
    }).catch(useCssFallback);
  }

  function renderCards() {
    document.querySelectorAll('.painting-card').forEach(card => {
      const id = card.dataset.level;
      const unlocked = isUnlocked(id);
      card.classList.toggle('is-locked', !unlocked);
      card.classList.toggle('is-completed', isCompleted(id));
      card.disabled = !unlocked;
      card.setAttribute('aria-disabled', String(!unlocked));
      if (unlocked) card.removeAttribute('tabindex');
      else card.setAttribute('tabindex', '-1');
      card.setAttribute('aria-label', unlocked ? `进入${levels[id].title}` : `${levels[id].title}，尚未解锁`);
      const mark = card.querySelector('.lock-mark');
      if (mark) mark.hidden = unlocked;
      card.querySelector('[data-status]').textContent = id === 'redbeard' && qaMode === 'redbeard' && !save.unlocked.redbeard
        ? '测试开放'
        : isCompleted(id) ? '已完成，可再次进入' : unlocked ? '可进入' : '完成左幅后开启';
    });
    const sound = document.querySelector('#sound-toggle');
    sound.querySelector('b').textContent = `声音：${save.settings.volume > 0 ? '开' : '关'}`;
    sound.setAttribute('aria-label', save.settings.volume > 0 ? '关闭声音' : '开启声音');
    document.querySelector('#gallery-volume').value = String(Math.round(save.settings.volume * 100));
    document.querySelector('#gallery-reduce-motion').checked = Boolean(save.settings.reduceMotion);
    document.querySelector('#gallery-high-contrast').checked = Boolean(save.settings.highContrast);
    app.classList.toggle('reduce-motion', Boolean(save.settings.reduceMotion));
    app.classList.toggle('high-contrast', Boolean(save.settings.highContrast));
    syncStartMenu();
    syncStartMedia();
  }

  function postToLevel(type, extra = {}) {
    if (!currentFrame?.contentWindow) return;
    const bareType = type.startsWith('huazhongren:') ? type.slice('huazhongren:'.length) : type;
    currentFrame.contentWindow.postMessage({ source: 'huazhongren-gallery', type: `huazhongren:${bareType}`, level: currentLevel, volume: save.settings.volume, reduceMotion: save.settings.reduceMotion, highContrast: save.settings.highContrast, ...extra }, location.origin);
  }

  function failLoad() {
    if (!currentFrame || mode !== 'loading') return;
    loading.hidden = true;
    loadError.hidden = false;
  }

  function syncOrientation(force = false) {
    const portrait = window.innerHeight > window.innerWidth;
    if (!currentFrame) { orientationPaused = portrait; return; }
    if (portrait && (!orientationPaused || force)) postToLevel('pause');
    if (!portrait && orientationPaused && mode === 'playing') postToLevel('resume');
    orientationPaused = portrait;
  }

  function openLevel(level) {
    if (!levels[level] || !isUnlocked(level) || currentFrame) return;
    lastRequestedLevel = level;
    currentLevel = level;
    save = stateApi.update({ lastLevel: level });
    setMode('loading');
    gallery.hidden = true;
    shell.hidden = false;
    returnButton.textContent = '返回画廊（本关将从头开始）';
    loading.hidden = false;
    loadError.hidden = true;
    const frame = document.createElement('iframe');
    frame.id = 'level-frame';
    frame.title = levels[level].title;
    frame.allow = 'autoplay; fullscreen';
    frame.allowFullscreen = true;
    frame.src = levels[level].src;
    frame.addEventListener('error', failLoad);
    shell.insertBefore(frame, returnButton);
    currentFrame = frame;
    orientationPaused = false;
    syncOrientation();
    clearTimeout(loadTimer);
    loadTimer = setTimeout(failLoad, 12000);
  }

  function closeLevel() {
    if (!currentFrame) return;
    postToLevel('pause');
    setMode('returning');
    clearTimeout(loadTimer);
    const frame = currentFrame;
    currentFrame = null;
    currentLevel = null;
    setTimeout(() => {
      frame.remove();
      shell.hidden = true;
      returnButton.textContent = '返回画廊';
      startMenu.hidden = true;
      startMenu.classList.remove('is-opening-book', 'has-page-turn-video');
      gallery.hidden = false;
      loading.hidden = false;
      loadError.hidden = true;
      setMode('gallery');
      renderCards();
    }, 80);
  }

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || !currentFrame || event.source !== currentFrame.contentWindow) return;
    const message = event.data;
    if (!message || message.source !== 'huazhongren-level' || message.level !== currentLevel) return;
    const messageType = String(message.type || '').startsWith('huazhongren:') ? String(message.type).slice('huazhongren:'.length) : message.type;
    if (messageType === 'ready') {
      clearTimeout(loadTimer);
      loading.hidden = true;
      loadError.hidden = true;
      setMode('playing');
      postToLevel('settings');
      syncOrientation(true);
      if (!orientationPaused) postToLevel('resume');
    }
    if (messageType === 'progress') save = stateApi.update({ lastLevel: currentLevel });
    if (messageType === 'level-complete') {
      save = stateApi.complete(currentLevel);
      renderCards();
    }
    if (messageType === 'return-request') closeLevel();
  });

  document.querySelectorAll('.painting-card').forEach(card => card.addEventListener('click', () => openLevel(card.dataset.level)));
  returnButton.addEventListener('click', closeLevel);
  document.querySelector('#retry-level').addEventListener('click', () => {
    const level = lastRequestedLevel;
    if (currentFrame) { currentFrame.remove(); currentFrame = null; currentLevel = null; }
    openLevel(level);
  });
  document.querySelector('#sound-toggle').addEventListener('click', () => {
    save = stateApi.update({ settings: { ...save.settings, volume: save.settings.volume > 0 ? 0 : .8 } });
    renderCards();
    postToLevel('settings');
  });
  const settingsDrawer = document.querySelector('#settings-drawer');
  const settingsToggle = document.querySelector('#settings-toggle');
  function openSettings() {
    settingsTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : settingsToggle;
    const fromMenu = settingsTrigger?.id === 'start-settings';
    app.classList.toggle('settings-from-menu', fromMenu);
    if (fromMenu) startMenu.inert = true;
    else gallery.inert = true;
    settingsDrawer.hidden = false;
    settingsToggle.setAttribute('aria-expanded', 'true');
    document.querySelector('#settings-close').focus();
    syncStartMedia();
  }
  function closeSettings() {
    settingsDrawer.hidden = true;
    settingsToggle.setAttribute('aria-expanded', 'false');
    startMenu.inert = false;
    gallery.inert = false;
    app.classList.remove('settings-from-menu');
    settingsTrigger?.focus();
    syncStartMedia();
  }
  settingsToggle.setAttribute('aria-controls', 'settings-drawer');
  settingsToggle.setAttribute('aria-expanded', 'false');
  settingsToggle.addEventListener('click', () => settingsDrawer.hidden ? openSettings() : closeSettings());
  document.querySelector('#start-settings').addEventListener('click', openSettings);
  document.querySelector('#start-game').addEventListener('click', enterGallery);
  document.querySelector('#continue-game').addEventListener('click', () => {
    const level = save.lastLevel;
    enterGallery(() => {
      if (level && levels[level] && isUnlocked(level)) openLevel(level);
    });
  });
  document.querySelector('#settings-close').addEventListener('click', closeSettings);
  document.querySelector('#gallery-volume').addEventListener('input', event => {
    save = stateApi.update({ settings: { ...save.settings, volume: Number(event.target.value) / 100 } });
    renderCards();
    postToLevel('settings');
  });
  document.querySelector('#gallery-reduce-motion').addEventListener('change', event => {
    save = stateApi.update({ settings: { ...save.settings, reduceMotion: event.target.checked } });
    renderCards();
    postToLevel('settings');
  });
  document.querySelector('#gallery-high-contrast').addEventListener('change', event => {
    save = stateApi.update({ settings: { ...save.settings, highContrast: event.target.checked } });
    renderCards();
    postToLevel('settings');
  });
  document.querySelector('#gallery-fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_) { document.querySelector('#gallery-fullscreen').classList.add('is-error'); }
  });
  const confirmPanel = document.querySelector('#clear-confirm');
  confirmPanel.dataset.stage = '二次确认';
  const firstConfirm = document.querySelector('#clear-confirm-first');
  const secondConfirm = document.querySelector('#clear-confirm-second');
  function setClearStage(stage) {
    firstConfirm.hidden = stage !== 1;
    secondConfirm.hidden = stage !== 2;
    confirmPanel.dataset.stage = String(stage);
    (stage === 1 ? document.querySelector('#clear-cancel') : document.querySelector('#clear-back')).focus();
  }
  function openClearDialog(trigger) {
    clearTrigger = trigger;
    confirmPanel.hidden = false;
    setClearStage(1);
  }
  function closeClearDialog() {
    confirmPanel.hidden = true;
    clearTrigger?.focus();
  }
  document.querySelector('#clear-progress').addEventListener('click', event => openClearDialog(event.currentTarget));
  document.querySelector('#clear-cancel').addEventListener('click', closeClearDialog);
  document.querySelector('#clear-continue').addEventListener('click', () => setClearStage(2));
  document.querySelector('#clear-back').addEventListener('click', () => setClearStage(1));
  document.querySelector('#clear-yes').addEventListener('click', () => {
    save = stateApi.clear();
    closeClearDialog();
    renderCards();
  });
  confirmPanel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeClearDialog(); return; }
    if (event.key !== 'Tab') return;
    const confirmButtons = [...confirmPanel.querySelectorAll('button')].filter(button => button.offsetParent !== null);
    const first = confirmButtons[0];
    const last = confirmButtons[confirmButtons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  settingsDrawer.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeSettings(); }
  });
  window.addEventListener('resize', syncOrientation);
  window.addEventListener('orientationchange', syncOrientation);
  startVideo.addEventListener('canplay', () => startVideo.classList.remove('is-failed'));
  startVideo.addEventListener('error', () => startVideo.classList.add('is-failed'));
  startPoster.addEventListener('error', () => startMenu.classList.add('is-error'));
  pageTurnVideo.addEventListener('ended', () => startTransitionFinish?.());
  pageTurnVideo.addEventListener('error', () => {
    if (mode !== 'opening') return;
    pageTurnVideo.hidden = true;
    startMenu.classList.remove('has-page-turn-video', 'is-opening-book');
    void startMenu.offsetWidth;
    startMenu.classList.add('is-opening-book');
    clearTimeout(startTransitionTimer);
    startTransitionTimer = setTimeout(() => startTransitionFinish?.(), 920);
  });

  window.render_game_to_text = () => JSON.stringify({
    mode,
    currentLevel,
    qaMode,
    startMenu: { visible: !startMenu.hidden, continueEnabled: canContinue() },
    unlocked: { potato: isUnlocked('potato'), redbeard: isUnlocked('redbeard') },
    completed: { potato: isCompleted('potato'), redbeard: isCompleted('redbeard') }
  });
  window.advanceTime = ms => {
    if (currentFrame?.contentWindow?.advanceTime) currentFrame.contentWindow.advanceTime(ms);
    return window.render_game_to_text();
  };

  renderCards();
  syncStartMenu();
  syncOrientation();
  syncStartMedia();
})();
