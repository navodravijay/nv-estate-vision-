import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { chapters } from './cinema';
import type { Chapter } from './cinema';
import { createPalmFrond, createSurfaces, randomSequence } from './surfaces';

export type View = 'perspective' | 'facade' | 'aerial';
export type Lighting = 'daylight' | 'blue-hour';
export type SceneApi = { selectFloor: (floor: number) => void; view: (view: View) => void; shot: (chapter: Chapter) => void; hold: () => void; lighting: (mode: Lighting) => void; motion: (enabled: boolean) => void; orbit: (enabled: boolean) => void; zoom: (factor: number) => void; dispose: () => void };
const positions: Record<View, [number, number, number]> = { perspective: [31, 20, 37], facade: [0, 13, 44], aerial: [27, 35, 29] };

export function createScene(host: HTMLElement, onFloor: (floor: number) => void, onGallery: (images: string[]) => void, onOrbitChange: (enabled: boolean) => void = () => {}, onCameraInteraction: () => void = () => {}): SceneApi {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionPreference = true;
  let motionAllowed = !reduced.matches;
  let cameraInteracted = false;
  let introductionPending = true;
  let autoOrbit = false;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#80909b', .012);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const surfaces = createSurfaces();
  // An original painted sky becomes a small, local reflection environment.
  // No HDR download, another renderer, or persistent animation is needed.
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024; skyCanvas.height = 512;
  const skyContext = skyCanvas.getContext('2d');
  let environment: THREE.WebGLRenderTarget | undefined;
  if (skyContext) {
    const gradient = skyContext.createLinearGradient(0, 0, 0, 512);
    [[0, '#37628b'], [.38, '#8eaebf'], [.49, '#eddac4'], [.53, '#75868a'], [1, '#172932']].forEach(([stop, color]) => gradient.addColorStop(stop as number, color as string));
    skyContext.fillStyle = gradient; skyContext.fillRect(0, 0, 1024, 512);
    const skyRandom = randomSequence(310);
    for (let i = 0; i < 70; i++) {
      skyContext.fillStyle = '#f3eee718'; skyContext.beginPath();
      skyContext.ellipse(skyRandom() * 1024, 90 + skyRandom() * 125, 25 + skyRandom() * 100, 3 + skyRandom() * 13, -.1, 0, Math.PI * 2); skyContext.fill();
    }
    for (let i = 0; i < 60; i++) {
      const height = 8 + skyRandom() * 55;
      skyContext.fillStyle = i % 2 ? '#263c49' : '#435765';
      skyContext.fillRect(i * 18, 281 - height, 11 + skyRandom() * 12, height);
    }
    const glow = skyContext.createRadialGradient(720, 205, 3, 720, 205, 120);
    glow.addColorStop(0, '#fff0d9'); glow.addColorStop(1, '#fff0d900');
    skyContext.fillStyle = glow; skyContext.fillRect(590, 70, 260, 270);
    const texture = new THREE.CanvasTexture(skyCanvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    const generator = new THREE.PMREMGenerator(renderer);
    const reflectionScene = new THREE.Scene();
    const skyGeometry = new THREE.SphereGeometry(100, 32, 16);
    const skyMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, toneMapped: false });
    reflectionScene.add(new THREE.Mesh(skyGeometry, skyMaterial));
    const sunGeometry = new THREE.SphereGeometry(3.5, 12, 8);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.1, 3.2), toneMapped: false });
    const reflectedSun = new THREE.Mesh(sunGeometry, sunMaterial); reflectedSun.position.set(-50, 65, 40); reflectionScene.add(reflectedSun);
    environment = generator.fromScene(reflectionScene, .045, .1, 250);
    scene.environment = environment.texture;
    scene.environmentIntensity = .85;
    texture.dispose(); generator.dispose();
    skyGeometry.dispose(); skyMaterial.dispose(); sunGeometry.dispose(); sunMaterial.dispose();
  }
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interactive Skyline tower. Arrow keys orbit, plus and minus zoom. Use the floor selector below for keyboard floor selection.');
  host.querySelector('.scene-loading')?.remove();
  host.append(canvas);
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 180);
  if (motionAllowed) camera.position.set(35.5, 22, 42);
  else camera.position.set(...positions.perspective);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 10.7, 0);
  controls.enableDamping = !reduced.matches;
  controls.dampingFactor = .09;
  controls.enablePan = false;
  controls.enableZoom = false; // Explicit buttons / pinch avoid stealing page scroll.
  controls.minDistance = 25;
  controls.maxDistance = 72;
  controls.maxPolarAngle = Math.PI * .49;
  controls.minPolarAngle = .22;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  controls.autoRotateSpeed = .4;
  const ambient = new THREE.HemisphereLight('#cbdceb', '#414e42', 1.2);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight('#ffe3b4', 3.2);
  sun.position.set(-20, 34, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(innerWidth > 760 ? 1536 : 1024, innerWidth > 760 ? 1536 : 1024);
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 30, bottom: -25 });
  sun.shadow.bias = -.001;
  sun.shadow.normalBias = .015;
  scene.add(sun);
  const rim = new THREE.DirectionalLight('#b4d3eb', .75);
  rim.position.set(12, 18, -15);
  scene.add(rim);
  const concrete = new THREE.MeshStandardMaterial({ color: '#b4afa0', map: surfaces.concrete, bumpMap: surfaces.concreteBump, bumpScale: .008, roughness: .83, metalness: .025 });
  const edge = new THREE.MeshStandardMaterial({ color: '#a8aaa2', map: surfaces.concrete, bumpMap: surfaces.concreteBump, bumpScale: .004, roughness: .7, metalness: .08 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#78949e', metalness: .78, roughness: .1, clearcoat: 1, envMapIntensity: 1.35, normalMap: surfaces.glassNormal, normalScale: new THREE.Vector2(.16, .16) });
  const rail = new THREE.MeshPhysicalMaterial({ color: '#b6d0d2', metalness: .12, roughness: .08, transparent: true, opacity: .23, depthWrite: false, envMapIntensity: 1.2, clearcoat: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: '#233035', roughness: .7 });
  const groundMat = new THREE.MeshStandardMaterial({ color: '#6c736c', map: surfaces.paving, roughness: 1 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5a5140' });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', map: surfaces.leaves, alphaTest: .4, alphaToCoverage: true, side: THREE.DoubleSide, roughness: .98 });
  const bronze = new THREE.MeshStandardMaterial({ color: '#87745b', metalness: .65, roughness: .4 });
  const stone = new THREE.MeshStandardMaterial({ color: '#a09f91', map: surfaces.concrete, bumpMap: surfaces.concreteBump, bumpScale: .012, roughness: .92 });
  const water = new THREE.MeshPhysicalMaterial({ color: '#3e8893', metalness: .35, roughness: .12, clearcoat: 1, normalMap: surfaces.waterNormal, normalScale: new THREE.Vector2(.22, .22), envMapIntensity: 1.4 });
  const architecturalLight = new THREE.MeshStandardMaterial({ color: '#d8b47b', emissive: '#ffd49b', emissiveIntensity: .2 });
  function box(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  const ground = box(160, .15, 160, 0, -.6, 0, groundMat);
  ground.castShadow = false;
  box(18, .45, 13, 0, -.25, 0, concrete);
  box(16, .35, 11, 0, .15, 0, dark);
  box(12.2, 1.35, 8.3, 0, .85, 0, glass);
  box(15, .2, 10, 0, 1.6, 0, edge);
  // Entry colonnade, floating canopy and podium water garden.
  for (const x of [-5, -2.5, 0, 2.5, 5]) box(.16, 1.5, .16, x, .7, 4.6, edge);
  box(10, .12, 2.6, 0, 1.35, 4.8, concrete);
  // A roof-level water garden is visible from the aerial and arrival views.
  box(3.3, .1, 7.3, 5.65, 1.73, -.2, stone);
  box(3.0, .06, 7, 5.65, 1.8, -.2, water);
  box(3.3, .035, .035, 5.65, 1.82, 3.46, architecturalLight);
  const cushion = new THREE.MeshStandardMaterial({ color: '#d9d0ba', roughness: .92 });
  for (const x of [4.35, 5.55, 6.75]) {
    box(.7, .09, 1.35, x, 1.85, 4.1, bronze);
    box(.65, .1, 1.27, x, 1.95, 4.1, cushion);
    const backrest = box(.65, .09, .48, x, 2.08, 3.7, cushion); backrest.rotation.x = -.35;
  }
  box(10, .035, .045, 0, 1.27, 6.05, architecturalLight);
  // Stepped arrival, paving joints and low garden walls ground the composition.
  for (let i = 0; i < 3; i++) box(8.8 + i * .8, .12, .6, 0, -.09 - i * .12, 6.65 + i * .6, stone);
  for (let i = 0; i < 12; i++) box(.025, .012, 5, -7.6 + i * 1.4, -.514, 10.8, dark).castShadow = false;
  for (const x of [-8, 8]) {
    box(.3, .45, 10, x, -.16, -.1, stone);
    box(.32, .035, 10.05, x, .08, -.1, concrete);
  }
  const floors: THREE.Mesh[] = [];
  const slabs: THREE.Mesh[] = [];
  const slabGeometry = new THREE.BoxGeometry(7.3, .085, 5.8);
  const glassGeometry = new THREE.BoxGeometry(6.5, .56, 5.02);
  const railGeometry = new THREE.BoxGeometry(7.1, .21, .04);
  const sideRailGeometry = new THREE.BoxGeometry(.04, .21, 5.6);
  for (let i = 0; i < 32; i++) {
    const y = 1.8 + i * .65;
    const shift = i >= 26 ? -.42 : 0;
    const slab = new THREE.Mesh(slabGeometry, edge.clone());
    slab.position.set(shift, y, 0);
    slab.castShadow = true;
    slab.receiveShadow = true;
    slab.userData.floor = i + 1;
    scene.add(slab);
    slabs.push(slab);
    const glazing = new THREE.Mesh(glassGeometry, glass);
    glazing.position.set(shift, y + .34, 0);
    glazing.userData.floor = i + 1;
    scene.add(glazing);
    floors.push(glazing);
    for (const z of [-2.8, 2.8]) {
      const balcony = new THREE.Mesh(railGeometry, rail);
      balcony.position.set(shift, y + .17, z);
      scene.add(balcony);
    }
    for (const x of [-3.53, 3.53]) {
      const balcony = new THREE.Mesh(sideRailGeometry, rail);
      balcony.position.set(shift + x, y + .17, 0);
      scene.add(balcony);
    }
    // A stepped, lower companion volume gives the tower an articulated silhouette.
    if (i < 23) {
      box(2.2, .11, 4.5, -4.45, y, -.8, edge);
      const wing = box(1.9, .56, 4.1, -4.45, y + .34, -.8, glass);
      wing.userData.floor = i + 1;
      floors.push(wing);
    }
  }
  // Batch facade mullions and lit windows into two inexpensive instanced draws.
  const frames = new THREE.MeshStandardMaterial({ color: '#4c5554', metalness: .72, roughness: .33 });
  const mullions = new THREE.InstancedMesh(new THREE.BoxGeometry(.035, .57, .045), frames, 32 * 28);
  const warm = new THREE.MeshStandardMaterial({ color: '#c0bba9', map: surfaces.room, emissiveMap: surfaces.room, emissive: '#ffd29a', emissiveIntensity: .04, roughness: .38, metalness: .1 });
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(.69, .48), warm, 32 * 20);
  const roomRandom = randomSequence(773);
  const dummy = new THREE.Object3D();
  let m = 0, w = 0;
  for (let i = 0; i < 32; i++) {
    const shift = i >= 26 ? -.42 : 0;
    for (let j = 0; j < 8; j++) {
      for (const z of [-2.54, 2.54]) {
        dummy.position.set(shift - 3.12 + j * .89, 2.14 + i * .65, z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mullions.setMatrixAt(m++, dummy.matrix);
      }
      if (roomRandom() > .76) {
        dummy.position.set(shift - 2.7 + j * .75, 2.12 + i * .65, 2.523);
        dummy.updateMatrix();
        windows.setMatrixAt(w++, dummy.matrix);
        windows.setColorAt(w - 1, new THREE.Color().setHSL(.09 + roomRandom() * .04, .08 + roomRandom() * .15, .5 + roomRandom() * .35));
      }
    }
    for (let j = 0; j < 6; j++) {
      for (const side of [-1, 1]) {
        dummy.position.set(shift + side * 3.26, 2.14 + i * .65, -2.18 + j * .87);
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.updateMatrix();
        mullions.setMatrixAt(m++, dummy.matrix);
        if (roomRandom() > .76) {
          dummy.position.set(shift + side * 3.257, 2.12 + i * .65, -1.9 + j * .72);
          dummy.rotation.y = side * Math.PI / 2;
          dummy.updateMatrix();
          windows.setMatrixAt(w++, dummy.matrix);
          windows.setColorAt(w - 1, new THREE.Color().setHSL(.1, .08, .55 + roomRandom() * .3));
        }
      }
    }
  }
  mullions.count = m;
  windows.count = w;
  scene.add(mullions, windows);
  for (const x of [-3.25, 3.25]) box(.17, 20.85, .2, x, 12.1, 2.55, concrete);
  box(7.5, .25, 6, -.42, 22.7, 0, edge);
  box(4.7, .7, 3.5, -.42, 23.12, -.5, glass);
  // An open crown pergola lets the film reveal the lounge and planted terrace.
  for (let i = 0; i < 9; i++) box(.12, .15, 4.7, -3.42 + i * .75, 23.55, -.5, bronze);
  for (const z of [-2.85, 1.85]) box(6.2, .15, .12, -.42, 23.55, z, edge);
  box(6.2, .035, .035, -.42, 23.45, 1.87, architecturalLight);
  for (const x of [-2.55, 1.7]) {
    box(.55, .11, 1.5, x, 22.96, 1.95, bronze);
    box(.5, .12, 1.4, x, 23.07, 1.95, cushion);
  }
  for (const z of [-2.72, 2.72]) box(7.1, .28, .035, -.42, 22.98, z, rail);
  // Planted companion terrace with a bronze pergola and shaded seating.
  box(2.25, .14, 4.55, -4.45, 16.84, -.8, stone);
  for (const x of [-5.4, -3.5]) for (const z of [-2.8, 1.2]) box(.065, 1.1, .065, x, 17.42, z, bronze);
  for (let j = 0; j < 8; j++) box(.09, .1, 4.6, -5.4 + j * .27, 17.98, -.8, bronze);
  box(1.45, .12, .48, -4.45, 17.15, .7, bronze);
  box(1.5, .3, .5, -4.45, 17, -2.6, concrete);
  const shrubPositions: [number, number, number][] = [];
  for (let i = 0; i < 7; i++) shrubPositions.push([-5.05 + i * .2, 17.25, -2.6]);
  for (const z of [-2.2, 1.8]) {
    box(.55, .3, 1.1, -3.1, 22.98, z, concrete);
    shrubPositions.push([-3.1, 23.25, z - .27], [-3.1, 23.25, z + .27]);
  }
  for (const x of [-6.65, 7.25]) {
    box(.45, .28, 7.8, x, 1.82, -.25, concrete);
    for (let i = 0; i < 15; i++) shrubPositions.push([x, 2.05, -3.8 + i * .5]);
  }
  const shrubs = new THREE.InstancedMesh(new THREE.SphereGeometry(.3, 10, 8), leafMaterial, shrubPositions.length);
  shrubPositions.forEach((position, index) => { dummy.position.set(...position); dummy.rotation.set(0, index * .7, 0); dummy.scale.set(1, .9 + index % 3 * .12, 1); dummy.updateMatrix(); shrubs.setMatrixAt(index, dummy.matrix); });
  shrubs.castShadow = true; scene.add(shrubs);
  dummy.scale.set(1, 1, 1);
  const foliageGeometry = new THREE.PlaneGeometry(1.05, 1.05);
  const trunkGeometry = new THREE.CylinderGeometry(.055, .12, 2.5, 7);
  const trees = new THREE.InstancedMesh(foliageGeometry, leafMaterial, 22 * 24);
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMat, 22);
  const branches = new THREE.InstancedMesh(new THREE.CylinderGeometry(.02, .055, 1.2, 5), trunkMat, 22 * 3);
  trees.castShadow = true; trunks.castShadow = true;
  branches.castShadow = true;
  const landscapeRandom = randomSequence(641);
  for (let i = 0; i < 22; i++) {
    const angle = i * 2.399;
    const r = i < 12 ? 9.8 : 13 + (i % 3);
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r * .65;
    dummy.position.set(x, .73, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    for (let branch = 0; branch < 3; branch++) {
      const angle = i + branch * Math.PI * 2 / 3;
      dummy.position.set(x + Math.sin(angle) * .24, 1.7, z + Math.cos(angle) * .24);
      dummy.rotation.set(Math.cos(angle) * .5, 0, -Math.sin(angle) * .5); dummy.updateMatrix();
      branches.setMatrixAt(i * 3 + branch, dummy.matrix);
    }
    for (let leaf = 0; leaf < 24; leaf++) {
      const theta = landscapeRandom() * Math.PI * 2, height = landscapeRandom() * 2 - 1;
      const radius = .65 + landscapeRandom() * .25;
      dummy.position.set(x + Math.cos(theta) * radius * Math.sqrt(1 - height * height), 2.3 + height * radius, z + Math.sin(theta) * radius * Math.sqrt(1 - height * height));
      dummy.rotation.set(landscapeRandom() * Math.PI, landscapeRandom() * Math.PI * 2, landscapeRandom() * Math.PI);
      const size = .75 + landscapeRandom() * .5;
      dummy.scale.set(size, size, size); dummy.updateMatrix();
      trees.setMatrixAt(i * 24 + leaf, dummy.matrix);
      trees.setColorAt(i * 24 + leaf, new THREE.Color(.72 + landscapeRandom() * .25, .83 + landscapeRandom() * .17, .7 + landscapeRandom() * .25));
    }
  }
  scene.add(trees, trunks, branches);
  const palmLocations = [[-8.3, 4.3], [8.8, 4], [-7.8, -5.1], [7.9, -5.2]];
  const palmTrunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.06, .11, 3.4, 8), trunkMat, palmLocations.length);
  const palmMaterial = new THREE.MeshStandardMaterial({ color: '#365e3e', roughness: .95, side: THREE.DoubleSide });
  const fronds = new THREE.InstancedMesh(createPalmFrond(), palmMaterial, palmLocations.length * 10);
  palmLocations.forEach(([x, z], index) => {
    dummy.position.set(x, 1.18, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); palmTrunks.setMatrixAt(index, dummy.matrix);
    for (let leaf = 0; leaf < 10; leaf++) {
      dummy.position.set(x, 2.91 + leaf % 2 * .08, z); dummy.rotation.set(0, leaf * Math.PI * .2 + index, (leaf % 3 - 1) * .1);
      const scale = .85 + landscapeRandom() * .3; dummy.scale.set(scale, scale, scale); dummy.updateMatrix(); fronds.setMatrixAt(index * 10 + leaf, dummy.matrix);
    }
  });
  palmTrunks.castShadow = true; fronds.castShadow = true; scene.add(palmTrunks, fronds);
  // Distant original context is deliberately not a reconstruction of Colombo.
  const contextMaterial = new THREE.MeshStandardMaterial({ color: '#9cabad', map: surfaces.city, roughness: .92 });
  const cityRandom = randomSequence(2451);
  for (let i = 0; i < 52; i++) {
    const x = (i - 26) * 3.1, z = -44 - cityRandom() * 35;
    const width = 1.8 + cityRandom() * 4, height = 3 + cityRandom() ** 2 * 25;
    box(width, height, 2.8 + cityRandom() * 3, x, height / 2 - .6, z, contextMaterial).castShadow = false;
  }
  let activeFloor = 18;
  let hoveredFloor: number | undefined;
  const focusMaterial = new THREE.LineBasicMaterial({ color: '#7ce8ff', transparent: true, opacity: 0, depthWrite: false });
  const floorFocus = new THREE.LineSegments(new THREE.EdgesGeometry(slabGeometry), focusMaterial);
  floorFocus.visible = false; scene.add(floorFocus);
  const lightingState = { dusk: 0 };
  const cameraFlight = { progress: 0 };
  const daylightGround = new THREE.Color('#6c736c'), duskGround = new THREE.Color('#263338');
  const daylightFog = new THREE.Color('#80909b'), duskFog = new THREE.Color('#122337');
  function paintFloors(includeSelection = true) {
    slabs.forEach((slab, i) => {
      const selected = includeSelection && i + 1 === activeFloor;
      const hovered = includeSelection && i + 1 === hoveredFloor;
      const material = slab.material as THREE.MeshStandardMaterial;
      material.color.set(selected ? '#4de0ff' : hovered ? '#9ad5e7' : '#a8aaa2');
      material.emissive.set(selected ? '#1d80aa' : hovered ? '#225d79' : '#000000');
      material.emissiveIntensity = selected ? .8 : .35;
    });
  }
  function updateLighting() {
    const t = lightingState.dusk;
    ambient.intensity = THREE.MathUtils.lerp(1.2, .4, t);
    sun.intensity = THREE.MathUtils.lerp(3.2, .22, t);
    rim.intensity = THREE.MathUtils.lerp(.75, 1.05, t);
    warm.emissiveIntensity = THREE.MathUtils.lerp(.04, 1.65, t);
    architecturalLight.emissiveIntensity = THREE.MathUtils.lerp(.2, 3.5, t);
    scene.environmentIntensity = THREE.MathUtils.lerp(.85, .32, t);
    groundMat.color.copy(daylightGround).lerp(duskGround, t);
    scene.fog!.color.copy(daylightFog).lerp(duskFog, t);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(1.05, 1.12, t);
    invalidate();
  }
  let frame = 0, visible = true, disposed = false, contextLost = false;
  let lastRender = performance.now();
  // All shadow-casting architecture is static; camera movement can reuse shadows.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  function invalidate() {
    if (!frame && visible && !document.hidden && !disposed && !contextLost) frame = requestAnimationFrame(render);
  }
  function render(time: number) {
    frame = 0;
    const delta = Math.min((time - lastRender) / 1000, .05);
    lastRender = time;
    controls.update(delta);
    renderer.render(scene, camera);
    if (autoOrbit && motionAllowed && controls.enabled) invalidate();
  }
  function setOrbit(enabled: boolean) {
    const next = enabled && motionAllowed && !contextLost && !disposed;
    if (next) {
      cameraInteracted = true; introductionPending = false;
      gsap.killTweensOf([camera.position, cameraFlight]); controls.enabled = true;
      clearHover();
    }
    controls.autoRotate = next;
    if (autoOrbit !== next) { autoOrbit = next; onOrbitChange(next); }
    lastRender = performance.now(); invalidate();
  }
  function takeCameraControl(notify = true) {
    cameraInteracted = true; introductionPending = false;
    setOrbit(false); gsap.killTweensOf([camera.position, cameraFlight]);
    controls.enabled = !contextLost;
    if (notify) onCameraInteraction();
  }
  function hold() {
    gsap.killTweensOf([camera.position, cameraFlight]);
    controls.enabled = !contextLost;
    invalidate();
  }
  function moveCamera(position: readonly number[], target: readonly number[], fov: number, duration: number, normalView: boolean) {
    takeCameraControl(false); clearHover();
    controls.minDistance = 12;
    controls.enabled = false;
    const start = camera.position.clone(), finish = new THREE.Vector3(position[0], position[1], position[2]);
    const midpoint = start.clone().lerp(finish, .5).add(new THREE.Vector3(3, 1.5, 3));
    const curve = new THREE.CatmullRomCurve3([start, midpoint, finish]);
    const startTarget = controls.target.clone(), endTarget = new THREE.Vector3(target[0], target[1], target[2]);
    const startFov = camera.fov;
    cameraFlight.progress = 0;
    gsap.to(cameraFlight, {
      progress: 1, duration: motionAllowed ? duration : 0, ease: 'power2.inOut',
      onUpdate: () => {
        const t = cameraFlight.progress;
        camera.position.copy(curve.getPoint(t)); controls.target.lerpVectors(startTarget, endTarget, t);
        camera.fov = THREE.MathUtils.lerp(startFov, fov, t); camera.updateProjectionMatrix();
        camera.lookAt(controls.target); invalidate();
      },
      onComplete: () => { controls.minDistance = normalView ? 25 : 12; controls.enabled = true; controls.update(); invalidate(); },
    });
    syncActivity();
  }
  function syncActivity() {
    const active = visible && !document.hidden;
    gsap.getTweensOf([camera.position, cameraFlight, lightingState, focusMaterial, floorFocus.scale]).forEach(tween => tween.paused(!active));
    lastRender = performance.now();
    if (active) invalidate();
    else { clearHover(); cancelAnimationFrame(frame); frame = 0; }
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (width <= 0 || height <= 0) { visible = false; return; }
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    invalidate();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    syncActivity();
  });
  intersection.observe(host);
  const visibility = syncActivity;
  document.addEventListener('visibilitychange', visibility);
  controls.addEventListener('change', invalidate);
  const interactionStart = () => takeCameraControl();
  controls.addEventListener('start', interactionStart);
  const raycaster = new THREE.Raycaster();
  const tooltip = document.createElement('div');
  tooltip.className = 'floor-tooltip'; tooltip.hidden = true;
  tooltip.setAttribute('aria-hidden', 'true');
  host.append(tooltip);
  function floorAt(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), camera);
    return raycaster.intersectObjects([...floors, ...slabs])[0]?.object.userData.floor as number | undefined;
  }
  function clearHover() {
    if (hoveredFloor !== undefined) { hoveredFloor = undefined; paintFloors(); invalidate(); }
    tooltip.hidden = true; canvas.style.cursor = '';
  }
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || event.buttons || !controls.enabled || contextLost) { clearHover(); return; }
    const level = floorAt(event.clientX, event.clientY);
    if (hoveredFloor !== level) { hoveredFloor = level; paintFloors(); invalidate(); }
    tooltip.hidden = level === undefined;
    canvas.style.cursor = level === undefined ? '' : 'pointer';
    if (level !== undefined) {
      const rect = host.getBoundingClientRect();
      tooltip.textContent = `LEVEL ${String(level).padStart(2, '0')} · CLICK TO EXPLORE`;
      tooltip.style.transform = `translate(${Math.max(12, Math.min(event.clientX - rect.left + 18, rect.width - 215))}px, ${Math.max(12, event.clientY - rect.top - 42)}px)`;
    }
  });
  canvas.addEventListener('pointerleave', clearHover);
  let downX = 0, downY = 0;
  canvas.addEventListener('pointerdown', event => { clearHover(); downX = event.clientX; downY = event.clientY; });
  canvas.addEventListener('pointerup', event => {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 6) return;
    if (!controls.enabled || contextLost) return;
    const level = floorAt(event.clientX, event.clientY);
    if (level !== undefined) onFloor(level);
  });
  function zoom(factor: number) {
    if (contextLost || disposed) return;
    takeCameraControl();
    const delta = camera.position.clone().sub(controls.target);
    const distance = THREE.MathUtils.clamp(delta.length() * factor, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(delta.normalize().multiplyScalar(distance));
    invalidate();
  }
  canvas.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) {
      event.preventDefault();
      takeCameraControl();
      if (['+', '=', '-'].includes(event.key)) zoom(event.key === '-' ? 1.12 : .89);
      else {
        const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
        if (event.key === 'ArrowLeft') spherical.theta -= .1;
        if (event.key === 'ArrowRight') spherical.theta += .1;
        if (event.key === 'ArrowUp') spherical.phi -= .08;
        if (event.key === 'ArrowDown') spherical.phi += .08;
        spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
        camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
        invalidate();
      }
    }
  });
  // Pinch only: keep one-finger vertical page scrolling available on touch screens.
  let pinchDistance = 0;
  canvas.addEventListener('touchstart', e => { if (e.touches.length === 2) pinchDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (e.touches.length !== 2 || !pinchDistance) return;
    const distance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    zoom(pinchDistance / Math.max(distance, 1));
    pinchDistance = distance;
  }, { passive: true });
  function setMotion(enabled: boolean) {
    motionPreference = enabled;
    motionAllowed = enabled && !reduced.matches;
    controls.enableDamping = motionAllowed;
    const orbitButton = document.querySelector<HTMLButtonElement>('#auto-orbit');
    if (orbitButton) orbitButton.disabled = !motionAllowed || contextLost;
    if (!motionAllowed) {
      setOrbit(false);
      gsap.killTweensOf([camera.position, cameraFlight, focusMaterial, floorFocus.scale]);
      gsap.getTweensOf(lightingState).forEach(tween => tween.progress(1));
      floorFocus.visible = false;
      if (introductionPending && !cameraInteracted) camera.position.set(...positions.perspective);
      controls.enabled = !contextLost;
    }
    invalidate();
  }
  const motionChange = () => setMotion(motionPreference);
  reduced.addEventListener('change', motionChange);
  const fallback = () => {
    contextLost = true;
    setOrbit(false);
    cancelAnimationFrame(frame); frame = 0;
    gsap.killTweensOf([camera.position, cameraFlight]);
    gsap.killTweensOf([lightingState, focusMaterial, floorFocus.scale]);
    controls.enabled = false;
    tooltip.hidden = true;
    host.classList.add('has-fallback');
    canvas.hidden = true;
    const message = document.createElement('p');
    message.className = 'scene-fallback-message';
    message.setAttribute('role', 'status');
    message.textContent = '3D rendering is unavailable. Explore all levels using the residence selector below.';
    host.append(message);
    document.querySelectorAll<HTMLButtonElement>('.scene-toolbar button, [data-lighting], #auto-orbit, #watch-film, #residence-live-toggle').forEach(button => { button.disabled = true; });
    const explore = document.querySelector<HTMLButtonElement>('#explore-3d');
    if (explore) { explore.disabled = true; explore.textContent = '3D unavailable · explore residences below'; }
    host.dispatchEvent(new CustomEvent('sceneunavailable'));
  };
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); });
  resize();
  controls.update();
  // Capture original architectural gallery renders without another WebGL context.
  const galleryTimeout = window.setTimeout(() => {
    if (disposed || contextLost) return;
    const savedPosition = camera.position.clone();
    const savedAspect = camera.aspect;
    const savedPixelRatio = renderer.getPixelRatio();
    const savedLighting = lightingState.dusk;
    const images: string[] = [];
    try {
      renderer.setPixelRatio(1); renderer.setSize(1200, 1000, false);
      camera.aspect = 1.2;
      camera.updateProjectionMatrix();
      paintFloors(false);
      for (const view of ['perspective', 'facade', 'aerial'] as View[]) {
        lightingState.dusk = view === 'facade' ? 1 : 0; updateLighting();
        camera.position.set(...positions[view]);
        camera.lookAt(controls.target);
        renderer.render(scene, camera);
        images.push(canvas.toDataURL('image/webp', .9));
      }
      onGallery(images);
    } catch { /* The original vector study remains available. */ }
    finally {
      camera.position.copy(savedPosition);
      camera.aspect = savedAspect;
      lightingState.dusk = savedLighting; updateLighting();
      renderer.setPixelRatio(savedPixelRatio);
      paintFloors();
      resize();
      controls.update();
      invalidate();
      if (introductionPending && !cameraInteracted) {
        introductionPending = false;
        if (motionAllowed && visible && !document.hidden) {
          const [x, y, z] = positions.perspective;
          gsap.to(camera.position, { x, y, z, duration: 1.7, ease: 'power3.out', onUpdate: invalidate });
        } else { camera.position.set(...positions.perspective); invalidate(); }
      }
    }
  }, 350);
  return {
    selectFloor(floor) {
      const changed = activeFloor !== floor;
      if (changed) onCameraInteraction();
      setOrbit(false);
      activeFloor = floor;
      paintFloors();
      if (changed && motionAllowed && visible && !document.hidden && !contextLost) {
        const slab = slabs[floor - 1];
        if (slab) {
          gsap.killTweensOf([focusMaterial, floorFocus.scale]);
          floorFocus.position.copy(slab.position); floorFocus.scale.set(1.02, 1, 1.02); floorFocus.visible = true;
          gsap.fromTo(focusMaterial, { opacity: .9 }, { opacity: 0, duration: .85, onUpdate: invalidate, onComplete: () => { floorFocus.visible = false; invalidate(); } });
          gsap.to(floorFocus.scale, { x: 1.1, z: 1.1, duration: .85, ease: 'power2.out', onUpdate: invalidate });
        }
      }
      invalidate();
    },
    motion: setMotion,
    orbit: setOrbit,
    hold,
    shot(key) {
      if (contextLost || disposed) return;
      const chapter = chapters.find(item => item.id === key);
      if (chapter) moveCamera(chapter.position, chapter.target, chapter.fov, 4.8, false);
    },
    lighting(mode) {
      if (contextLost || disposed) return;
      gsap.to(lightingState, { dusk: mode === 'blue-hour' ? 1 : 0, duration: motionAllowed ? 1.1 : 0, ease: 'power2.inOut', overwrite: true, onUpdate: updateLighting });
      syncActivity();
    },
    view(view) {
      if (contextLost || disposed) return;
      onCameraInteraction();
      moveCamera(positions[view], [0, 10.7, 0], 36, 1.3, true);
    },
    zoom,
    dispose() {
      disposed = true;
      setOrbit(false);
      clearTimeout(galleryTimeout);
      cancelAnimationFrame(frame);
      gsap.killTweensOf([camera.position, cameraFlight]);
      gsap.killTweensOf([lightingState, focusMaterial, floorFocus.scale]);
      observer.disconnect(); intersection.disconnect(); controls.dispose();
      document.removeEventListener('visibilitychange', visibility);
      reduced.removeEventListener('change', motionChange);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) { geometries.add(object.geometry); const list = Array.isArray(object.material) ? object.material : [object.material]; list.forEach(material => materials.add(material)); } });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
      sun.shadow.dispose();
      environment?.dispose();
      surfaces.dispose();
      renderer.dispose(); canvas.remove(); tooltip.remove();
    },
  };
}
