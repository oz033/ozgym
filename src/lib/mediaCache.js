/**
 * In-memory image/GIF cache for workout swipe transitions.
 * Keeps decoded bitmaps warm so neighbor cards never flash empty.
 */

const cache = new Map(); // url -> Promise<"ok"|"err">
const warm = new Set(); // successfully loaded urls

export function isMediaWarm(url) {
  return Boolean(url && warm.has(url));
}

/**
 * Prefetch a media URL into the browser HTTP cache + decode into an Image.
 * Safe to call many times; concurrent callers share one promise.
 */
export function preloadMedia(url) {
  if (!url || typeof url !== "string") return Promise.resolve("err");
  if (warm.has(url)) return Promise.resolve("ok");
  const existing = cache.get(url);
  if (existing) return existing;

  const p = new Promise((resolve) => {
    try {
      const img = new Image();
      img.decoding = "async";
      // GIFs from CDN — anonymous avoids CORS taint without cookies
      img.crossOrigin = "anonymous";
      img.onload = () => {
        warm.add(url);
        // Prefer decode() when available so first paint is ready
        if (typeof img.decode === "function") {
          img
            .decode()
            .then(() => resolve("ok"))
            .catch(() => resolve("ok"));
        } else {
          resolve("ok");
        }
      };
      img.onerror = () => {
        cache.delete(url);
        resolve("err");
      };
      img.src = url;
    } catch {
      cache.delete(url);
      resolve("err");
    }
  });
  cache.set(url, p);
  return p;
}

/** Prefetch several URLs (order preserved; failures ignored). */
export function preloadMediaMany(urls) {
  const list = [...new Set((urls || []).filter(Boolean))];
  return Promise.all(list.map((u) => preloadMedia(u)));
}

/**
 * Resolve best media URLs for a queue item and warm them.
 * @param {{ gif?: string, image?: string, name?: string } | null} item
 * @param {(name: string) => { gifUrl?: string, imageUrl?: string } | null} resolveMedia
 */
export function prefetchExerciseMedia(item, resolveMedia) {
  if (!item) return Promise.resolve([]);
  const looked = resolveMedia?.(item.name || item.exerciseName);
  const urls = [
    item.gif,
    item.image,
    item.entry?.gif,
    item.entry?.image,
    looked?.gifUrl,
    looked?.imageUrl,
  ].filter(Boolean);
  return preloadMediaMany(urls);
}

/** Drop cache (tests / low-memory). */
export function clearMediaCache() {
  cache.clear();
  warm.clear();
}
