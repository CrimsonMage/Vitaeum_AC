# Vitaeum

Vitaeum is a parity-first Rust reimplementation effort for the Asheron's Call
client for Windows, Linux, and macOS. This public repository hosts project
information and release artifacts; users must provide any legally obtained
third-party data required by the client.

Join the community and follow development on
[Discord](https://discord.gg/VpnYCsGZr6).

## Project website

The GitHub Pages site is served from [`docs/`](docs/) and is designed to work
without a build step.

To preview it locally:

```sh
python3 -m http.server 8000 --directory docs
```

Then open <http://127.0.0.1:8000/>.

Run the dependency-free website tests with:

```sh
node --test tests/*.test.mjs
```

## Publishing releases

The website discovers the newest public GitHub release automatically,
including prereleases. Use this naming convention so assets are grouped into
the correct platform cards:

```text
vitaeum-<version>-windows-x86_64.<ext>
vitaeum-<version>-linux-x86_64.<ext>
vitaeum-<version>-macos-x86_64.<ext>
```

Files that do not match a platform and `x86_64` token are shown under **Other
downloads** rather than being assigned incorrectly.

## Adding gallery images

Place approved, web-optimized images below `docs/assets/gallery/`, then add an
entry to [`docs/gallery.json`](docs/gallery.json):

```json
{
  "src": "assets/gallery/example.webp",
  "thumbnail": "assets/gallery/example-thumbnail.webp",
  "alt": "A concise description of the screenshot",
  "caption": "Optional visible caption"
}
```

Only repository-local asset paths are accepted. An empty manifest intentionally
renders a **Gallery coming soon** state.

## Legal

This project is an independent compatibility/reimplementation effort and is
not affiliated with or endorsed by the owners of Asheron's Call. See
[`LICENSE.md`](LICENSE.md).
