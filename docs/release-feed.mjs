export const PLATFORM_ORDER = Object.freeze(["windows", "linux", "macos"]);

export const PLATFORM_LABELS = Object.freeze({
  windows: "Windows",
  linux: "Linux",
  macos: "macOS",
});

const PLATFORM_PATTERNS = Object.freeze({
  windows: /(?:^|[._-])windows(?:[._-]|$)/i,
  linux: /(?:^|[._-])linux(?:[._-]|$)/i,
  macos: /(?:^|[._-])(?:macos|darwin|osx)(?:[._-]|$)/i,
});

const X86_64_PATTERN = /(?:^|[._-])(?:x86[_-]?64|amd64|x64)(?:[._-]|$)/i;

export function selectNewestPublishedRelease(releases) {
  if (!Array.isArray(releases)) {
    return null;
  }

  return releases
    .filter((release) => {
      if (!release || typeof release !== "object" || release.draft === true) {
        return false;
      }

      return Number.isFinite(Date.parse(release.published_at));
    })
    .sort((left, right) => Date.parse(right.published_at) - Date.parse(left.published_at))[0] ?? null;
}

export function detectAssetPlatform(assetName) {
  if (typeof assetName !== "string" || !X86_64_PATTERN.test(assetName)) {
    return null;
  }

  return PLATFORM_ORDER.find((platform) => PLATFORM_PATTERNS[platform].test(assetName)) ?? null;
}

export function classifyReleaseAssets(assets) {
  const groups = {
    windows: [],
    linux: [],
    macos: [],
    other: [],
  };

  if (!Array.isArray(assets)) {
    return groups;
  }

  for (const asset of assets) {
    if (!isUsableAsset(asset)) {
      continue;
    }

    const platform = detectAssetPlatform(asset.name);
    groups[platform ?? "other"].push({
      name: asset.name,
      size: Number.isFinite(asset.size) && asset.size >= 0 ? asset.size : 0,
      downloadUrl: asset.browser_download_url,
    });
  }

  return groups;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Size unavailable";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  const precision = unitIndex === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

export function releaseDisplayName(release) {
  const name = typeof release?.name === "string" ? release.name.trim() : "";
  const tag = typeof release?.tag_name === "string" ? release.tag_name.trim() : "";
  return name || tag || "Vitaeum release";
}

export function isTrustedReleaseUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "github.com"
      && url.pathname.startsWith("/CrimsonMage/Vitaeum_AC/releases/");
  } catch {
    return false;
  }
}

function isUsableAsset(asset) {
  return asset
    && typeof asset === "object"
    && typeof asset.name === "string"
    && asset.name.trim().length > 0
    && isTrustedReleaseUrl(asset.browser_download_url);
}
