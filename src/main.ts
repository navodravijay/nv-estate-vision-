import './style.css';
import './polish.css';
import './animation.css';
import './cinema.css';
import './hero.css';
import './amenities.css';
import './gallery.css';
import gsap from 'gsap';
import { createMotion } from './motion';
import { createAmenityVisual } from './amenities';
import { createGallery } from './gallery';
import { createTour } from './tour';
import { chapters } from './cinema';
import { demoConfig } from './config';
import { contactLink, filterUnits, parsePreference, unitsForFloor, validFloor } from './domain';
import type { Unit } from './domain';
import type { Lighting, SceneApi, View } from './scene';

function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Required interface element missing: ${selector}`);
  return node;
}
function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
let floor = demoConfig.initialFloor;
let selectedId = `${floor}B`;
let sceneApi: SceneApi | undefined;
let tour: ReturnType<typeof createTour> | undefined;
let sceneReady = false;
let residenceVisible = false;
let preferLive = true;
let dock: 'hero' | 'residence' | 'cinema' = 'hero';
let heroMode: 'concept' | 'live' = 'concept';
const sceneHost = $('#scene');
const homeSibling = sceneHost.nextSibling;
const motion = createMotion(enabled => { sceneApi?.motion(enabled); tour?.motion(enabled); });
const amenityVisual = createAmenityVisual({ enabled: motion.enabled, toggle: () => $<HTMLButtonElement>('#motion-toggle').click() });
function dockScene() {
  const next = sceneReady && tour?.isOpen() ? 'cinema' : sceneReady && residenceVisible && preferLive ? 'residence' : 'hero';
  const live = next === 'residence';
  sceneHost.hidden = next === 'hero' && heroMode === 'concept';
  $('#residence-stage').hidden = !live;
  $('.residence-camera').hidden = !live;
  $('#tower-diagram').hidden = live;
  $('.floor-panel').classList.toggle('is-live', live);
  $('.scene-standin').hidden = next === 'hero';
  $('#home').dataset.stage = next;
  $<HTMLButtonElement>('#residence-live-toggle').setAttribute('aria-pressed', String(preferLive));
  $('#residence-live-toggle').textContent = preferLive ? 'Show diagram ↻' : 'Live 3D ↻';
  if (dock === next) return;
  dock = next;
  if (next === 'cinema') $('#cinema-stage').append(sceneHost);
  else if (next === 'residence') $('#residence-stage').append(sceneHost);
  else $('#home').insertBefore(sceneHost, homeSibling);
}
function setHeroMode(mode: 'concept' | 'live') {
  heroMode = mode;
  $('#home').dataset.heroMode = mode;
  $<HTMLButtonElement>('#hero-concept-mode').setAttribute('aria-pressed', String(mode === 'concept'));
  $<HTMLButtonElement>('#hero-live-mode').setAttribute('aria-pressed', String(mode === 'live'));
  dockScene();
  if (mode === 'live' && sceneReady) setView('perspective');
}
$('#hero-concept-mode').addEventListener('click', () => { sceneApi?.orbit(false); setHeroMode('concept'); });
$('#hero-live-mode').addEventListener('click', () => setHeroMode('live'));
const conceptImage = $<HTMLImageElement>('#hero-concept-image');
conceptImage.addEventListener('error', () => setHeroMode('live'));
if (conceptImage.complete && conceptImage.naturalWidth === 0) setHeroMode('live');
tour = createTour({
  allowed: () => motion.enabled(),
  open: dockScene,
  close: () => { dockScene(); setView('perspective'); setLighting('daylight'); },
  hold: () => sceneApi?.hold(),
  shot: key => {
    const chapter = chapters.find(item => item.id === key)!;
    sceneApi?.shot(key); setLighting(chapter.lighting);
    cameraButtons.forEach(button => { button.classList.remove('active'); button.setAttribute('aria-pressed', 'false'); });
  },
});
tour.motion(motion.enabled());
const residenceObserver = new IntersectionObserver(entries => {
  residenceVisible = entries[0].isIntersecting;
  dockScene();
}, { threshold: .12 });
residenceObserver.observe($('.residence-layout'));
$('#residence-live-toggle').addEventListener('click', () => { preferLive = !preferLive; sceneApi?.orbit(false); dockScene(); });
$('#residence-zoom-in').addEventListener('click', () => sceneApi?.zoom(.87));
$('#residence-zoom-out').addEventListener('click', () => sceneApi?.zoom(1.15));
$('#residence-reset').addEventListener('click', () => setView('perspective'));
function sceneUnavailable() {
  sceneReady = false; tour?.unavailable(); dockScene();
  document.querySelectorAll<HTMLButtonElement>('#watch-film,#residence-live-toggle,#hero-live-mode').forEach(button => { button.disabled = true; });
}
sceneHost.addEventListener('sceneunavailable', sceneUnavailable);
const bedroomFilter = $<HTMLSelectElement>('#bedroom-filter');
const availabilityFilter = $<HTMLSelectElement>('#availability-filter');
const floorRange = $<HTMLInputElement>('#floor-range');
const floorButtons: HTMLButtonElement[] = [];
const sceneSelection = element('a', 'scene-selection', `LEVEL ${floor} SELECTED · EXPLORE RESIDENCES ↗`);
sceneSelection.href = '#residences';
$('.hero').append(sceneSelection);
for (let i = 32; i >= 1; i--) {
  const button = element('button', 'floor-row');
  button.type = 'button';
  button.setAttribute('aria-label', `Select level ${i}`);
  button.dataset.floor = String(i);
  const label = element('span', '', i % 4 === 0 || i === 1 ? String(i).padStart(2, '0') : '');
  button.append(label, element('i'));
  button.addEventListener('click', () => selectFloor(i));
  $('#tower-diagram').append(button);
  floorButtons.push(button);
}
function showUnit(unit: Unit) {
  const detail = $('#unit-detail');
  detail.replaceChildren();
  const plan = element('div', 'floorplan');
  const diagram = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  diagram.setAttribute('viewBox', '0 0 240 180');
  diagram.setAttribute('role', 'img');
  diagram.setAttribute('aria-label', `Illustrative ${unit.bedrooms}-bedroom layout. Not a construction plan.`);
  const paths = ['M22 22H216V151H22Z', 'M22 128H216', 'M138 22V85H216', 'M138 85H108V128', 'M60 22V65H22'];
  if (unit.bedrooms >= 2) paths.push('M138 85V128');
  if (unit.bedrooms === 3) paths.push('M80 22V85H138');
  paths.forEach(d => { const path = document.createElementNS(diagram.namespaceURI, 'path'); path.setAttribute('d', d); diagram.append(path); });
  const planLabel = document.createElementNS(diagram.namespaceURI, 'text');
  planLabel.setAttribute('x', '55'); planLabel.setAttribute('y', '101'); planLabel.textContent = 'LIVING'; diagram.append(planLabel);
  plan.append(diagram, element('small', '', 'ILLUSTRATIVE LAYOUT · NOT TO SCALE'));
  const content = element('div', 'detail-copy');
  content.append(element('span', 'eyebrow', `RESIDENCE ${unit.id}`), element('h4', '', `The ${unit.collection} Collection`), element('p', '', `${unit.bedrooms} bedroom${unit.bedrooms > 1 ? 's' : ''} · ${unit.area} m² · ${unit.aspect}`), element('p', 'demo-label', 'Fictional specifications. No price or real availability is represented.'));
  const action = element('button', 'inline-link', unit.status === 'available' ? 'Choose this residence ↗' : 'Reserved in this demonstration');
  action.type = 'button';
  action.disabled = unit.status === 'reserved';
  action.addEventListener('click', () => {
    $<HTMLSelectElement>('#enquiry-bedroom').value = String(unit.bedrooms);
    $<HTMLInputElement>('#enquiry-floor').value = String(unit.floor);
    $('#form-status').textContent = `Residence ${unit.id} selected. Save a demo preference below; this does not reserve a home.`;
    $('#enquire').scrollIntoView({ behavior: motion.enabled() ? 'smooth' : 'instant' });
    $<HTMLSelectElement>('#enquiry-bedroom').focus({ preventScroll: true });
  });
  content.append(action);
  detail.append(plan, content);
  motion.swap(detail);
}
function renderUnits() {
  const units = filterUnits(unitsForFloor(floor), bedroomFilter.value, availabilityFilter.value);
  const list = $('#unit-list');
  list.replaceChildren();
  if (!units.some(unit => unit.id === selectedId)) selectedId = units[0]?.id ?? '';
  for (const unit of units) {
    const button = element('button', 'unit-row');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(unit.id === selectedId));
    const identity = element('span', 'unit-identity');
    identity.append(element('strong', '', unit.id), element('small', '', `${unit.bedrooms} BEDROOM${unit.bedrooms > 1 ? 'S' : ''}`));
    button.append(identity, element('span', 'unit-area', `${unit.area} m²`), element('span', `unit-status ${unit.status}`, unit.status === 'available' ? 'Available' : 'Reserved'), element('span', 'unit-arrow', '↗'));
    button.addEventListener('click', () => { selectedId = unit.id; renderUnits(); });
    list.append(button);
  }
  $('#unit-count').textContent = `${units.length} sample residence${units.length === 1 ? '' : 's'} on level ${floor}.`;
  const selected = units.find(unit => unit.id === selectedId);
  if (selected) showUnit(selected);
  else { $('#unit-detail').replaceChildren(element('p', 'empty-state', 'No residences match these filters. Try another level or reset your filters.')); }
}
function selectFloor(value: number, announce = true) {
  if (!validFloor(value)) return;
  floor = value;
  floorRange.value = String(value);
  $('#floor-value').textContent = String(value).padStart(2, '0');
  $('#level-title').textContent = String(value).padStart(2, '0');
  floorButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.floor) === value)));
  sceneSelection.textContent = `LEVEL ${value} SELECTED · EXPLORE RESIDENCES ↗`;
  if (announce) $('#scene-status').textContent = `Level ${value} selected. Residence details updated below.`;
  sceneApi?.selectFloor(value);
  renderUnits();
}
floorRange.addEventListener('input', () => selectFloor(Number(floorRange.value)));
bedroomFilter.addEventListener('change', renderUnits);
availabilityFilter.addEventListener('change', renderUnits);
$('#clear-filters').addEventListener('click', () => { bedroomFilter.value = 'all'; availabilityFilter.value = 'all'; renderUnits(); });
selectFloor(floor, false);

const cameraButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-view]')];
function setView(view: View) {
  sceneApi?.view(view);
  cameraButtons.forEach(button => { const active = button.dataset.view === view; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
}
cameraButtons.forEach(button => button.addEventListener('click', () => setView(button.dataset.view as View)));
$('#reset-view').addEventListener('click', () => setView('perspective'));
$('#auto-orbit').addEventListener('click', () => sceneApi?.orbit($('#auto-orbit').getAttribute('aria-pressed') !== 'true'));
function setLighting(mode: Lighting) {
  sceneApi?.lighting(mode);
  $('#home').dataset.atmosphere = mode;
  $('#cinema-dialog').dataset.atmosphere = mode;
  document.querySelectorAll<HTMLButtonElement>('[data-lighting]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.lighting === mode)));
  $('#scene-status').textContent = `${mode === 'blue-hour' ? 'Blue hour' : 'Daylight'} architectural lighting selected. This is an artistic lighting study.`;
}
document.querySelectorAll<HTMLButtonElement>('[data-lighting]').forEach(button => button.addEventListener('click', () => setLighting(button.dataset.lighting as Lighting)));
$('#zoom-in').addEventListener('click', () => sceneApi?.zoom(.87));
$('#zoom-out').addEventListener('click', () => sceneApi?.zoom(1.15));
$('#explore-3d').addEventListener('click', () => {
  setHeroMode('live');
  $('#home').scrollIntoView({ behavior: motion.enabled() ? 'smooth' : 'instant' });
  setView('aerial');
  $('#scene').querySelector('canvas')?.focus({ preventScroll: true });
  $('#scene-status').textContent = 'Aerial view. Use arrow keys to orbit and plus or minus to zoom. The residence selector below offers keyboard floor selection.';
});
$('#back-to-model').addEventListener('click', () => { residenceVisible = false; dockScene(); sceneApi?.selectFloor(floor); });

const gallery = createGallery(node => motion.swap(node));

import('./scene').then(({ createScene }) => {
  sceneApi = createScene($('#scene'), selectFloor, images => {
    gallery.updateStudies(images);
    $<HTMLImageElement>('.scene-standin img').src = images[0];
  }, enabled => {
    const button = $<HTMLButtonElement>('#auto-orbit');
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? 'Ⅱ  Pause orbit' : '↻  Auto orbit';
  }, () => tour?.pause());
  sceneReady = true;
  sceneApi.selectFloor(floor);
  sceneApi.motion(motion.enabled());
  document.querySelectorAll<HTMLButtonElement>('[data-lighting]').forEach(button => { button.disabled = false; });
  $<HTMLButtonElement>('#watch-film').disabled = false;
  $<HTMLButtonElement>('#residence-live-toggle').disabled = false;
  $<HTMLButtonElement>('#hero-live-mode').disabled = false;
  dockScene();
}).catch(() => {
  const host = $('#scene');
  host.classList.add('has-fallback'); host.replaceChildren(element('p', 'scene-fallback-message', 'Interactive 3D is unavailable on this device. Explore every level in the residence selector below.'));
  document.querySelectorAll<HTMLButtonElement>('.scene-toolbar button, [data-lighting], #auto-orbit').forEach(button => { button.disabled = true; });
  const explore = $<HTMLButtonElement>('#explore-3d'); explore.disabled = true; explore.textContent = '3D unavailable · explore residences below';
  $('#scene-status').textContent = '3D unavailable. The HTML residence selector remains fully functional.';
  sceneUnavailable();
});

const amenityData = {
  unwind: { kicker: 'YOUR PRIVATE HORIZON', title: 'Take the long way\nto sunset.', description: 'An imagined infinity-edge pool and open-air sky terrace. Somewhere to pause, look out, and let the city move without you.', features: ['Sky terrace & concept pool', 'Shaded lounge spaces', 'Landscaped outdoor decks'], label: 'THE SKY TERRACE / CONCEPT VISUAL' },
  restore: { kicker: 'FIND YOUR BALANCE', title: 'Make space\nfor yourself.', description: 'A considered wellness concept with spaces for movement, quiet reflection and everyday rituals. A gentler start, on your own terms.', features: ['Concept fitness studio', 'Quiet yoga & stretching deck', 'Garden walking spaces'], label: 'THE WELLNESS DECK / CONCEPT VISUAL' },
  connect: { kicker: 'BETTER, TOGETHER', title: 'Good company.\nGreat surroundings.', description: 'An imagined residents’ lounge brings shared moments into the everyday. Room for a conversation, a creative afternoon or simply a change of scene.', features: ['Residents’ social lounge', 'Flexible work & reading spaces', 'Shared garden seating'], label: 'THE RESIDENTS’ LOUNGE / CONCEPT VISUAL' },
};
const amenityTabs = [...document.querySelectorAll<HTMLButtonElement>('[data-amenity]')];
function chooseAmenity(tab: HTMLButtonElement) {
  const key = tab.dataset.amenity as keyof typeof amenityData;
  const data = amenityData[key];
  amenityTabs.forEach(button => { button.setAttribute('aria-selected', String(button === tab)); button.tabIndex = button === tab ? 0 : -1; });
  $('#amenity-content').setAttribute('aria-labelledby', tab.id);
  $('#amenity-kicker').textContent = data.kicker; $('#amenity-title').textContent = data.title; $('#amenity-description').textContent = data.description;
  $('#amenity-features').replaceChildren(...data.features.map(text => element('li', '', text)));
  void amenityVisual.select(key); $('.art-label').textContent = data.label;
  motion.swap($('.amenity-copy'));
}
amenityTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => chooseAmenity(tab));
  tab.addEventListener('keydown', event => {
    let target: HTMLButtonElement | undefined;
    if (event.key === 'ArrowRight') target = amenityTabs[(index + 1) % amenityTabs.length];
    if (event.key === 'ArrowLeft') target = amenityTabs[(index + amenityTabs.length - 1) % amenityTabs.length];
    if (event.key === 'Home') target = amenityTabs[0];
    if (event.key === 'End') target = amenityTabs.at(-1);
    if (target) { event.preventDefault(); chooseAmenity(target); target.focus(); }
  });
});
const locationCopy: Record<string, string> = {
  coast: 'Colombo’s coastal character inspires the concept’s open terraces and blue palette. No sea view or distance to the coast is promised.',
  culture: 'A city of varied architectural traditions, markets and public spaces inspires this fictional setting. No affiliation with local venues is implied.',
  connection: 'The map is a broad area overview for exploration. No exact plot, transport route, travel time or proximity claim is attached to this concept.',
};
document.querySelectorAll<HTMLButtonElement>('[data-location]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll<HTMLButtonElement>('[data-location]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  $('#location-information').textContent = locationCopy[button.dataset.location!];
  motion.swap($('#location-information'));
}));
let map: import('leaflet').Map | undefined;
$('#load-map').addEventListener('click', async () => {
  const button = $<HTMLButtonElement>('#load-map');
  button.disabled = true; button.textContent = 'Loading area map…';
  try {
    const L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    $('#map').replaceChildren();
    map = L.map('map', { scrollWheelZoom: false, minZoom: 10, maxZoom: 16, zoomControl: true }).setView(demoConfig.map.center, demoConfig.map.zoom);
    const tiles = L.tileLayer(demoConfig.map.tileUrl, { attribution: demoConfig.map.attribution, maxZoom: 19, updateWhenIdle: true, keepBuffer: 1 });
    let failed = false;
    tiles.on('tileerror', () => { failed = true; $('#map-status').textContent = 'Some map tiles could not load. Check your connection or try again later. This is an area overview, not a project location.'; });
    tiles.on('load', () => { if (!failed) $('#map-status').textContent = 'Colombo area map loaded. No project marker is shown.'; });
    tiles.addTo(map);
    const report = element('a', 'map-report', 'Report a map issue ↗'); report.href = 'https://www.openstreetmap.org/fixthemap'; report.target = '_blank'; report.rel = 'noopener noreferrer'; $('.map-wrap').append(report);
    map.getContainer().focus();
  } catch {
    $('#map-status').textContent = 'The map could not load. Please check your connection and try again.';
    if (button.isConnected) { button.disabled = false; button.textContent = 'Retry area map ↗'; }
  }
});

const form = $<HTMLFormElement>('#enquiry-form');
try {
  const saved = localStorage.getItem(demoConfig.storageKey);
  if (saved) {
    const preference = parsePreference(JSON.parse(saved));
    if (preference) {
      $<HTMLSelectElement>('#enquiry-bedroom').value = String(preference.bedrooms);
      $<HTMLInputElement>('#enquiry-floor').value = String(preference.floor);
      (form.elements.namedItem('priority') as HTMLSelectElement).value = preference.priority;
      $('#form-status').textContent = 'Your demo preference is saved on this device. Nothing has been sent.';
    }
  }
} catch { $('#form-status').textContent = 'Local storage is unavailable or the saved preference could not be read. You can still explore.'; }
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const preference = parsePreference({ bedrooms: Number(data.get('bedrooms')), floor: Number(data.get('floor')), priority: data.get('priority') });
  if (!preference || data.get('consent') !== 'on') { $('#form-status').textContent = 'Choose a valid collection and a whole-number level from 1 to 32, then confirm local-only saving.'; return; }
  try { localStorage.setItem(demoConfig.storageKey, JSON.stringify(preference)); $('#form-status').textContent = `Demo preference saved on this device: ${preference.bedrooms} bedroom${preference.bedrooms > 1 ? 's' : ''}, level ${preference.floor}. No enquiry was submitted and no home was reserved.`; }
  catch { $('#form-status').textContent = 'Your browser blocked local storage. Nothing was saved or sent.'; }
});
$('#clear-preference').addEventListener('click', () => {
  try { localStorage.removeItem(demoConfig.storageKey); form.reset(); $('#form-status').textContent = 'Saved demo preference cleared from this device. Nothing was sent.'; }
  catch { $('#form-status').textContent = 'Your browser blocked access to local storage. The saved preference could not be cleared.'; }
});
const verifiedContact = contactLink(demoConfig.contact);
if (verifiedContact) { const contact = $<HTMLAnchorElement>('#contact-action'); contact.href = verifiedContact; contact.hidden = false; contact.rel = 'noopener noreferrer'; }

const menu = $<HTMLButtonElement>('.menu-button');
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); $('.site-header').classList.remove('nav-open'); }
menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); $('.site-header').classList.toggle('nav-open', open); });
$('#navigation').querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
document.addEventListener('click', event => { if (event.target instanceof Node && !$('.site-header').contains(event.target)) closeMenu(); });
$('#year').textContent = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Colombo' }).format(new Date());
window.addEventListener('pagehide', event => { if (!event.persisted) { residenceObserver.disconnect(); tour?.dispose(); gallery.dispose(); amenityVisual.dispose(); motion.dispose(); sceneApi?.dispose(); map?.remove(); gsap.globalTimeline.clear(); } });
