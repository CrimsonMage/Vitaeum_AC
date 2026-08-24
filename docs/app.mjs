import {
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  classifyReleaseAssets,
  formatBytes,
  isTrustedReleaseUrl,
  releaseDisplayName,
  selectNewestPublishedRelease,
} from "./release-feed.mjs";
import { normalizeGalleryEntries } from "./gallery.mjs";

const RELEASES_API = "https://api.github.com/repos/CrimsonMage/Vitaeum_AC/releases?per_page=10";
const RELEASES_PAGE = "https://github.com/CrimsonMage/Vitaeum_AC/releases";

initializeNavigation();
initializeCurrentYear();
void initializeReleaseFeed();
void initializeGallery();

function initializeNavigation() {
  const header = document.querySelector("[data-site-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const navigation = document.querySelector("[data-navigation]");

  if (!(header instanceof HTMLElement) || !(toggle instanceof HTMLButtonElement) || !(navigation instanceof HTMLElement)) {
    return;
  }

  const closeNavigation = () => {
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  navigation.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeNavigation();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNavigation();
    }
  });

  const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

function initializeCurrentYear() {
  const year = document.querySelector("[data-current-year]");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}

async function initializeReleaseFeed() {
  const panel = document.querySelector("[data-release-panel]");
  if (!(panel instanceof HTMLElement)) {
    return;
  }

  try {
    const response = await fetch(RELEASES_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`);
    }

    const release = selectNewestPublishedRelease(await response.json());
    if (!release) {
      renderNoRelease(panel);
      return;
    }

    renderRelease(panel, release);
  } catch (error) {
    console.warn("Vitaeum release feed is unavailable.", error);
    renderReleaseFailure(panel);
  }
}

function renderRelease(panel, release) {
  const title = panel.querySelector("[data-release-title]");
  const meta = panel.querySelector("[data-release-meta]");
  const badge = panel.querySelector("[data-release-badge]");
  const releaseLink = panel.querySelector("[data-release-page-link]");
  const releaseUrl = isTrustedReleaseUrl(release.html_url) ? release.html_url : RELEASES_PAGE;
  const publishedDate = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(release.published_at));

  if (title) {
    title.textContent = releaseDisplayName(release);
  }
  if (meta) {
    const tag = typeof release.tag_name === "string" && release.tag_name.trim()
      ? ` · ${release.tag_name.trim()}`
      : "";
    meta.textContent = `Published ${publishedDate}${tag}`;
  }
  if (badge instanceof HTMLElement) {
    badge.hidden = release.prerelease !== true;
  }
  if (releaseLink instanceof HTMLAnchorElement) {
    releaseLink.href = releaseUrl;
    releaseLink.firstChild.textContent = "Release notes ";
  }

  const assets = classifyReleaseAssets(release.assets);
  for (const platform of PLATFORM_ORDER) {
    renderAssetGroup(panel, platform, assets[platform]);
  }
  renderOtherAssets(panel, assets.other);
  panel.setAttribute("aria-busy", "false");
}

function renderNoRelease(panel) {
  setReleaseStatus(panel, "First release coming soon", "Windows, Linux, and macOS builds are being prepared.");
  setPlatformStates(panel, "Coming soon");
  panel.setAttribute("aria-busy", "false");
}

function renderReleaseFailure(panel) {
  setReleaseStatus(panel, "Release status unavailable", "GitHub could not be reached. Downloads remain available from the Releases page.");
  setPlatformStates(panel, "Check GitHub Releases");
  panel.setAttribute("aria-busy", "false");
}

function setReleaseStatus(panel, titleText, metaText) {
  const title = panel.querySelector("[data-release-title]");
  const meta = panel.querySelector("[data-release-meta]");
  const badge = panel.querySelector("[data-release-badge]");
  if (title) title.textContent = titleText;
  if (meta) meta.textContent = metaText;
  if (badge instanceof HTMLElement) badge.hidden = true;
}

function setPlatformStates(panel, state) {
  for (const platform of PLATFORM_ORDER) {
    const container = panel.querySelector(`[data-platform-assets="${platform}"]`);
    const card = panel.querySelector(`[data-platform-card="${platform}"]`);
    card?.classList.remove("has-assets");
    if (container) {
      container.replaceChildren(createStateParagraph(state));
    }
  }
}

function renderAssetGroup(panel, platform, assets) {
  const container = panel.querySelector(`[data-platform-assets="${platform}"]`);
  const card = panel.querySelector(`[data-platform-card="${platform}"]`);
  if (!container) {
    return;
  }

  if (assets.length === 0) {
    card?.classList.remove("has-assets");
    container.replaceChildren(createStateParagraph("Not included in this release"));
    return;
  }

  card?.classList.add("has-assets");
  container.replaceChildren(...assets.map((asset) => createAssetLink(asset, PLATFORM_LABELS[platform])));
}

function renderOtherAssets(panel, assets) {
  const wrapper = panel.querySelector("[data-other-downloads]");
  const container = panel.querySelector("[data-other-assets]");
  if (!(wrapper instanceof HTMLElement) || !container) {
    return;
  }

  wrapper.hidden = assets.length === 0;
  container.replaceChildren(...assets.map((asset) => createAssetLink(asset, "Other")));
}

function createAssetLink(asset, platformLabel) {
  const link = document.createElement("a");
  link.className = "asset-link";
  link.href = asset.downloadUrl;
  link.setAttribute("aria-label", `Download ${asset.name} for ${platformLabel}`);

  const name = document.createElement("span");
  name.className = "asset-name";
  name.textContent = asset.name;

  const size = document.createElement("span");
  size.className = "asset-size";
  size.textContent = formatBytes(asset.size);

  link.append(name, size);
  return link;
}

function createStateParagraph(text) {
  const paragraph = document.createElement("p");
  paragraph.className = "asset-state";
  paragraph.textContent = text;
  return paragraph;
}

async function initializeGallery() {
  const grid = document.querySelector("[data-gallery-grid]");
  const dialog = document.querySelector("[data-gallery-dialog]");
  if (!(grid instanceof HTMLElement) || !(dialog instanceof HTMLDialogElement)) {
    return;
  }

  try {
    const response = await fetch("gallery.json", { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`Gallery returned ${response.status}`);
    }

    const entries = normalizeGalleryEntries(await response.json());
    if (entries.length > 0) {
      renderGallery(grid, dialog, entries);
    }
  } catch (error) {
    console.warn("Vitaeum gallery manifest is unavailable.", error);
  }
}

function renderGallery(grid, dialog, entries) {
  const triggers = entries.map((entry, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-item";
    button.setAttribute("aria-label", `Open image: ${entry.alt}`);

    const image = document.createElement("img");
    image.src = entry.thumbnail;
    image.alt = entry.alt;
    image.loading = "lazy";
    image.decoding = "async";

    const caption = document.createElement("span");
    caption.textContent = entry.caption || entry.alt;
    button.append(image, caption);
    button.addEventListener("click", () => openGalleryDialog(dialog, entries, triggers, index));
    return button;
  });

  grid.replaceChildren(...triggers);
}

function openGalleryDialog(dialog, entries, triggers, startIndex) {
  const image = dialog.querySelector("[data-gallery-dialog-image]");
  const caption = dialog.querySelector("[data-gallery-dialog-caption]");
  const close = dialog.querySelector("[data-gallery-close]");
  const previous = dialog.querySelector("[data-gallery-previous]");
  const next = dialog.querySelector("[data-gallery-next]");
  if (!(image instanceof HTMLImageElement) || !caption || !(close instanceof HTMLButtonElement)) {
    return;
  }

  let currentIndex = startIndex;
  const render = () => {
    const entry = entries[currentIndex];
    image.src = entry.src;
    image.alt = entry.alt;
    caption.textContent = entry.caption || entry.alt;
    const showNavigation = entries.length > 1;
    if (previous instanceof HTMLButtonElement) previous.hidden = !showNavigation;
    if (next instanceof HTMLButtonElement) next.hidden = !showNavigation;
  };
  const move = (offset) => {
    currentIndex = (currentIndex + offset + entries.length) % entries.length;
    render();
  };
  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
  };
  const onClose = () => {
    dialog.removeEventListener("keydown", onKeyDown);
    triggers[startIndex]?.focus();
  };

  close.onclick = () => dialog.close();
  if (previous instanceof HTMLButtonElement) previous.onclick = () => move(-1);
  if (next instanceof HTMLButtonElement) next.onclick = () => move(1);
  dialog.addEventListener("keydown", onKeyDown);
  dialog.addEventListener("close", onClose, { once: true });
  render();
  dialog.showModal();
}
