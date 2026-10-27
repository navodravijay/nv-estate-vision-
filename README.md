# NV. Estate Vision

A complete local portfolio demo by **NV SHARP SOLUTIONS**. Design and development: **Navod Ravindu Jayaweera**.

**Ceylon Crest Developments** and **Skyline Residences, Colombo** are independent fictional demo identities. There is no operational property, sales team, listing, price, reservation or affiliation with a real developer. All geometry, facilities, layouts, measurements and availability are illustrative.

## Local development

Use a current Node.js LTS supported by Vite (Node 22.12+ or 24 LTS recommended; development verification used Node 26.12). Install from the lockfile:

```sh
npm ci
npm run dev
```

Open the URL Vite prints, normally **http://127.0.0.1:5173**. If PowerShell blocks `npm.ps1`, use `npm.cmd` in these commands.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Production preview is normally **http://127.0.0.1:4173**. `build` runs typecheck before producing `dist/`. No lint package is configured; TypeScript uses strict checking and rejects unused locals and parameters. Logic tests use Node's built-in test runner without a test framework dependency.

## What works

- A photographic **Concept render** hero, with an original AI-assisted blue-hour architectural image, responsive cropping, a visible non-photography disclosure and a **Live 3D** switch. The JPEG is 362 kB; its PNG master and exact generation prompt are retained under `assets/`. This is an artistic interpretation of the project's own tower, not a real listing photograph or measured view. Switching to the concept image stops rendering the hidden WebGL scene. **Explore in 3D** opens the actual model, and **Watch the film** still opens the real-time tour.
- Original Three.js tower with 32 floors, stepped companion wing, reflective glass facades, balconies, lit windows, terraced arrival, roof-level pool, bronze pergola, planted terraces, layered tree canopies and abstract context. Drag to orbit; pinch or use +/− to zoom. Focus the canvas and use arrows to orbit and +/− to zoom. Three animated camera compositions and reset are available.
- Live materials now include deterministic concrete grain, paving, glass variation, room/curtain textures, water normals, alpha-cutout foliage, geometric palm fronds and distant textured fictional city context. These are generated locally in `src/surfaces.ts`. Reflection lighting includes an original local high-dynamic-range sun/sky environment; no HDR files or texture packs are downloaded.
- **Daylight / Blue hour** controls change real scene illumination, window lighting, architectural light strips, ground tone and the presentation backdrop. Reflections come from an original sky painted locally in memory; no HDR files or external assets are downloaded. Reduced motion applies to lighting changes too.
- **Watch the film** opens a fullscreen real-time architectural presentation with three chapters: Arrival, Water Garden and Sky Terrace. Curved camera paths, lens/target transitions and a blue-hour finale show the actual tower, lounge seating, planting and open crown pergola. Play/pause, direct chapter selection, previous/next, arrow shortcuts, Escape and close/focus restoration are available. Manual camera input pauses playback. There is no downloaded video, audio track or external media. With reduced motion, chapters remain available as static views and autoplay is disabled.
- The live tower automatically moves beside the residence details while that browser is in view. **Show diagram** switches to the keyboard-accessible floor diagram; **Live 3D** restores the tower. Both remain synchronized with the range control, unit filters and details. Zoom/reset controls and **Hero view** are available beside the model. The same canvas and WebGL context move between hero, film and residence panel, rather than creating additional renderers.
- Hover tower geometry with a mouse to preview its floor number and highlight. Click tower glazing or a slab to select its level. The selected slab, HTML floor diagram, range control and residence detail panel stay synchronized. The diagram is restored automatically if WebGL fails.
- Ninety-six deterministic fictional residences. Bedroom and availability filters, empty results, selected-unit state and illustrated detail layouts. Reserved residences can be inspected but cannot populate the preference form.
- Three keyboard-accessible lifestyle tabs with original AI-assisted concept imagery: a sunset pool terrace, a sunlit wellness studio and a blue-hour residents' lounge. A wide cinematic frame, gentle image drift, crossfades, matching scene captions and a local motion control replace the earlier CSS illustration. Mobile uses a stacked image-and-copy layout. Category selection remains manual; the tabs do not auto-advance.
- Gallery images rendered from the actual tower: daylight arrival, blue-hour facade and daylight aerial. Captures are capped at 1200 × 1000 regardless of device pixel ratio and omit interactive floor highlighting. A native modal offers arrow navigation, Escape, close button, backdrop dismissal, focus restoration and background scroll locking. Three distinct original SVG studies remain available when WebGL is unavailable at startup.
- An opt-in Leaflet map of the broad Colombo area, with zoom, pan, keyboard access, visible attribution and failure messaging. No project coordinate, marker, travel time or proximity claim. External tiles load only after a visitor chooses to load the map.
- A validated local-only preference form stores only bedroom count, floor and a priority enum in `localStorage`. No contact fields, free text, accounts, backend, messages or reservations. Saved values restore on refresh and can be cleared. Blocked or corrupt storage is handled.
- Responsive navigation, semantic landmarks, skip link, accessible control names, reduced motion, share metadata and CSP.
- A short cinematic camera approach, staggered section reveals, floor-selection focus pulses, residence/amenity/gallery transitions, button feedback and a reading-progress line. Amenity image movement runs only while the section is visible, the tab is foregrounded and presentation motion is enabled. The local **Pause motion** control synchronizes with the page's global motion preference and respects system reduced motion.
- Optional **Auto orbit** rotates the actual camera slowly. Manual camera input, another camera preset, selecting a floor or the animation pause control stops it. Offscreen/hidden scenes stop drawing and resume when visible. **Animations on · pause** disables decorative motion across the page; system reduced motion takes priority. There is no persistent motion preference or extra data storage.

## Configuration

Edit `src/config.ts`. Inventory logic is in `src/domain.ts`; unit sizes and availability are invented. Film chapters, camera endpoints, lenses and copy are defined in `src/cinema.ts`; playback and keyboard controls are in `src/tour.ts`. Each film chapter lasts 7.5 seconds; a complete uninterrupted presentation takes approximately 22.5 seconds. The map center is a city-area overview, **not a project location**. Changes to the 32-floor model must be reflected in domain validation, markup, geometry and tests.

`contact.verified` defaults to `false`. The optional contact action appears only when it is explicitly set to `true` **and** a syntactically valid company email or international WhatsApp number is configured. The owner must independently verify ownership of that contact; syntax validation is not verification. This action opens a user's mail/WhatsApp application and does not submit the form. Never configure real customer details or secrets here.

## Assets, licensing and map policy

The editorial gallery defaults to **Cinematic renders**: the arrival, material detail and sky terrace. **3D studies** retains the actual browser-generated model captures and original SVG fallbacks. Collection tabs support arrow/Home/End keys. The fullscreen viewer offers descriptions, three thumbnails, previous/next controls, arrow keys, native Escape, focus restoration and horizontal touch swipe. Image decode errors leave navigation and a useful message available. The cinematic artwork is visibly disclosed as AI-assisted fiction; see `assets/README.md` for the added detail asset and its exact prompt.

All tower geometry, SVGs, floorplan studies and procedural material textures are original work created for this project. The photographic hero and amenity visuals are AI-assisted images generated using the built-in image_gen tool and this project's own artwork as reference. See `assets/README.md` for provenance, production filenames, master images and exact prompts. The amenity JPGs are 337–400 kB each and use native lazy loading; PNG masters remain outside the public build. No competitor imagery, purchased assets, remote fonts or stock photos are used. System Arial and Georgia are used without font downloads. Gallery renders are generated locally from the live scene and stay in memory. All concept imagery remains illustrative and must not be used as evidence of a real property, operational facility or factual view.

Map data: **© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)**, ODbL; standard map tiles supplied by OpenStreetMap. Leaflet adds its own library attribution. Usage follows the [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/): HTTPS standard endpoint, visible attribution, normal browser referrer and HTTP caching, no prefetch, bulk download, proxy or offline feature. Loading third-party tiles shares the user's IP and browser information with the provider. The UI explains this before loading. OSM community tiles have no SLA; choose an appropriately licensed commercial provider before substantial traffic, update attribution and CSP, and review the policy again. Tile URL and attribution are configurable; new hosts must also be allowlisted in CSP.

Dependency licenses remain with their authors; inspect the installed package licenses before commercial redistribution. `npm install` selects registry stable releases; `package-lock.json` pins the tested resolution.

## Performance and security

The scene renders on demand while idle. Brief transitions and explicitly enabled auto-orbit request animation frames only while visible. Concept-image mode hides and pauses the hero's live scene. Offscreen/hidden scenes stop drawing; finite scene transitions pause, rather than jumping ahead in the background. Shared geometry/materials and instanced windows, mullions, shrubs, foliage cards, trunks and palm fronds control geometry costs. Device pixel ratio is capped at 1.75. Static shadow maps use 1536 px for desktop initialization or 1024 px for mobile initialization and are reused during camera movement. Reflection targets, generated texture maps, GPU resources, motion observers, listeners and the map are released on page teardown. Both the page animation control and system reduced motion disable interpolation, auto-orbit and decorative effects. A WebGL/context failure leaves the concept hero and HTML residence experience usable and disables unavailable 3D controls.

No API keys, secrets, analytics or data submission. Dynamic DOM uses safe element creation and `textContent`. Preferences are validated before save and after restore. Public CSP blocks third-party scripts, embedding, plugins and form submission. Inline styles are permitted for GSAP/Leaflet; inline scripts are prohibited. The development CSP permits local Vite WebSockets; production headers omit them. No geolocation, camera or microphone permissions. Cloudflare `_headers` adds `frame-ancestors`, `nosniff`, referrer and permissions policies. Review effective hosting headers on any future deployment.

## Cloudflare Pages (documentation only; not deployed)

| Setting | Value |
| --- | --- |
| Framework preset | Vite / None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Repository root |
| Node version | `26.12.0` (pinned in `.node-version`, matches local verification) |
| Environment secrets | None |

`public/_headers` is copied into `dist/_headers`. There is no SPA routing or server function requirement. The live site is `https://nv-estate-vision.pages.dev/`; canonical, Open Graph URL and the absolute social image URL use this verified origin. Update these together if a custom domain is configured later. `public/social.png` is the 1200 × 630 raster export of the original SVG social card. To regenerate it with Chrome and a running local preview, use `node scripts/browser-check.mjs --write-social-card`, then rebuild.

### Publish through GitHub

Create an empty GitHub repository, push this project's `main` branch, then in Cloudflare **Workers & Pages** create a **Pages** project using Git integration and select that repository. Choose production branch `main`, framework preset **None**, build command `npm run build`, output directory `dist`, and leave the root directory at the repository root. Pages reads `.node-version`; if setting `NODE_VERSION` manually, use the same `26.12.0`. No deploy command, API token, Worker or database is required for this static Pages setup. Repository visibility can remain private while the built website is public.

Use the Git integration for future automatic deployments on pushes to `main`. Keep `node_modules/`, `dist/`, `.browser-check/` and environment files out of Git; `.gitignore` already excludes them. Original generated masters and prompts in `assets/` document provenance but are not public site assets. After Cloudflare assigns the real Pages URL, update the canonical/Open Graph metadata for that actual origin and check the live response headers and primary interactions. Do not invent a domain in advance.

Cloudflare references: [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/), [build settings](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Node version selection](https://developers.cloudflare.com/pages/configuration/build-image/).

## Verification and limitations

See `VERIFICATION.md` for the commands actually run and results. Automated logic checks cover floor boundaries, unique deterministic inventory, combined filters/empty results, preference validation, contact gating/injection rejection, chapter navigation and bounded camera endpoints. With a local preview already running, `node scripts/browser-check.mjs` runs a dependency-free local Chrome DevTools smoke check and writes local screenshots, including film close-ups and the live residence panel. `CHROME_PATH` can select another installed Chromium browser; `PREVIEW_URL` can select another local preview port. Map requests are intercepted and fulfilled with synthetic blank tiles, so no third-party map tiles are downloaded by the checks.

This is a presentation, not a construction model, booking service or real inventory platform. WebGL and map tiles depend on the device/network. No real site coordinates or factual proximity information are supplied. Gallery renders are device-generated and may vary by GPU. The SVG fallback consists of three stylized architectural studies. Broader device/screen-reader testing and a live-provider map check remain recommended before public commercial use.
