import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import {
  classifyReleaseAssets,
  detectAssetPlatform,
  formatBytes,
  isTrustedReleaseUrl,
  releaseDisplayName,
  selectNewestPublishedRelease,
} from "../docs/release-feed.mjs";
import { normalizeGalleryEntries, normalizeLocalAssetPath } from "../docs/gallery.mjs";

const releaseUrl = (name) => `https://github.com/CrimsonMage/Vitaeum_AC/releases/download/v0.1.0/${name}`;

test("selects the newest published release, including prereleases", () => {
  const result = selectNewestPublishedRelease([
    { name: "Older", draft: false, prerelease: false, published_at: "2026-01-01T00:00:00Z" },
    { name: "Preview", draft: false, prerelease: true, published_at: "2026-02-01T00:00:00Z" },
    { name: "Draft", draft: true, prerelease: false, published_at: "2026-03-01T00:00:00Z" },
  ]);

  assert.equal(result.name, "Preview");
  assert.equal(result.prerelease, true);
});

test("ignores invalid release collections and unpublished values", () => {
  assert.equal(selectNewestPublishedRelease(null), null);
  assert.equal(selectNewestPublishedRelease([null, {}, { draft: true, published_at: "2026-01-01" }]), null);
});

test("detects canonical x86-64 platform tokens", () => {
  assert.equal(detectAssetPlatform("vitaeum-v0.1.0-windows-x86_64.zip"), "windows");
  assert.equal(detectAssetPlatform("vitaeum-v0.1.0-linux-amd64.tar.gz"), "linux");
  assert.equal(detectAssetPlatform("vitaeum-v0.1.0-macos-x64.dmg"), "macos");
  assert.equal(detectAssetPlatform("vitaeum-v0.1.0-darwin-x86-64.zip"), "macos");
  assert.equal(detectAssetPlatform("vitaeum-v0.1.0-windows-arm64.zip"), null);
  assert.equal(detectAssetPlatform("vitaeum-v0.1.0.zip"), null);
});

test("classifies three-platform assets and retains other downloads", () => {
  const assets = [
    "vitaeum-v0.1.0-windows-x86_64.zip",
    "vitaeum-v0.1.0-linux-x86_64.tar.gz",
    "vitaeum-v0.1.0-macos-x86_64.dmg",
    "checksums.txt",
  ].map((name, index) => ({ name, size: 1024 * (index + 1), browser_download_url: releaseUrl(name) }));

  const groups = classifyReleaseAssets(assets);
  assert.equal(groups.windows.length, 1);
  assert.equal(groups.linux.length, 1);
  assert.equal(groups.macos.length, 1);
  assert.equal(groups.other.length, 1);
  assert.equal(groups.other[0].name, "checksums.txt");
});

test("drops malformed or untrusted release assets", () => {
  const groups = classifyReleaseAssets([
    null,
    { name: "vitaeum-windows-x86_64.zip", browser_download_url: "https://example.com/file.zip" },
    { name: "", browser_download_url: releaseUrl("empty.zip") },
  ]);

  assert.deepEqual(groups, { windows: [], linux: [], macos: [], other: [] });
  assert.equal(isTrustedReleaseUrl("https://github.com/CrimsonMage/Vitaeum_AC/releases/tag/v0.1.0"), true);
  assert.equal(isTrustedReleaseUrl("javascript:alert(1)"), false);
});

test("formats asset sizes and release names safely", () => {
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(15 * 1024 * 1024), "15 MB");
  assert.equal(formatBytes(0), "Size unavailable");
  assert.equal(releaseDisplayName({ name: " ", tag_name: "v0.1.0" }), "v0.1.0");
});

test("normalizes safe gallery entries and rejects remote or traversal paths", () => {
  const entries = normalizeGalleryEntries([
    {
      src: "assets/gallery/world.webp",
      thumbnail: "./assets/gallery/world-thumbnail.webp",
      alt: "A rendered landscape",
      caption: "Landscape work in progress",
    },
    { src: "https://example.com/image.webp", alt: "Remote" },
    { src: "assets/gallery/../secret.webp", alt: "Traversal" },
    { src: "assets/gallery/no-alt.webp" },
  ]);

  assert.deepEqual(entries, [{
    src: "assets/gallery/world.webp",
    thumbnail: "assets/gallery/world-thumbnail.webp",
    alt: "A rendered landscape",
    caption: "Landscape work in progress",
  }]);
  assert.equal(normalizeLocalAssetPath("assets/gallery/image.webp"), "assets/gallery/image.webp");
  assert.equal(normalizeLocalAssetPath("/assets/gallery/image.webp"), null);
});

test("published gallery entries are valid and reference local assets", async () => {
  const manifestUrl = new URL("../docs/gallery.json", import.meta.url);
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  const entries = normalizeGalleryEntries(manifest);

  assert.equal(entries.length, 8);
  await Promise.all(entries.flatMap((entry) => [
    access(new URL(`../docs/${entry.src}`, import.meta.url)),
    access(new URL(`../docs/${entry.thumbnail}`, import.meta.url)),
  ]));
});

test("website neutrally identifies people with permanent source access", async () => {
  const page = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");

  assert.match(page, /Vitaeum is a solo, closed-source project\./);
  assert.match(page, /indicates access only; it does not mean they have reviewed\s+or endorsed the code/);
  for (const name of ["Immortalbob", "Thwargle", "ThwargLauncher", "ThwargFilter", "Vanquish", "Scribble", "Paradox", "Decal", "ACME:Worldbuilder", "Aetherium", "GDLE"]) {
    assert.match(page, new RegExp(name));
  }
  for (const person of ["Immortalbob", "Thwargle", "Vanquish", "Scribble", "Paradox"]) {
    assert.match(page, new RegExp(`<strong>${person}</strong>`));
  }
});

test("website keeps community and legal information in the compact layout", async () => {
  const page = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");

  assert.match(page, /Join the Discord and follow along!/);
  assert.equal(page.match(/assets\/discord-mark\.png/g)?.length, 2);
  assert.equal(page.match(/data-release-panel/g)?.length, 1);
  assert.match(page, /id="downloads" class="hero-downloads"/);
  assert.doesNotMatch(page, /Try Vitaeum/);
  assert.match(page, /class="shell legal-note"/);
  assert.doesNotMatch(page, /id="community"/);
  assert.doesNotMatch(page, /Made by fans, independently\./);
});

test("website includes retail DAT download instructions and the local guide image", async () => {
  const page = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");

  assert.match(page, /Need the retail DATs\?/);
  assert.match(page, /Download the End of Retail Client Files/);
  assert.match(page, /Click the download arrow, not “Save to MEGA\.”/);
  assert.match(page, /drag the three DAT files inside to your chosen DAT folder/);
  assert.ok(page.indexOf("Join the Discord and follow along!") < page.indexOf("Need the retail DATs?"));
  await access(new URL("../docs/assets/retail-dat-download.png", import.meta.url));
});
