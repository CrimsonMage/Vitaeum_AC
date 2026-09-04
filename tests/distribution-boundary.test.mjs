import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function filesBelow(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesBelow(path.join(directory, entry.name), relative)));
    } else {
      files.push(relative.replaceAll(path.sep, "/"));
    }
  }
  return files;
}

test("distribution repository contains no Rust workspace or source archive", async () => {
  const files = await filesBelow(process.cwd());
  const forbidden = files.filter((file) => {
    const lower = file.toLowerCase();
    return (
      lower.endsWith(".rs") ||
      lower.endsWith("/cargo.toml") ||
      lower === "cargo.toml" ||
      lower.endsWith("/cargo.lock") ||
      lower === "cargo.lock" ||
      /(?:^|\/)(?:source|src)[-_].*\.(?:zip|tar|tar\.gz|tgz|tar\.zst)$/.test(lower) ||
      /(?:^|\/)vitaeum(?:4)?[-_].*source.*\.(?:zip|tar|tar\.gz|tgz|tar\.zst)$/.test(lower)
    );
  });
  assert.deepEqual(forbidden, []);
});
