# Local verification — 27 October 2026

## Cloudflare Pages launch — latest verification

The user published the Git-integrated site at **https://nv-estate-vision.pages.dev/** from `main` in `navodravijay/nv-estate-vision-`. Initial source commit: `718f660`. Read-only HTTPS checks confirmed HTTP 200 for the homepage, JavaScript, CSS, social image and new gallery image, with correct MIME types. The production response includes CSP, `nosniff`, strict-origin referrer policy and disabled camera/microphone/geolocation permissions from `public/_headers`.

Ran an ignored, host-allowlisted copy of the existing Chrome harness at `.browser-check/live-check.mjs` against that exact public origin, using an isolated local browser profile. **All 94 browser checks passed**, with no runtime/resource/CSP errors. Checks include live WebGL, camera/film interactions, floor/unit filters, gallery collections/thumbnails/swipe, amenity scenes, device-only preference save/restore/clear, desktop/mobile layouts, reduced motion and simulated WebGL failure. Screenshots and results are in `.browser-check/production/`; desktop hero/gallery and the mobile gallery modal were visually reviewed. Map requests were intercepted with synthetic tiles. No real enquiry was submitted and no provider tiles were downloaded. Physical-device, broader screen-reader and actual-provider map checks remain pending.

The first headless run timed out taking a screenshot; a retry with a longer screenshot timeout completed the entire suite. This was a browser-capture timeout, not a confirmed application error.

After the user supplied the real deployment origin, added the canonical link, `og:url` and absolute `og:image` URL in `index.html`, and updated README deployment notes. `npm.cmd run typecheck`, `npm.cmd test` (**7 passed**) and `npm.cmd run build` all passed after this metadata change. Runtime JavaScript/CSS hashes are unchanged. The existing Three.js bundle-size advisory remains. The GitHub-to-Cloudflare integration publishes pushes to `main`; future domain changes should update the three metadata URLs together.

## Cinematic gallery — previous verification

The gallery now has two keyboard-accessible collections: cinematic concept renders (default) and original live-model 3D studies. Added `src/gallery.ts`, `src/gallery.css`, a new AI-assisted facade detail master/JPEG/exact prompt, and updated the page markup and main scene callback. The cinematic collection reuses the existing hero and sunset terrace artwork. Collection disclosure, provenance and fictional claims are documented in `assets/README.md` and visible in the interface.

The fullscreen native dialog includes descriptions, collection labels, selected-state thumbnails, wrapping previous/next controls, arrow keys, Escape and close controls, restored opener focus, horizontal touch swipe, and a descriptive image failure state. An image request token prevents stale decode completions from replacing the active selection. Motion uses the existing optional transition system. No new packages, external hosts, permissions or data collection were introduced.

| Command | Actual result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd test` | 7 passed, 0 failed |
| `npm.cmd run build` | Passed; `dist/` generated |
| `node scripts/browser-check.mjs` | 94 browser checks passed; no runtime/resource/CSP errors |

The Chrome run covered collection keyboard navigation, actual generated model captures, matching image/descriptions, thumbnail selection, wrapping navigation, simulated decode failure and recovery, rapid changes, Escape/focus restoration, mobile layout, actual CDP touch swipes and mobile close focus. Existing hero, film, inventory, local-only preferences, map, GPU idling, reduced-motion, responsive and WebGL fallback checks also passed. OSM tile requests were intercepted and fulfilled with synthetic tiles; no live provider tiles were downloaded.

Desktop 1440 px and mobile 390 px gallery/modal screenshots were visually reviewed: `.browser-check/gallery-desktop.png`, `gallery-modal-desktop.png`, `gallery-mobile.png`, `gallery-modal-mobile.png`. Earlier runs exposed test focus/scroll ordering and asynchronous media-change timing assumptions; the harness was corrected before the final full passing run. A PowerShell text-encoding issue discovered by the build was corrected; the final build has no HTML parse warning.

Current application bundle: approximately **102 kB minified / 39 kB gzip**; CSS **54 kB / 13 kB gzip**. The lazy Three.js chunk remains **590 kB / 149 kB gzip**, with Vite's size advisory retained. The added production JPEG is **386,930 bytes**. Generated artwork is an interpretation and may differ from the procedural model. Physical-device and broader assistive-technology testing and a live-provider map check remain pending. Nothing was committed, pushed or deployed.

Environment: Windows / PowerShell, Node **26.12.0**, npm **11.20.0**, installed local Google Chrome (headless). PowerShell's execution policy blocks `npm.ps1`; commands used `npm.cmd` without changing system policies.

## Dependency installation

Installed npm registry stable releases and generated `package-lock.json`: Three.js **0.186.1**, GSAP **3.15.0**, Leaflet **1.9.4**, Vite **8.3.5**, TypeScript **7.0.2**, plus matching type packages. Installation needed network approval after the sandbox blocked registry access. npm reported **0 known vulnerabilities** at installation time; this is not an independent security audit.

## Initial V1 checks

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed, strict TypeScript checking |
| `npm.cmd test` | Passed, 5 tests, 0 failures |
| `npm.cmd run build` | Passed, production output in `dist/` |
| `npm.cmd run preview -- --port 4173 --strictPort` | Served production site at `http://127.0.0.1:4173/` |
| `node scripts/browser-check.mjs --write-social-card` | Passed, 29 browser checks, exported original social PNG |

No linter is configured. TypeScript checks strict types and unused code. The initial typecheck identified the need to explicitly include Node types in the TypeScript 7 configuration; it was fixed before the passing runs. Early browser attempts identified test timing assumptions around delayed gallery generation and native dialog close events; waits were corrected and subsequent checks passed.

The build reports a **chunk size advisory** for the lazy-loaded Three.js scene: approximately 570 kB minified / 143 kB gzip. The initial application is approximately 87 kB minified / 34 kB gzip; Leaflet loads only when requested. This advisory is not suppressed. No build errors remain.

## Browser evidence

Production preview was tested at **1440 × 1000** and **390 × 844**. All 29 assertions passed:

- Actual WebGL canvas initialized; original scene renders generated for the gallery.
- No initial desktop horizontal overflow.
- Raycast click on actual tower geometry updated the HTML floor state.
- Range control synchronized selected level, diagram and inventory.
- Combined bedroom/status filters produced a valid empty state.
- Choosing a residence populated the form.
- Save stored only allowlisted preference fields; refresh restored them; clear removed them.
- Lifestyle content updated and arrow navigation moved tab focus and selection.
- Location theme selection updated its information panel.
- Map waited for visitor consent, then initialized with visible attribution, zoom controls and no property marker.
- Fullscreen gallery opened; arrow navigation worked; Escape closed it and restored opener focus.
- Preset and reset controls updated state; keyboard orbit and zoom changed actual rendered pixels.
- Unverified contact actions remained hidden.
- No mobile horizontal overflow; mobile navigation opened and closed on selection.
- Reduced motion disabled smooth scrolling.
- Simulated WebGL context loss displayed the fallback while HTML floor selection remained usable.
- No browser runtime, resource or CSP errors were recorded.

Map requests in the automated run were intercepted by Chrome DevTools and fulfilled with original synthetic blank tile images. **No actual OSM tiles were downloaded by automation.** A live-provider map session, actual geographic tile appearance and provider uptime remain **manually unverified**.

Browser results and screenshots are local ignored artifacts:

- `.browser-check/results.json`
- `.browser-check/desktop.png`
- `.browser-check/desktop-full.png`
- `.browser-check/mobile.png`
- `.browser-check/mobile-residences.png`

Desktop full-page, mobile hero and mobile residence screenshots were visually reviewed. The review led to softened scene boundaries, a more detailed side facade, and mobile tower spacing that keeps architecture clear of the primary CTA. The original SVG social card was exported to `public/social.png` for crawler compatibility and included in the final production build.

## Remaining limits

No deployment, commit, push or production access occurred. Live hosting headers and real social crawler previews are unverified until an approved deployment has a final domain. A broad physical-device, screen-reader and multi-browser audit was not performed; touch pinch/orbit is implemented but not tested on a physical phone. WebGL failures were simulated; hardware-specific failures may differ. All property and inventory information remains fictional. Enquiries never leave the device, and real company contacts are disabled by default.

## Visual and 3D refinement

The follow-up polish pass added an original locally generated reflection environment, Daylight / Blue hour lighting controls, architectural light strips, a visible roof-level water garden, terrace planting, a bronze pergola, stepped arrival and paving. Tree canopies and trunks now use instancing. Mouse hover previews a floor number and highlights its slab before selection. Mobile lighting controls sit beside the tower, clear of the main CTA. Distinct facade and aerial SVG studies complete the startup fallback gallery.

Checks run after implementation:

| Command | Actual result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd test` | 5 tests passed, 0 failed |
| `npm.cmd run build` | Passed; production output updated |
| `node scripts/browser-check.mjs` | 41 browser checks passed, 0 recorded runtime/resource/CSP errors |

The latest browser run covered all original flows and additionally verified hover identification, accessible lighting selection, a changed presentation after lighting changes, preserved residence selection, mobile lighting controls, reduced-motion operation, overflow at 320 / 768 / 1024 px, disabled lighting controls after context loss, initial WebGL creation failure, and gallery operation with three distinct fallback images. Existing desktop 1440 px and mobile 390 px checks also passed. Third-party tile requests remained intercepted with synthetic local tiles.

Updated screenshots were visually reviewed:

- `.browser-check/desktop.png` and `.browser-check/desktop-full.png`
- `.browser-check/desktop-blue-hour.png`
- `.browser-check/mobile.png` and `.browser-check/mobile-blue-hour.png`
- `.browser-check/mobile-residences.png`

The lazy scene chunk is now approximately **575 kB minified / 145 kB gzip**, with the existing size advisory retained. The initial application is approximately **88 kB minified / 34 kB gzip**. No dependencies or external asset hosts were added. Reflection resources are disposed on teardown, and gallery exports are bounded to 1200 × 1000 even on higher-DPI devices. Lighting modes are artistic studies and do not represent measured solar conditions or real property views.

## Animation upgrade

Added a short camera approach after gallery generation, user-controlled auto-orbit, selected-floor focus pulses, staggered section reveals, content transitions, button feedback, reading progress and subtle pool light movement. A global animation pause control disables decorative motion and smooth scrolling; the system reduced-motion setting takes priority. Motion preferences remain in memory only. Auto-orbit begins only after an explicit click and stops on manual camera input, preset/floor selection or global pause. Static shadow maps are reused for camera animation.

Final checks actually run on 27 October 2026:

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd test` | 5 passed, 0 failed |
| `npm.cmd run build` | Passed |
| `node scripts/browser-check.mjs` | 53 browser checks passed; no recorded runtime, resource or CSP errors |

In addition to all earlier functional checks, the browser run instrumented WebGL draw calls **in the test harness only** and confirmed:

- Explicit auto-orbit starts drawing changing frames.
- Drawing stops when the tower is outside the viewport and resumes when it returns.
- A simulated hidden document stops GPU drawing.
- Manual camera control stops auto-orbit.
- Global pause stops orbit, disables decorative motion and returns the scene to rendering on demand.
- Motion can be enabled again without starting auto-orbit automatically.
- System reduced motion disables auto-orbit and the animation toggle while keeping lighting, reading progress and the rest of the interface available.
- WebGL loss disables auto-orbit as well as the other unavailable scene controls.

Desktop/mobile screenshots were refreshed and the mobile control placement was visually reviewed. Automated viewport coverage remains 320, 390, 768, 1024 and 1440 px. Map requests remain synthetic and intercepted. Physical-device touch testing, a full screen-reader/multi-browser audit and live map-provider verification remain pending.

Current bundle sizes: approximately **90 kB / 35 kB gzip** for the initial app and **581 kB / 147 kB gzip** for the lazy-loaded scene. The existing scene chunk size advisory remains visible. No packages, remote media, external hosts, personal-data fields or submissions were added. There was no commit, push or deployment.

## Cinematic presentation and live residence view

Added a fullscreen three-chapter architectural film, curved camera paths with lens/target interpolation, direct chapter selection, play/pause, previous/next, automatic progression and keyboard/close controls. Chapters show arrival, the roof-level water garden and the crown/sky terrace at blue hour. Lounge seating and an open crown pergola enrich close views. Manual camera input pauses the film. Reduced motion keeps manual static chapters available without autoplay. This is a real-time rendering of the original model, not an external video.

The existing canvas now automatically docks beside the residence details when that panel is visible. The live/diagram toggle, local zoom/reset controls, HTML range selector and unit details remain synchronized. The canvas returns to the hero or moves into the film as appropriate. Only one renderer and one WebGL context are created. Startup/context failures restore the diagram and disable unavailable film/live controls.

Final commands actually run on 27 October 2026:

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd test` | 7 tests passed, 0 failed |
| `npm.cmd run build` | Passed |
| `node scripts/browser-check.mjs` | 66 browser checks passed; 0 recorded runtime/resource/CSP errors |

New browser assertions covered film opening on the existing canvas, automatic chapter advancement, pause, water-garden content/state, blue-hour sky chapter, Escape returning the canvas/focus to the hero, automatic docking beside residence details, switching between diagram and live view, a single canvas after docking, mobile film control bounds, manual chapters under reduced motion and disabling film/live modes on WebGL failure. All earlier interaction and GPU pause checks remained green. Added pure tests cover chapter wrapping/invalid indices and camera endpoints/lens bounds.

Visual review caught a canvas stacking/masking issue in the native fullscreen dialog and a programmatic focus-restoration issue. Both were fixed before the final passing run. Temporary camera diagnostics were removed. Updated desktop and mobile screenshots were visually reviewed:

- `.browser-check/cinema-garden.png`
- `.browser-check/cinema-sky.png`
- `.browser-check/mobile-cinema.png`
- `.browser-check/desktop-live-residences.png`
- Existing desktop/mobile hero and residence captures were refreshed.

Current build sizes: initial application approximately **96 kB minified / 37 kB gzip**; lazy scene approximately **587 kB minified / 149 kB gzip**. The existing chunk-size advisory remains unsuppressed. No new packages or external asset hosts were added. Actual OSM tiles remain untested by automation; intercepted synthetic tiles are used. Physical-device and broader screen-reader/multi-browser testing remain pending. This is stylized concept architecture, with no measured views, construction plans or real inventory implied. No commit, push, deployment or production access occurred.

## Photographic hero and material refinement

The hero now opens on a clearly labeled AI-assisted photographic architectural concept. A visible **Concept render / Live 3D** selector separates the static concept artwork from the actual interactive Three.js model. **Explore in 3D** switches into the model; the architectural film and live residence panel continue to use the same WebGL canvas. The concept image is an interpretation of this project's own tower, not site photography, measured architecture, a promised sea view or an exact representation of the interactive floor inventory.

Generated with the built-in image_gen tool, using the project's own tower screenshot as a massing reference. The original 1672 × 940 PNG is saved at `assets/hero-concept-v1.png`. Its production JPEG is `public/hero-concept-v1.jpg`, **362,043 bytes**. The exact prompt is saved at `assets/hero-concept-v1.prompt.txt`, with provenance in `assets/README.md`. The generated master remains outside the public build; the website serves only the optimized JPEG. Desktop/mobile cropping, text contrast overlays and image-mode disclosures were visually reviewed.

The live model also received original procedural concrete, paving, glass normals, water normals, room/curtain textures, cutout foliage and palm-frond geometry. Room appearance and lighting now vary deterministically. Reflections use a locally generated HDR sun/sky environment. Distant textured city context replaces nearby oversized block shapes. Shadow initialization uses 1536 px for desktop or 1024 px for mobile, reusing the maps during camera changes. Texture/reflection resources are explicitly disposed.

Final commands run on 27 October 2026:

| Command | Actual result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd test` | 7 passed, 0 failed |
| `npm.cmd run build` | Passed |
| `node scripts/browser-check.mjs` | 71 browser checks passed, 0 recorded runtime/resource/CSP errors |

New assertions verify the labeled default concept hero and loaded image, switching to the real canvas, opening/closing the film from image mode, returning to the correct hero mode, and no continuous WebGL drawing while the concept image is displayed. Earlier floor selection, unit filtering, save/restore/clear, map attribution, gallery, film, live residence docking, keyboard, motion pause, reduced-motion, fallback and responsive checks remain green. The test harness was updated to explicitly re-enter live mode after reload, because reloading deliberately starts in concept mode.

Updated visual artifacts include `.browser-check/hero-concept-desktop.png`, `.browser-check/hero-concept-mobile.png`, and the existing live/cinematic screenshots. A separate `--hero-review` harness flag was used for visual iteration; that flag explicitly reports that it is not a full regression run. The final 71-check result is from the complete suite without that flag.

Current build: initial application approximately **96 kB / 37 kB gzip**, lazy live scene approximately **590 kB / 149 kB gzip**, with the existing scene-size advisory retained. No dependencies or external runtime hosts were added. Live imagery remains procedural and stylized; the photographic concept image is explicitly a separate mode. Actual map tiles, physical-device touch performance and a comprehensive screen-reader/multi-browser audit remain unverified. Nothing was committed, pushed or deployed.

## Cinematic amenities — previous verification

Replaced the earlier CSS amenity illustration with three original photographic-style AI-assisted concepts generated using three separate built-in image_gen calls: a sunset pool terrace, a morning wellness studio and a blue-hour residents' lounge. Each image uses the project's own hero as a palette/material reference. Production JPEGs are 337–400 kB each; PNG masters and exact prompts are retained under `assets/`, with provenance and production filenames documented in `assets/README.md`. The interface explicitly labels these as concept artwork, not site photography or operating facilities.

The amenities now use a wide cinematic frame with a contrast-aware text overlay on desktop and stacked image/copy on mobile. Each tab selects its own decoded image with a crossfade. The active image has a subtle 20-second alternating camera-style transform; inactive images, offscreen sections and hidden tabs pause. A local motion control synchronizes with the page's global setting, and system reduced motion takes priority. Tabs remain manually selected and retain roving keyboard focus. Rapid image requests are guarded so stale loads cannot replace the currently selected scene. Failed image decoding shows a descriptive fallback while preserving the amenity details and controls.

Checks actually run on 27 October 2026:

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd test` | 7 passed, 0 failed |
| `npm.cmd run build` | Passed |
| `node scripts/browser-check.mjs --amenity-review` | Captured three desktop scenes and mobile layout for visual review; explicitly not a full regression run |
| `node scripts/browser-check.mjs` | 84 browser checks passed, 0 recorded runtime/resource/CSP errors |

New browser assertions verified all three distinct images, matching copy and image selection, keyboard navigation, visible image movement, local pause/resume, hidden-tab and offscreen pausing, rapid selection consistency, a simulated decoding failure and successful recovery, mobile width and system reduced motion. All previous hero, live 3D, film, floor/unit selection, enquiry preference, map, gallery, fallback and GPU-idling checks stayed green. Third-party map tile requests remain intercepted and fulfilled with synthetic local tiles.

Visually reviewed captures:

- `.browser-check/amenities-unwind-desktop.png`
- `.browser-check/amenities-restore-desktop.png`
- `.browser-check/amenities-connect-desktop.png`
- `.browser-check/amenities-mobile.png`

Current initial application: approximately **98 kB minified / 38 kB gzip**; lazy 3D scene remains approximately **590 kB / 149 kB gzip**, with the existing size advisory retained. No dependencies, runtime asset hosts, personal-data collection or submissions were added. The cinematic amenity effect animates original still images; it is not a video or a second 3D renderer. Physical-device and comprehensive multi-browser/screen-reader testing remain pending. No commit, push or deployment occurred.
