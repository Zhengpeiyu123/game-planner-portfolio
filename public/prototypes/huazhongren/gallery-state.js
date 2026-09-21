(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.HuazhongrenState = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STORAGE_KEY = 'huazhongren.save.v1';
  const LEVEL_KEYS = [
    'potato.save',
    'potato.save.v1',
    'redbeard.save.v1',
    'red-beard-h5-save-v5',
    'red-beard-h5-settings-v2'
  ];

  function defaultSave() {
    return {
      version: 1,
      galleryVisited: false,
      completed: { potato: false, redbeard: false },
      unlocked: { potato: true, redbeard: false },
      lastLevel: null,
      settings: { volume: 0.8, reduceMotion: false, highContrast: false }
    };
  }

  function normalize(raw) {
    const base = defaultSave();
    if (!raw || raw.version !== 1) return base;
    const completed = {
      potato: Array.isArray(raw.completed) ? raw.completed.includes('potato') : Boolean(raw.completed?.potato),
      redbeard: Array.isArray(raw.completed) ? raw.completed.includes('redbeard') : Boolean(raw.completed?.redbeard)
    };
    const unlocked = {
      potato: true,
      redbeard: completed.potato || (Array.isArray(raw.unlocked) ? raw.unlocked.includes('redbeard') : Boolean(raw.unlocked?.redbeard))
    };
    const volume = Number(raw.settings?.volume);
    const migratedVolume = raw.settings?.muted === true ? 0 : Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : base.settings.volume;
    return {
      version: 1,
      galleryVisited: Boolean(raw.galleryVisited),
      completed,
      unlocked,
      lastLevel: raw.lastLevel === 'potato' || raw.lastLevel === 'redbeard' ? raw.lastLevel : null,
      settings: {
        volume: migratedVolume,
        reduceMotion: Boolean(raw.settings?.reduceMotion),
        highContrast: Boolean(raw.settings?.highContrast)
      }
    };
  }

  function createGalleryState(storage) {
    let memory = defaultSave();
    function persist(save) {
      memory = normalize(save);
      try { storage.setItem(STORAGE_KEY, JSON.stringify(memory)); }
      catch { /* 内存状态继续承担本次会话。 */ }
      return memory;
    }
    function load() {
      try {
        const stored = storage.getItem(STORAGE_KEY);
        if (stored !== null) memory = normalize(JSON.parse(stored));
      } catch { /* 读取受限或坏存档时沿用内存状态。 */ }
      return normalize(memory);
    }
    function update(change) {
      const next = normalize({ ...load(), ...change, version: 1 });
      return persist(next);
    }
    function complete(level) {
      const current = load();
      const completed = { ...current.completed, [level]: true };
      const unlocked = { ...current.unlocked, ...(level === 'potato' ? { redbeard: true } : {}) };
      return update({ completed, unlocked, lastLevel: level });
    }
    function clear() {
      memory = defaultSave();
      try { storage.removeItem(STORAGE_KEY); } catch { /* 保持内存清除结果。 */ }
      LEVEL_KEYS.forEach(key => { try { storage.removeItem(key); } catch { /* 继续清除其他键。 */ } });
      return normalize(memory);
    }
    return { load, update, complete, clear };
  }

  return { STORAGE_KEY, LEVEL_KEYS, defaultSave, createGalleryState };
});
