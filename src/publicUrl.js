// Vite substitutes BASE_URL in builds; the fallback also keeps Node-based
// download generation and unit tests able to import the portfolio content.
const DEFAULT_BASE = typeof import.meta.env !== 'undefined' ? import.meta.env.BASE_URL : '/';

/** Resolve public-directory files without changing external links or routes. */
export function publicUrl(path, base = DEFAULT_BASE) {
  if (typeof path !== 'string' || path === ''
    || /^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(path)) return path;

  const trimmedBase = (base || '/').replace(/^\/+|\/+$/g, '');
  const prefix = trimmedBase ? `/${trimmedBase}/` : '/';
  // Content may already have been resolved at its data source.
  if (prefix !== '/' && (path === prefix.slice(0, -1) || path.startsWith(prefix))) return path;
  return prefix + path.replace(/^(?:\.\/)+/, '').replace(/^\/+/, '');
}
