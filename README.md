# Elfim Desktop

Desktop client for Elfim using **Electron**, **Vue 3**, **electron-vite**, and **Tailwind CSS**. Layout and density are inspired by dashboard-style apps such as [solidtime-desktop](https://github.com/solidtime-io/solidtime-desktop) (Electron + Vue); this codebase is implemented independently.

## Prerequisites

- **Node.js** 20+ (includes npm)
- **Windows**: Visual Studio Build Tools are only needed if you add native Node addons later; this scaffold does not require Rust.

## Setup

```bash
cd ElfimDesktopApp
cp .env.example .env
# Edit .env — set VITE_REST_API_ENDPOINT to your Laravel REST base URL (same role as NEXT_PUBLIC_REST_API_ENDPOINT in the Next.js storefront).
npm install
```

## Scripts

| Command        | Description                                      |
| -------------- | ------------------------------------------------ |
| `npm run dev`  | Development mode (hot reload for renderer)       |
| `npm run build` | Compile main, preload, and renderer to `out/`   |
| `npm run build:win` | `build` + Windows NSIS installer in `release/` |
| `npm run build:mac` | `build` + macOS DMG + ZIP (run on a Mac only) |
| `npm run build:all` | On **Windows**: same as `build:win`. On **macOS**: Win + Mac installers |
| `npm run build:all:publish` | Same as `build:all`, publish to GitHub Releases |
| `npm run preview` | Preview production bundle                        |
| `npm run typecheck` | Vue + Node TS checks                          |

**Windows + macOS at the same time:** electron-builder cannot create a Mac DMG on Windows. Use GitHub Actions (see below).

## Auto-release on push

When you push to `main` (or `master`), GitHub Actions builds Windows + macOS and publishes a release on [alfasoft-apps/elfim-desktop-app](https://github.com/alfasoft-apps/elfim-desktop-app/releases).

1. Bump `"version"` in `package.json` (e.g. `1.0.4` → `1.0.5`) before each release.
2. Commit and push to `main`:
   ```bash
   git add package.json
   git commit -m "chore: release 1.0.5"
   git push origin main
   ```
3. Open **Actions** → **Release desktop app** and wait for both jobs to finish.
4. The new release appears under **Releases** with tag/version from `package.json`.

Manual run: **Actions** → **Release desktop app** → **Run workflow**.

If publish fails with permission errors, add a repo secret `GH_TOKEN` (fine-grained PAT with **Contents: Read and write** on this repo). Otherwise the workflow uses the built-in `GITHUB_TOKEN`.

`build:win` sets `CSC_IDENTITY_AUTO_DISCOVERY=false` so **unsigned** local builds do not pull optional signing tooling that can fail on Windows without symlink privileges (Developer Mode / elevated shell). Add real code signing later via your certificate and electron-builder docs when you publish.

## Environment

| Variable                    | Purpose                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `VITE_REST_API_ENDPOINT`    | Base URL for REST calls (mirrors `NEXT_PUBLIC_REST_API_ENDPOINT` in web). |

The renderer HTTP client lives at `src/renderer/src/api/http.ts` and follows the same axios patterns as `frontend-nextjs-elfim-az/src/framework/basic-rest/utils/http.ts`, using `localStorage` for the bearer token instead of cookies.

## CORS / API access

Electron loads the UI from `file://` (production) or a dev server URL. Your Laravel app must allow requests from the desktop client:

- Allow the dev origin if you use Vite in development.
- For production `file://` loads, configure CORS (or use a custom protocol and host rules) so API calls from the renderer are accepted. Adjust `SANCTUM` / `config/cors.php` as needed for your deployment.

## Relation to ElfimEcommerceWPF

Use the WPF project as a **functional and branding reference** (screens, flows, assets). There is no shared runtime with .NET; map each important WPF view to a Vue route when you add features.

## Security defaults

- Renderer: `contextIsolation: true`, `nodeIntegration: false`.
- Preload: exposes `@electron-toolkit/preload` helpers plus a small `window.elfim` bridge (`ping`, `platform`).
- A minimal Content Security Policy is set in `src/renderer/index.html`; tighten further when you add remote content.

## License

Private / your project license unless you specify otherwise.
