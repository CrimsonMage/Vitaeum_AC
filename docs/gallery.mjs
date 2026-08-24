export function normalizeGalleryEntries(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const src = normalizeLocalAssetPath(entry.src);
    const thumbnail = entry.thumbnail == null
      ? src
      : normalizeLocalAssetPath(entry.thumbnail);
    const alt = typeof entry.alt === "string" ? entry.alt.trim() : "";
    const caption = typeof entry.caption === "string" ? entry.caption.trim() : "";

    if (!src || !thumbnail || !alt) {
      return [];
    }

    return [{ src, thumbnail, alt, caption }];
  });
}

export function normalizeLocalAssetPath(value) {
  if (typeof value !== "string") {
    return null;
  }

  const path = value.trim().replace(/^\.\//, "");
  if (!path.startsWith("assets/gallery/") || path.includes("..") || path.includes(":")) {
    return null;
  }

  return path;
}
