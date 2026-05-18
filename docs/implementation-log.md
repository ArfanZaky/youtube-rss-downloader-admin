# Implementation Log

## 2026-05-18

- Scope: Fixed Channel URLs titles.
- Files or subsystems touched: `vite.config.js`, `CHANGELOG.md`, and this implementation log.
- Behavior/runtime effect: `/api/channel-urls` now uses `yt-dlp --flat-playlist` as the primary source for Videos, Shorts, and Live/Streams rows, so Watchlist Channel shows real YouTube titles instead of raw video IDs; the old HTML/RSS parsers remain as fallback.
- Validation status: `timeout 120s npm run build` completed successfully; Vite dev server restarted on port `4177`; local API checks for Sleepybloke Videos, Shorts, and Live returned real titles instead of video IDs.
- Open follow-up items: Add caching for channel URL lookups to avoid repeated YouTube/yt-dlp calls when switching filters quickly.

## 2026-05-18

- Scope: Added application icons to the admin interface.
- Files or subsystems touched: `src/App.jsx`, `src/styles.css`, `index.html`, `public/favicon.svg`, `package.json`, `package-lock.json`, `CHANGELOG.md`, and this implementation log.
- Behavior/runtime effect: Sidebar navigation, primary actions, table actions, login/logout, stats, and the browser tab now show consistent pixel-friendly icons using `lucide-react` plus a small SVG favicon.
- Validation status: `timeout 120s npm run build` completed successfully; Vite dev server restarted on port `4177`; public page and `/favicon.svg` checks returned `200 OK`.
- Open follow-up items: Add icon-only compact actions for dense mobile tables if the table layout is tightened further.

## 2026-05-18

- Scope: Allowed the configured public downloader domain in Vite.
- Files or subsystems touched: `vite.config.js`, `CHANGELOG.md`, and this implementation log.
- Behavior/runtime effect: The Vite dev server now accepts requests whose Host header is `youtubedl.cloudverra.com`, resolving the blocked-host error for the public domain.
- Validation status: `timeout 120s npm run build` completed successfully; Vite dev server restarted on port `4177`; `curl` with `Host: youtubedl.cloudverra.com` returned `200 OK`; direct `http://youtubedl.cloudverra.com:4177/` check returned `200 OK`.
- Open follow-up items: Move this from Vite dev serving to a production reverse proxy/runtime when packaging the app for long-term deployment.

## 2026-05-17

- Scope: Fixed downloader worker command selection and failure reporting.
- Files or subsystems touched: `vite.config.js`, `.gitignore`, `CHANGELOG.md`, and this implementation log.
- Behavior/runtime effect: The server now prefers the updated local `bin/yt-dlp` binary before falling back to PATH, so downloads no longer use the outdated system `yt-dlp`; failed downloads keep the latest stderr text in SQLite for the Downloads error column; the local binary is ignored by Git.
- Validation status: `timeout 120s npm run build` completed successfully; Vite dev server restarted on port `4177`; public page check returned `200 OK`; the previously failed item retried to `Done` and produced `/srv/media/youtube/94zbglypw5m.mp4.webm`.
- Open follow-up items: Add a managed updater/version check for `yt-dlp` so YouTube extractor changes can be handled without manual binary replacement.

## 2026-05-17

- Scope: Connected Downloads queue to a real `yt-dlp` worker.
- Files or subsystems touched: `vite.config.js`, `src/App.jsx`, and this implementation log.
- Behavior/runtime effect: The server now watches SQLite downloads for `Queued` items, runs `yt-dlp` with the selected quality/audio mode, writes output to the stored path from Settings, and updates status/progress/error in SQLite; startup reconciliation marks old `Done` rows as `Failed` if their output file is missing; the frontend polls SQLite instead of simulating progress and shows error text in the Downloads table.
- Validation status: `timeout 120s npm run build` completed successfully; Vite dev server restarted on port `4177`; public page check returned `200 OK`; existing simulated `Done` row with missing output was reconciled to `Failed`.
- Open follow-up items: Add queue controls, cancellation, concurrency settings, and stronger file naming/collision handling.

## 2026-05-17

- Scope: Added SQLite-backed persistence for admin datasets.
- Files or subsystems touched: `vite.config.js`, `src/App.jsx`, `.gitignore`, `README.md`, and this implementation log.
- Behavior/runtime effect: The Vite server now creates `data/app.db` with an `app_store` table and exposes `/api/store`; the frontend syncs settings, downloads, RSS feeds, and channels to SQLite while keeping localStorage as a browser fallback/migration source.
- Validation status: `timeout 120s npm run build` completed successfully; Vite dev server restarted on port `4177`; `/api/store?key=channels` returned SQLite-backed data; local channel URL API still returned real Sleepybloke rows; public page check returned `200 OK`.
- Open follow-up items: Replace the generic key-value store with normalized SQLite tables and production backend routes when downloader workers are implemented.

## 2026-05-17

- Scope: Hardened local storage bootstrap to avoid data reset during app changes.
- Files or subsystems touched: `src/App.jsx` and this implementation log.
- Behavior/runtime effect: RSS, channel, and download seed data is now written only when no saved dataset exists; legacy mixed RSS/channel rows are migrated once into separate storage keys and persisted so future code changes do not re-run default seed data over saved rows.
- Validation status: `timeout 120s npm run build` completed successfully; public page check returned `200 OK`; local channel URL API still returned real Sleepybloke rows.
- Open follow-up items: Replace localStorage with a real backend database for cross-browser and server-side persistence.

## 2026-05-17

- Scope: Made Downloads runtime fields automatic.
- Files or subsystems touched: `src/App.jsx`, `README.md`, and this implementation log.
- Behavior/runtime effect: Download forms no longer expose Status or Progress fields; new and edited downloads derive a destination path from Settings `downloadPath`, and a local worker advances queued downloads through Downloading to Done automatically while persisting progress.
- Validation status: `timeout 120s npm run build` completed successfully; public page check returned `200 OK`; local channel URL API still returned real Sleepybloke rows.
- Open follow-up items: Replace the local progress simulation with a real downloader worker that writes files to the configured path.

## 2026-05-17

- Scope: Split RSS Feed data from Channel List data.
- Files or subsystems touched: `src/App.jsx`, `README.md`, and this implementation log.
- Behavior/runtime effect: RSS Feeds now stores and edits RSS feed URLs under a dedicated `rss-feeds` localStorage key; Channel List and Watchlist Channel now store and edit channel URLs under a separate `channels` key. Legacy mixed rows are split by URL type during first load.
- Validation status: `timeout 120s npm run build` completed successfully; local channel URL API still returned real Sleepybloke rows; public page check returned `200 OK`.
- Open follow-up items: Persist both datasets in separate backend tables/models.

## 2026-05-17

- Scope: Corrected Watchlist Channel type-specific URL loading.
- Files or subsystems touched: `vite.config.js`, `src/App.jsx`, and this implementation log.
- Behavior/runtime effect: Channel URL lookups now request the actual YouTube tab paths for each type (`/videos`, `/shorts`, `/streams`) instead of using RSS for Videos first; switching filters clears stale rows and fetches by selected type ID.
- Validation status: `timeout 120s npm run build` completed successfully; Vite dev server restarted on port `4177`; local API checks for Sleepybloke returned distinct URL sets for Videos, Shorts, and Live; public page check returned `200 OK`.
- Open follow-up items: Add richer title extraction from tab pages if YouTube tab HTML does not expose titles cleanly.

## 2026-05-17

- Scope: Replaced placeholder Watchlist Channel URL rows with live YouTube lookups.
- Files or subsystems touched: `vite.config.js`, `src/App.jsx`, and this implementation log.
- Behavior/runtime effect: The Vite dev server now exposes `/api/channel-urls`, resolves a YouTube channel URL to real RSS/video data, and Watchlist Channel loads real URL rows instead of generated dummy rows before queuing selected rows into Downloads.
- Validation status: `timeout 120s npm run build` completed successfully; restarted Vite dev server on port `4177`; local `/api/channel-urls` lookup for `https://www.youtube.com/@Sleepybloke&type=videos` returned real YouTube video rows; public page check returned `200 OK`.
- Open follow-up items: Move the YouTube lookup middleware into a production backend service and add stronger parsing for Shorts/Live metadata.

## 2026-05-17

- Scope: Changed Channel URLs from a single channel link into a video URL list.
- Files or subsystems touched: `src/App.jsx`, `src/styles.css`, and this implementation log.
- Behavior/runtime effect: Selecting a channel and URL type now displays multiple video URL rows for Videos and Shorts, one Live row for Live, and each row has its own Add to Download action that queues that specific URL.
- Validation status: `timeout 120s npm run build` completed successfully; local and public HTTP checks on port `4177` returned `200 OK`.
- Open follow-up items: Replace generated placeholder video rows with real YouTube/RSS parser results from the backend.

## 2026-05-17

- Scope: Added Channel URL type filtering for Watchlist Channel.
- Files or subsystems touched: `src/App.jsx`, `src/styles.css`, and this implementation log.
- Behavior/runtime effect: Channel URLs now has a second radio-card filter for Videos, Shorts, and Live; selecting a type changes the generated channel URL, and Add to Download creates a queued download item using the selected channel/type URL.
- Validation status: `timeout 120s npm run build` completed successfully; local and public HTTP checks on port `4177` returned `200 OK`.
- Open follow-up items: Resolve actual video entries from each channel tab when backend parsing/downloading is implemented.

## 2026-05-17

- Scope: Changed channel rows to store YouTube channel URLs instead of RSS feed URLs.
- Files or subsystems touched: `src/App.jsx`, `README.md`, and this implementation log.
- Behavior/runtime effect: List Channel and Watchlist Channel now label and collect Channel URL values; default rows use YouTube channel-style URLs, and previously stored YouTube RSS feed URLs with `channel_id` are normalized to `/channel/{id}` at load time.
- Validation status: `timeout 120s npm run build` completed successfully; local and public HTTP checks on port `4177` returned `200 OK`.
- Open follow-up items: Add backend channel URL resolution so handles/channel URLs can be converted into RSS feed URLs automatically during scheduler polling.

## 2026-05-17

- Scope: Changed Watchlist Channel into a channel URL picker feeding Downloads.
- Files or subsystems touched: `src/App.jsx`, `src/styles.css`, and this implementation log.
- Behavior/runtime effect: Watchlist Channel now shows a radio-card filter sourced from watched channels in List Channel; selecting a channel displays its URL table, and Add to Download creates a queued Downloads item from that channel URL.
- Validation status: `timeout 120s npm run build` completed successfully; local and public HTTP checks on port `4177` returned `200 OK`.
- Open follow-up items: Replace feed URL download items with parsed latest video URLs once RSS polling/backend parsing is implemented.

## 2026-05-17

- Scope: Added grouped Channel navigation.
- Files or subsystems touched: `src/App.jsx`, `README.md`, and this implementation log.
- Behavior/runtime effect: The sidebar now includes a Channel parent menu with Watchlist Channel and List Channel children; Watchlist Channel shows only watched channels, while List Channel shows all channel feed rows with the same local edit/delete flow.
- Validation status: `timeout 120s npm run build` completed successfully; local and public HTTP checks on port `4177` returned `200 OK`.
- Open follow-up items: Connect channel list and watchlist state to backend channel/feed models.

## 2026-05-17

- Scope: Added frontend CRUD behavior for Downloads and RSS Feeds.
- Files or subsystems touched: `src/App.jsx`, `src/styles.css`, `README.md`, and this implementation log.
- Behavior/runtime effect: Downloads and RSS Feeds now support local create, edit, and delete actions from their menu pages and overview tables; both datasets persist in `localStorage` across refreshes.
- Validation status: `timeout 120s npm run build` completed successfully; local and public HTTP checks on port `4177` returned `200 OK`.
- Open follow-up items: Replace local CRUD persistence with backend API routes, database persistence, real YouTube queue execution, and RSS polling.

## 2026-05-17

- Scope: Implemented the RSS Add Feed action.
- Files or subsystems touched: `src/App.jsx`, `src/styles.css`, `README.md`, and this implementation log.
- Behavior/runtime effect: The Add Feed button now opens a controlled RSS feed form, validates required name and HTTP(S) URL fields, inserts the new feed at the top of the table, updates active feed counts, and persists feed rows in `localStorage` across refreshes.
- Validation status: `timeout 120s npm run build` completed successfully; local and public HTTP checks on port `4177` returned `200 OK`.
- Open follow-up items: Replace localStorage feed persistence with backend RSS feed CRUD API and scheduler integration.

## 2026-05-17

- Scope: Improved admin navigation, login persistence, and editable settings.
- Files or subsystems touched: `src/App.jsx`, `src/styles.css`, `README.md`, and this implementation log.
- Behavior/runtime effect: Login session now persists in `localStorage` across browser refreshes until Logout; sidebar navigation now groups Users, Roles, Permissions, and Settings under the Administrator parent; Settings now uses editable controlled fields with Save and Reset actions persisted to `localStorage`.
- Validation status: `timeout 120s npm run build` completed successfully; dev server remained listening on `0.0.0.0:4177`; local and public HTTP checks returned `200 OK`.
- Open follow-up items: Replace localStorage persistence with backend-backed auth and settings APIs when the server implementation starts.

## 2026-05-17

- Scope: Created the first admin menu prototype for a YouTube downloader with RSS auto-download workflow.
- Files or subsystems touched: React/Vite project scaffold, admin shell UI, login screen, RBAC management screens, RSS feed list, download queue, settings panels, README.
- Behavior/runtime effect: The app starts as a browser admin console, requires demo login, and exposes menu sections for overview, downloader, RSS feeds, users, roles, permissions, and settings using local in-memory state.
- Validation status: `timeout 120s npm run build` completed successfully; Vite dev server responded `200 OK` on `http://127.0.0.1:4177/` while listening on `0.0.0.0`.
- Open follow-up items: Add real backend API, persistent database, YouTube download worker, RSS polling scheduler, and production authentication.
