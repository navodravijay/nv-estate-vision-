// Local-only browser smoke checks via Chrome's DevTools Protocol; no extra package.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const executable = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw new Error('Only local preview URLs are allowed.');
const directory = path.resolve('.browser-check');
const profile = path.join(directory, 'profile');
await mkdir(profile, { recursive: true });
await unlink(path.join(profile, 'DevToolsActivePort')).catch(() => {});
const browser = spawn(executable, ['--headless=new', '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--window-size=1440,1000', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const failures = [];
const checks = [];
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); if (port) break; } catch { /* Startup. */ }
    await sleep(100);
  }
  assert.ok(port, 'Chrome remote debugging started');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const task = pending.get(message.id); if (!task) return;
      pending.delete(message.id); clearTimeout(task.timeout);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') failures.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') failures.push(message.params.entry.text);
    if (message.method === 'Fetch.requestPaused') {
      // Synthetic blank tiles keep automated tests off the community tile servers.
      void send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/svg+xml' }], body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#dbe4dd"/></svg>').toString('base64') });
    }
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const next = ++id;
      const timeout = setTimeout(() => { pending.delete(next); reject(new Error(`Timed out: ${method}`)); }, 15000);
      pending.set(next, { resolve, reject, timeout }); socket.send(JSON.stringify({ id: next, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async function check(name, expression) {
    const actual = await evaluate(expression);
    if (actual !== true) await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'failure.png'), Buffer.from(result.data, 'base64')));
    assert.equal(actual, true, name); checks.push(name); console.log(`PASS ${name}`);
  }
  async function amenityReady(key) {
    for (let i = 0; i < 80; i++) {
      if (await evaluate(`document.querySelector('#amenity-art').dataset.imageState==='ready' && document.querySelector('.amenity-image.is-active')?.dataset.amenityImage==='${key}'`)) return;
      await sleep(100);
    }
    throw new Error(`Amenity concept image did not become ready: ${key}`);
  }
  async function captureAmenities(name) {
    const clip = await evaluate(`(()=>{const r=document.querySelector('#lifestyle').getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height,scale:1}})()`);
    await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip }).then(result => writeFile(path.join(directory, name), Buffer.from(result.data, 'base64')));
  }
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  // Instrument WebGL calls in QA only, to verify that paused/offscreen scenes stop drawing.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__nvDrawCount=0;const drawPrototype=window.WebGL2RenderingContext?.prototype;if(drawPrototype)for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const original=drawPrototype[name];drawPrototype[name]=function(...args){window.__nvDrawCount++;return Reflect.apply(original,this,args)}}` });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: base });
  for (let i = 0; i < 100; i++) { await sleep(150); if (await evaluate(`document.querySelector('#unit-list')?.children.length === 3 && !document.querySelector('.scene-loading')`)) break; }
  await check('Actual WebGL canvas initialized', `!!document.querySelector('#scene canvas') && !document.querySelector('#scene.has-fallback')`);
  await check('Photographic concept hero is labeled and loads by default', `document.querySelector('#home').dataset.heroMode==='concept' && document.querySelector('#hero-concept-image').naturalWidth>0 && document.querySelector('.hero-concept-credit').textContent.includes('NOT SITE PHOTOGRAPHY') && document.querySelector('#scene').hidden`);
  await sleep(1600);
  await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'hero-concept-desktop.png'), Buffer.from(result.data, 'base64')));
  await evaluate(`document.querySelector('#hero-live-mode').click()`); await sleep(1500);
  await check('Live 3D mode reveals the actual interactive canvas', `document.querySelector('#home').dataset.heroMode==='live' && !document.querySelector('#scene').hidden && document.querySelector('#hero-live-mode').getAttribute('aria-pressed')==='true'`);
  for (let i = 0; i < 40; i++) { if (await evaluate(`document.querySelector('#gallery').dataset.studiesReady==='true'`)) break; await sleep(150); }
  await check('Cinematic collection is the labeled default', `document.querySelector('#gallery-tab-cinematic').getAttribute('aria-selected')==='true' && document.querySelector('[data-gallery="1"] img').getAttribute('src')==='/gallery-detail-v1.jpg' && document.querySelector('#gallery-note').textContent.includes('AI-assisted')`);
  await evaluate(`document.querySelector('#gallery-tab-studies').focus({preventScroll:true})`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'End', code: 'End', windowsVirtualKeyCode: 35 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'End', code: 'End', windowsVirtualKeyCode: 35 });
  await check('Collection tabs support keyboard focus and selection', `document.activeElement.id==='gallery-tab-studies' && document.querySelector('#gallery-panel').getAttribute('aria-labelledby')==='gallery-tab-studies'`);
  await check('Original 3D gallery renders generated', `document.querySelector('[data-gallery="0"] img').src.startsWith('data:image/')`);
  await evaluate(`document.querySelector('#gallery-tab-cinematic').click();document.querySelector('#hero-live-mode').focus({preventScroll:true});document.querySelector('#home').scrollIntoView({behavior:'instant'})`);
  if (process.argv.includes('--amenity-review')) {
    await evaluate(`document.querySelector('#lifestyle').scrollIntoView({behavior:'instant'})`);
    for (const key of ['unwind', 'restore', 'connect']) {
      await evaluate(`document.querySelector('[data-amenity="${key}"]').click()`); await amenityReady(key); await sleep(1000);
      await captureAmenities(`amenities-${key}-desktop.png`);
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await evaluate(`document.querySelector('[data-amenity="unwind"]').click();document.querySelector('#lifestyle').scrollIntoView({behavior:'instant'})`); await amenityReady('unwind'); await sleep(1000);
    await captureAmenities('amenities-mobile.png');
    console.log('Amenity-only visual review captured; the full regression suite was not run in this mode.');
    await send('Browser.close').catch(() => {}); socket.close(); browser.kill(); process.exit(0);
  }
  await sleep(1800); // Let the one-time editorial reveal settle before visual comparison.
  await check('No initial horizontal overflow', `document.documentElement.scrollWidth <= innerWidth`);
  await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'desktop.png'), Buffer.from(result.data, 'base64')));
  const metrics = await send('Page.getLayoutMetrics');
  await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1440, height: metrics.cssContentSize.height, scale: 1 } }).then(result => writeFile(path.join(directory, 'desktop-full.png'), Buffer.from(result.data, 'base64')));
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 930, y: 365 }); await sleep(100);
  await check('Tower hover identifies a floor before selection', `!document.querySelector('.floor-tooltip').hidden && document.querySelector('.floor-tooltip').textContent.includes('LEVEL') && document.querySelector('#scene canvas').style.cursor==='pointer'`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 500, y: 120 });
  const daylightPixels = (await send('Page.captureScreenshot', { format: 'png' })).data;
  await evaluate(`document.querySelector('[data-lighting="blue-hour"]').click()`); await sleep(1250);
  await check('Lighting selection updates accessible state', `document.querySelector('#home').dataset.atmosphere==='blue-hour' && document.querySelector('[data-lighting="blue-hour"]').getAttribute('aria-pressed')==='true' && document.querySelector('[data-lighting="daylight"]').getAttribute('aria-pressed')==='false'`);
  const blueHourPixels = (await send('Page.captureScreenshot', { format: 'png' })).data;
  assert.ok(daylightPixels !== blueHourPixels, 'Lighting changes the actual presentation'); checks.push('Lighting changes the actual presentation'); console.log('PASS Lighting changes the actual presentation');
  await writeFile(path.join(directory, 'desktop-blue-hour.png'), Buffer.from(blueHourPixels, 'base64'));
  if (process.argv.includes('--hero-review')) {
    await evaluate(`document.querySelector('[data-lighting="daylight"]').click()`); await sleep(1250);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await sleep(300);
    await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'mobile-hero-review.png'), Buffer.from(result.data, 'base64')));
    await evaluate(`document.querySelector('#hero-concept-mode').click()`); await sleep(200);
    await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'hero-concept-mobile.png'), Buffer.from(result.data, 'base64')));
    console.log('Hero-only visual review captured. Full browser suite was not run in this mode.');
    await send('Browser.close').catch(() => {}); socket.close(); browser.kill(); process.exit(0);
  }
  await evaluate(`document.querySelector('[data-lighting="daylight"]').click()`); await sleep(1250);
  await check('Switching lighting preserves residence selection', `document.querySelector('#floor-range').value==='18' && document.querySelector('[data-lighting="daylight"]').getAttribute('aria-pressed')==='true'`);
  await evaluate(`document.querySelector('#hero-concept-mode').click();document.querySelector('#watch-film').click()`);
  await check('Architectural film opens using the existing canvas', `document.querySelector('#cinema-dialog').open && document.querySelector('#cinema-stage #scene canvas')!==null && document.querySelectorAll('#scene canvas').length===1`);
  await check('Film playback begins with the arrival chapter', `document.querySelector('#cinema-dialog').dataset.currentChapter==='arrival' && document.querySelector('#cinema-play').getAttribute('aria-pressed')==='true'`);
  await sleep(7900);
  await check('Film advances automatically to the next chapter', `document.querySelector('#cinema-dialog').dataset.currentChapter==='garden' && document.querySelector('#cinema-play').getAttribute('aria-pressed')==='true'`);
  await evaluate(`document.querySelector('#cinema-play').click()`);
  await check('Film can be paused', `document.querySelector('#cinema-play').getAttribute('aria-pressed')==='false'`);
  await evaluate(`document.querySelector('[data-chapter="garden"]').click()`); await sleep(5050);
  await check('Water garden chapter updates camera presentation and copy', `document.querySelector('#cinema-dialog').dataset.currentChapter==='garden' && document.querySelector('#cinema-title').textContent.includes('quieter') && document.querySelector('button[data-chapter="garden"]').getAttribute('aria-pressed')==='true'`);
  await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'cinema-garden.png'), Buffer.from(result.data, 'base64')));
  await evaluate(`document.querySelector('[data-chapter="sky"]').click()`); await sleep(5050);
  await check('Sky chapter switches to blue hour', `document.querySelector('#cinema-dialog').dataset.currentChapter==='sky' && document.querySelector('#cinema-dialog').dataset.atmosphere==='blue-hour'`);
  await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'cinema-sky.png'), Buffer.from(result.data, 'base64')));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(1500);
  await check('Closing film returns canvas and focus to hero', `!document.querySelector('#cinema-dialog').open && !!document.querySelector('#home > #scene canvas') && document.activeElement.id==='watch-film'`);
  await check('Film opened from concept mode returns to the concept hero', `document.querySelector('#home').dataset.heroMode==='concept' && document.querySelector('#scene').hidden`);
  await evaluate(`document.querySelector('#hero-live-mode').click()`); await sleep(1500);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 930, y: 365, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 930, y: 365, button: 'left', clickCount: 1 });
  await check('Clicking tower geometry updates HTML floor state', `document.querySelector('#floor-range').value!=='18' && document.querySelector('#level-title').textContent===document.querySelector('#floor-range').value.padStart(2,'0')`);
  await evaluate(`document.querySelector('#floor-range').value='24';document.querySelector('#floor-range').dispatchEvent(new Event('input',{bubbles:true}))`);
  await check('Floor slider synchronizes details', `document.querySelector('#level-title').textContent==='24' && document.querySelector('[data-floor="24"]').getAttribute('aria-pressed')==='true' && document.querySelector('#unit-list').textContent.includes('24A')`);
  await evaluate(`document.querySelector('#residences').scrollIntoView({behavior:'instant'})`); await sleep(1100);
  await check('Live tower docks beside residence details', `!!document.querySelector('#residence-stage #scene canvas') && !document.querySelector('#residence-stage').hidden && document.querySelector('#tower-diagram').hidden`);
  await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'desktop-live-residences.png'), Buffer.from(result.data, 'base64')));
  await evaluate(`document.querySelector('#residence-live-toggle').click()`);
  await check('Residence browser can switch to accessible floor diagram', `!document.querySelector('#tower-diagram').hidden && document.querySelector('#residence-stage').hidden`);
  await evaluate(`document.querySelector('#residence-live-toggle').click()`); await sleep(150);
  await check('Residence live mode restores the same canvas', `!!document.querySelector('#residence-stage #scene canvas') && document.querySelectorAll('#scene canvas').length===1`);
  await evaluate(`document.querySelector('#bedroom-filter').value='1';document.querySelector('#availability-filter').value='available';document.querySelector('#availability-filter').dispatchEvent(new Event('change'))`);
  await check('Combined filters show empty state', `document.querySelector('#unit-list').children.length===0 && document.querySelector('#unit-detail').textContent.includes('No residences match')`);
  await evaluate(`document.querySelector('#clear-filters').click();document.querySelector('[data-floor="18"]').click();document.querySelectorAll('.unit-row')[1].click();document.querySelector('#unit-detail button').click()`);
  await check('Choosing a residence populates the demo form', `document.querySelector('#enquiry-bedroom').value==='2' && document.querySelector('#enquiry-floor').value==='18'`);
  await evaluate(`document.querySelector('[name="consent"]').checked=true;document.querySelector('#enquiry-form').requestSubmit()`);
  await check('Demo save stores only allowlisted preferences', `JSON.stringify(JSON.parse(localStorage.getItem('nv-estate-vision.preference.v1')))===JSON.stringify({bedrooms:2,floor:18,priority:'outdoor'}) && document.querySelector('#form-status').textContent.includes('No enquiry was submitted')`);
  await send('Page.reload'); await sleep(1200);
  await check('Saved preference restores after reload', `document.querySelector('#enquiry-bedroom').value==='2' && document.querySelector('#form-status').textContent.includes('saved on this device')`);
  await evaluate(`document.querySelector('#hero-live-mode').click()`);
  await evaluate(`document.querySelector('#clear-preference').click()`);
  await check('Saved preference clears', `localStorage.getItem('nv-estate-vision.preference.v1')===null`);
  await evaluate(`document.querySelector('#lifestyle').scrollIntoView({behavior:'instant'});document.querySelector('[data-amenity="unwind"]').click()`); await amenityReady('unwind'); await sleep(1000);
  await check('Unwind displays the original cinematic pool image', `document.querySelector('.amenity-image.is-active').naturalWidth>0 && document.querySelector('.amenity-image.is-active').dataset.amenityImage==='unwind' && document.querySelector('.amenity-image-credit').textContent.includes('NOT SITE PHOTOGRAPHY')`);
  await captureAmenities('amenities-unwind-desktop.png');
  await evaluate(`document.querySelector('[data-amenity="restore"]').click()`);
  await amenityReady('restore'); await sleep(1000);
  await check('Amenities update accessible panel', `document.querySelector('#amenity-content').getAttribute('aria-labelledby')==='tab-restore' && document.querySelector('#amenity-title').textContent.includes('yourself')`);
  await check('Restore swaps to a distinct wellness image', `document.querySelector('.amenity-image.is-active').dataset.amenityImage==='restore' && document.querySelectorAll('.amenity-image.is-active').length===1 && document.querySelector('.amenity-image.is-active').getAttribute('aria-hidden')==='false'`);
  await captureAmenities('amenities-restore-desktop.png');
  await evaluate(`document.querySelector('#tab-restore').focus()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await check('Amenity tabs support roving keyboard focus', `document.activeElement.id==='tab-connect' && document.querySelector('#tab-connect').getAttribute('aria-selected')==='true'`);
  await amenityReady('connect'); await sleep(1000);
  await check('Connect displays the residents lounge visual', `document.querySelector('.amenity-image.is-active').dataset.amenityImage==='connect' && document.querySelector('#amenity-art').dataset.imageState==='ready'`);
  await captureAmenities('amenities-connect-desktop.png');
  await check('Visible amenity image has gentle cinematic movement', `getComputedStyle(document.querySelector('.amenity-image.is-active')).animationPlayState==='running'`);
  await evaluate(`document.querySelector('#amenity-motion-toggle').click()`);
  await check('Local amenity pause stops motion across the page', `document.documentElement.dataset.motion==='off' && document.querySelector('#amenity-motion-toggle').getAttribute('aria-pressed')==='false' && getComputedStyle(document.querySelector('.amenity-image.is-active')).animationName==='none'`);
  await evaluate(`document.querySelector('#amenity-motion-toggle').click()`);
  await check('Amenity motion can resume', `document.documentElement.dataset.motion==='on' && document.querySelector('#amenity-motion-toggle').getAttribute('aria-pressed')==='true'`);
  await evaluate(`Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))`);
  await check('Cinematic amenity movement pauses in a hidden tab', `getComputedStyle(document.querySelector('.amenity-image.is-active')).animationPlayState==='paused'`);
  await evaluate(`delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))`);
  await evaluate(`document.querySelector('#enquire').scrollIntoView({behavior:'instant'})`); await sleep(200);
  await check('Amenity image movement pauses offscreen', `getComputedStyle(document.querySelector('.amenity-image.is-active')).animationPlayState==='paused'`);
  await evaluate(`document.querySelector('#lifestyle').scrollIntoView({behavior:'instant'});document.querySelector('[data-amenity="unwind"]').click();document.querySelector('[data-amenity="restore"]').click();document.querySelector('[data-amenity="connect"]').click()`); await amenityReady('connect');
  await check('Rapid tab changes preserve matching copy and image', `document.querySelector('#amenity-content').getAttribute('aria-labelledby')==='tab-connect' && document.querySelector('#amenity-title').textContent.includes('company') && document.querySelector('.amenity-image.is-active').dataset.amenityImage==='connect'`);
  await evaluate(`(()=>{const image=document.querySelector('[data-amenity-image="restore"]');image.__originalDecode=image.decode;image.decode=()=>Promise.reject(new Error('Synthetic image decode failure'));document.querySelector('[data-amenity="restore"]').click()})()`); await sleep(100);
  await check('Unavailable amenity image shows a descriptive fallback', `document.querySelector('#amenity-art').dataset.imageState==='error' && !document.querySelector('.amenity-image-fallback').hidden && document.querySelector('#amenity-title').textContent.includes('yourself') && document.querySelector('#amenity-image-status').textContent.includes('could not load')`);
  await evaluate(`(()=>{const image=document.querySelector('[data-amenity-image="restore"]');image.decode=image.__originalDecode;delete image.__originalDecode;document.querySelector('[data-amenity="unwind"]').click()})()`); await amenityReady('unwind');
  await check('Amenity image presentation recovers after a failed image', `document.querySelector('.amenity-image-fallback').hidden && document.querySelector('.amenity-image.is-active').dataset.amenityImage==='unwind'`);
  await evaluate(`document.querySelector('[data-location="connection"]').click()`);
  await check('Location information updates', `document.querySelector('#location-information').textContent.includes('No exact plot')`);
  await check('Map waits for visitor consent', `!document.querySelector('.leaflet-container') && !!document.querySelector('#load-map')`);
  await send('Fetch.enable', { patterns: [{ urlPattern: 'https://tile.openstreetmap.org/*', requestStage: 'Request' }] });
  await evaluate(`document.querySelector('#load-map').click()`);
  for (let i = 0; i < 50; i++) { if (await evaluate(`!!document.querySelector('.leaflet-tile-loaded')`)) break; await sleep(100); }
  await check('Map initializes with attribution and synthetic local tiles', `!!document.querySelector('.leaflet-tile-loaded') && document.querySelector('.leaflet-control-attribution').textContent.includes('OpenStreetMap') && !!document.querySelector('.leaflet-control-zoom-in') && !document.querySelector('.leaflet-marker-icon')`);
  await evaluate(`document.querySelector('#gallery').scrollIntoView({behavior:'instant'})`); await sleep(1600);
  const galleryClip = await evaluate(`(()=>{const r=document.querySelector('#gallery').getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height,scale:1}})()`);
  await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: galleryClip }).then(result => writeFile(path.join(directory, 'gallery-desktop.png'), Buffer.from(result.data, 'base64')));
  await evaluate(`document.querySelector('[data-gallery="0"]').click()`); await sleep(400);
  await check('Gallery opens as modal', `document.querySelector('#gallery-dialog').open && document.documentElement.classList.contains('modal-open')`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await check('Gallery supports keyboard navigation', `document.querySelector('#gallery-counter').textContent.startsWith('2 / 3')`);
  await sleep(500);
  await check('Gallery detail image and description match navigation', `!document.querySelector('#gallery-full').hidden && document.querySelector('#gallery-full').naturalWidth>0 && document.querySelector('#gallery-title').textContent==='Material & light' && document.querySelector('#gallery-description').textContent.includes('pale stone') && document.querySelector('[data-gallery-thumb="1"]').getAttribute('aria-pressed')==='true'`);
  await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'gallery-modal-desktop.png'), Buffer.from(result.data, 'base64')));
  await evaluate(`document.querySelector('[data-gallery-thumb="2"]').click()`);
  await check('Gallery thumbnails select their frame', `document.querySelector('#gallery-title').textContent==='The sky terrace' && document.querySelector('[data-gallery-thumb="2"]').getAttribute('aria-pressed')==='true'`);
  await evaluate(`document.querySelector('#gallery-next').click()`);
  await check('Gallery navigation wraps to the first frame', `document.querySelector('#gallery-counter').textContent==='1 / 3'`);
  await evaluate(`(()=>{const image=document.querySelector('#gallery-full');image.__originalDecode=image.decode;image.decode=()=>Promise.reject(new Error('Synthetic gallery image failure'));document.querySelector('#gallery-next').click()})()`); await sleep(100);
  await check('Gallery image failure retains controls and useful message', `document.querySelector('#gallery-full').hidden && document.querySelector('#gallery-image-status').textContent.includes('could not load') && document.querySelector('#gallery-title').textContent==='Material & light'`);
  await evaluate(`(()=>{const image=document.querySelector('#gallery-full');image.decode=image.__originalDecode;delete image.__originalDecode;document.querySelector('#gallery-next').click();document.querySelector('#gallery-prev').click()})()`); await sleep(300);
  await check('Gallery recovers and rapid navigation retains matching image', `!document.querySelector('#gallery-full').hidden && document.querySelector('#gallery-full').getAttribute('src')==='/gallery-detail-v1.jpg' && document.querySelector('#gallery-image-status').hidden`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(100);
  await check('Escape closes gallery and restores focus', `!document.querySelector('#gallery-dialog').open && document.activeElement.matches('[data-gallery="0"]')`);
  await evaluate(`document.querySelector('[data-view="aerial"]').click()`); await sleep(1400);
  await check('Camera preset state updates', `document.querySelector('[data-view="aerial"]').getAttribute('aria-pressed')==='true'`);
  await evaluate(`document.querySelector('#zoom-in').click();document.querySelector('#zoom-out').click();document.querySelector('#reset-view').click()`);
  await check('Reset restores perspective preset', `document.querySelector('[data-view="perspective"]').getAttribute('aria-pressed')==='true'`);
  await sleep(1400);
  await evaluate(`document.querySelector('#home').scrollIntoView({behavior:'instant'});document.querySelector('#scene canvas').focus({preventScroll:true})`); await sleep(150);
  const beforeOrbit = (await send('Page.captureScreenshot', { format: 'png' })).data;
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 }); await sleep(350);
  const afterOrbit = (await send('Page.captureScreenshot', { format: 'png' })).data;
  assert.ok(beforeOrbit !== afterOrbit, 'Keyboard orbit changes the rendered view'); checks.push('Keyboard orbit changes the rendered view'); console.log('PASS Keyboard orbit changes the rendered view');
  await evaluate(`document.querySelector('#zoom-in').click()`); await sleep(150);
  const afterZoom = (await send('Page.captureScreenshot', { format: 'png' })).data;
  assert.ok(afterOrbit !== afterZoom, 'Zoom changes the rendered view'); checks.push('Zoom changes the rendered view'); console.log('PASS Zoom changes the rendered view');
  await evaluate(`document.querySelector('#reset-view').click()`); await sleep(1400);
  await evaluate(`document.querySelector('#auto-orbit').click()`);
  await check('Auto orbit starts only when selected', `document.querySelector('#auto-orbit').getAttribute('aria-pressed')==='true'`);
  const orbitDraws = await evaluate(`window.__nvDrawCount`); await sleep(500);
  await check('Auto orbit renders changing camera frames', `window.__nvDrawCount>${orbitDraws}`);
  await evaluate(`document.querySelector('#enquire').scrollIntoView({behavior:'instant'})`); await sleep(400);
  const offscreenDraws = await evaluate(`window.__nvDrawCount`); await sleep(450);
  await check('Auto orbit stops GPU drawing offscreen', `window.__nvDrawCount===${offscreenDraws} && document.querySelector('#auto-orbit').getAttribute('aria-pressed')==='true'`);
  await evaluate(`document.querySelector('#home').scrollIntoView({behavior:'instant'})`); await sleep(200);
  const returnedDraws = await evaluate(`window.__nvDrawCount`); await sleep(350);
  await check('Auto orbit resumes when the tower returns to view', `window.__nvDrawCount>${returnedDraws}`);
  await evaluate(`Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))`); await sleep(100);
  const hiddenDraws = await evaluate(`window.__nvDrawCount`); await sleep(350);
  await check('Hidden tab simulation stops GPU drawing', `window.__nvDrawCount===${hiddenDraws} && document.documentElement.classList.contains('page-hidden')`);
  await evaluate(`delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))`); await sleep(150);
  await evaluate(`document.querySelector('#zoom-in').click()`);
  await check('Manual camera control stops auto orbit', `document.querySelector('#auto-orbit').getAttribute('aria-pressed')==='false'`);
  await evaluate(`document.querySelector('#auto-orbit').click();document.querySelector('#motion-toggle').click()`);
  await check('Global animation pause stops orbit and decorative motion', `document.documentElement.dataset.motion==='off' && document.querySelector('#auto-orbit').disabled && document.querySelector('#auto-orbit').getAttribute('aria-pressed')==='false' && document.querySelector('#motion-toggle').getAttribute('aria-pressed')==='false'`);
  await sleep(500);
  const pausedDraws = await evaluate(`window.__nvDrawCount`); await sleep(350);
  await check('Paused scene returns to rendering on demand', `window.__nvDrawCount===${pausedDraws}`);
  await evaluate(`document.querySelector('#motion-toggle').click()`);
  await check('Animation controls can be enabled again', `document.documentElement.dataset.motion==='on' && !document.querySelector('#auto-orbit').disabled`);
  await evaluate(`document.querySelector('#reset-view').click()`); await sleep(1400);
  await check('Unverified contact actions stay hidden', `document.querySelector('#contact-action').hidden && !document.querySelector('#contact-action').hasAttribute('href')`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`scrollTo(0,0)`); await sleep(350);
  await check('Mobile page has no horizontal overflow', `document.documentElement.scrollWidth <= innerWidth`);
  await evaluate(`document.querySelector('.menu-button').click()`);
  await check('Mobile navigation opens', `document.querySelector('.menu-button').getAttribute('aria-expanded')==='true' && getComputedStyle(document.querySelector('#navigation')).display==='flex'`);
  await evaluate(`document.querySelector('#navigation a').click()`);
  await check('Mobile navigation closes on selection', `document.querySelector('.menu-button').getAttribute('aria-expanded')==='false'`);
  await evaluate(`document.querySelector('#lifestyle').scrollIntoView({behavior:'instant'});document.querySelector('[data-amenity="unwind"]').click()`); await amenityReady('unwind'); await sleep(1000);
  await check('Cinematic amenity panel fits mobile width', `document.querySelector('#amenity-content').scrollWidth<=innerWidth && document.querySelector('#amenity-motion-toggle').getBoundingClientRect().right<=innerWidth`);
  await captureAmenities('amenities-mobile.png');
  await evaluate(`document.querySelector('#gallery').scrollIntoView({behavior:'instant'})`); await sleep(1000);
  const mobileGalleryClip = await evaluate(`(()=>{const r=document.querySelector('#gallery').getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height,scale:1}})()`);
  await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: mobileGalleryClip }).then(result => writeFile(path.join(directory, 'gallery-mobile.png'), Buffer.from(result.data, 'base64')));
  await evaluate(`document.querySelector('[data-gallery="0"]').click()`); await sleep(400);
  await check('Gallery modal and close control fit mobile viewport', `document.querySelector('#gallery-dialog').scrollWidth<=innerWidth && document.querySelector('#gallery-close').getBoundingClientRect().right<=innerWidth && !document.querySelector('#gallery-full').hidden`);
  const swipeY = await evaluate(`(()=>{const r=document.querySelector('#gallery-image-stage').getBoundingClientRect();return r.top+r.height/2})()`);
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 295, y: swipeY }] });
  for (const x of [260, 220, 170, 110]) await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: swipeY }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(400);
  await check('Actual mobile touch swipe advances gallery', `document.querySelector('#gallery-title').textContent==='Material & light' && document.querySelector('#gallery-counter').textContent==='2 / 3'`);
  await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'gallery-modal-mobile.png'), Buffer.from(result.data, 'base64')));
  await evaluate(`document.querySelector('#gallery-close').click()`); await sleep(100);
  await check('Gallery close button restores mobile opener focus', `!document.querySelector('#gallery-dialog').open && document.activeElement.matches('[data-gallery="0"]')`);
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await sleep(1400);
  await evaluate(`document.querySelector('#home').scrollIntoView({behavior:'instant'})`);
  await sleep(150);
  await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'mobile.png'), Buffer.from(result.data, 'base64')));
  await evaluate(`document.querySelector('[data-lighting="blue-hour"]').click()`); await sleep(1250);
  await check('Mobile lighting controls work', `document.querySelector('#home').dataset.atmosphere==='blue-hour' && !document.querySelector('[data-lighting="blue-hour"]').disabled`);
  await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'mobile-blue-hour.png'), Buffer.from(result.data, 'base64')));
  await evaluate(`document.querySelector('[data-lighting="daylight"]').click()`); await sleep(1250);
  await evaluate(`document.querySelector('#hero-concept-mode').click()`); await sleep(150);
  await check('Concept mode pauses the hidden WebGL scene', `document.querySelector('#scene').hidden && document.querySelector('#home').dataset.heroMode==='concept'`);
  await sleep(200);
  const conceptDraws = await evaluate(`window.__nvDrawCount`); await sleep(350);
  await check('Concept hero does not continuously render WebGL', `window.__nvDrawCount===${conceptDraws}`);
  await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'hero-concept-mobile.png'), Buffer.from(result.data, 'base64')));
  await evaluate(`document.querySelector('#hero-live-mode').click()`); await sleep(1500);
  await evaluate(`document.querySelector('#watch-film').click();document.querySelector('[data-chapter="garden"]').click()`); await sleep(5050);
  await check('Film chapter controls fit mobile viewport', `document.querySelector('#cinema-dialog').open && document.querySelector('#cinema-dialog').scrollWidth<=innerWidth && document.querySelector('#cinema-close').getBoundingClientRect().right<=innerWidth`);
  await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'mobile-cinema.png'), Buffer.from(result.data, 'base64')));
  await evaluate(`document.querySelector('#cinema-close').click()`); await sleep(1500);
  await evaluate(`document.querySelector('#residences').scrollIntoView({behavior:'instant'})`); await sleep(150);
  await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.join(directory, 'mobile-residences.png'), Buffer.from(result.data, 'base64')));
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  // The CSS media query changes before matchMedia dispatches its change event.
  for (let i = 0; i < 30; i++) { if (await evaluate(`document.documentElement.dataset.motion==='off'`)) break; await sleep(50); }
  await check('Reduced motion disables smooth scrolling', `getComputedStyle(document.documentElement).scrollBehavior==='auto'`);
  await check('Reduced motion disables auto orbit and animations', `document.documentElement.dataset.motion==='off' && document.querySelector('#auto-orbit').disabled && document.querySelector('#motion-toggle').disabled`);
  await check('Amenity imagery respects system reduced motion', `document.querySelector('#amenity-motion-toggle').disabled && getComputedStyle(document.querySelector('.amenity-image.is-active')).animationName==='none'`);
  await check('Reading progress remains available without animation', `!!document.querySelector('.reading-progress') && document.querySelector('.reading-progress').style.transform.startsWith('scaleX(')`);
  await evaluate(`document.querySelector('[data-lighting="blue-hour"]').click()`);
  await check('Lighting remains available with reduced motion', `document.querySelector('[data-lighting="blue-hour"]').getAttribute('aria-pressed')==='true'`);
  await evaluate(`document.querySelector('#home').scrollIntoView({behavior:'instant'});document.querySelector('#watch-film').click();document.querySelector('[data-chapter="sky"]').click()`); await sleep(100);
  await check('Reduced motion keeps manual film chapters available without autoplay', `document.querySelector('#cinema-dialog').dataset.currentChapter==='sky' && document.querySelector('#cinema-play').disabled && document.querySelector('#cinema-play').getAttribute('aria-pressed')==='false'`);
  await evaluate(`document.querySelector('#cinema-close').click()`); await sleep(100);
  for (const width of [320, 768, 1024]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 761 }); await sleep(150);
    await check(`No horizontal overflow at ${width}px`, `document.documentElement.scrollWidth <= innerWidth`);
  }
  // Context loss verifies the graceful fallback without disabling all browser GPU support.
  await evaluate(`document.querySelector('#scene canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`); await sleep(300);
  await check('WebGL failure leaves HTML selection usable', `document.querySelector('#scene').classList.contains('has-fallback') && !document.querySelector('#floor-range').disabled`);
  await check('WebGL fallback disables lighting controls', `[...document.querySelectorAll('[data-lighting]')].every(button=>button.disabled)`);
  await check('WebGL fallback disables auto orbit', `document.querySelector('#auto-orbit').disabled`);
  await check('WebGL fallback disables film and live residence mode', `document.querySelector('#watch-film').disabled && document.querySelector('#residence-live-toggle').disabled && !document.querySelector('#tower-diagram').hidden`);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `const originalGetContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2')return null;return originalGetContext.call(this,type,...args)}` });
  await send('Page.reload');
  for (let i = 0; i < 60; i++) { if (await evaluate(`!!document.querySelector('#scene.has-fallback') && document.querySelector('#unit-list')?.children.length===3`)) break; await sleep(100); }
  await check('Initial WebGL failure retains distinct gallery studies and working inventory', `new Set([...document.querySelectorAll('[data-gallery] img')].map(image=>image.getAttribute('src'))).size===3 && document.querySelector('#unit-list').children.length===3 && document.querySelector('#scene').classList.contains('has-fallback')`);
  await evaluate(`document.querySelector('#gallery-tab-studies').click();document.querySelector('[data-gallery="1"]').click()`);
  await check('Fallback gallery still opens and navigates', `document.querySelector('#gallery-dialog').open && document.querySelector('#gallery-full').getAttribute('src')==='/facade.svg'`);
  await evaluate(`document.querySelector('#gallery-close').click()`);
  assert.deepEqual(failures, [], 'No browser runtime or resource/CSP errors');
  checks.push('No browser runtime or resource/CSP errors');
  await writeFile(path.join(directory, 'results.json'), JSON.stringify({ checks, failures, mapTiles: 'Provider requests intercepted and fulfilled with original synthetic blank tiles. No external tiles downloaded.' }, null, 2));
  console.log(`${checks.length} browser checks passed. Screenshots: .browser-check/desktop.png, .browser-check/mobile.png`);
  if (process.argv.includes('--write-social-card')) {
    await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${base}/social.svg` }); await sleep(400);
    await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(path.resolve('public/social.png'), Buffer.from(result.data, 'base64')));
    console.log('Raster social card written to public/social.png from the original SVG. Rebuild to include it.');
  }
  await send('Browser.close').catch(() => {});
} finally { socket?.close(); browser.kill(); }
