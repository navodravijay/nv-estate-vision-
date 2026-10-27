import * as THREE from 'three';

/** Original, deterministic material textures. No downloaded imagery or asset hosts. */
export function randomSequence(seed: number) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(1664525, value) + 1013904223) >>> 0; return value / 4294967296; };
}

export function createSurfaces() {
  const random = randomSequence(4721);
  const textures: THREE.Texture[] = [];
  function paint(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void, color = true) {
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Material texture drawing is unavailable.');
    draw(ctx, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    textures.push(texture); return texture;
  }
  const concrete = paint(256, (ctx, size) => {
    const image = ctx.createImageData(size, size);
    for (let i = 0; i < image.data.length; i += 4) {
      const shade = 206 + Math.floor(random() * 23);
      image.data.set([shade + 3, shade + 2, shade, 255], i);
    }
    ctx.putImageData(image, 0, 0);
  });
  const concreteBump = concrete.clone(); concreteBump.colorSpace = THREE.NoColorSpace; textures.push(concreteBump);
  const paving = paint(512, (ctx, size) => {
    ctx.fillStyle = '#777b76'; ctx.fillRect(0, 0, size, size);
    for (let row = 0; row < 8; row++) for (let column = 0; column < 4; column++) {
      const shade = 137 + Math.floor(random() * 21);
      ctx.fillStyle = `rgb(${shade + 5},${shade + 4},${shade})`;
      ctx.fillRect(column * 128 + (row % 2) * 64 + 1, row * 64 + 1, 125, 61);
      if (row % 2 && column === 0) ctx.fillRect(-63, row * 64 + 1, 125, 61);
    }
    for (let i = 0; i < 9000; i++) { ctx.fillStyle = random() > .5 ? '#ffffff09' : '#0000000b'; ctx.fillRect(random() * size, random() * size, 1, 1); }
  });
  paving.repeat.set(28, 28);
  const glassNormal = paint(128, (ctx, size) => {
    const image = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      image.data.set([128 + Math.sin(x / 19 + y / 37) * 4, 128 + Math.sin(y / 23) * 3, 254, 255], i);
    }
    ctx.putImageData(image, 0, 0);
  }, false);
  const waterNormal = paint(256, (ctx, size) => {
    const image = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      image.data.set([128 + Math.sin(x * .23 + Math.sin(y * .11)) * 21, 128 + Math.cos(y * .19 + x * .07) * 19, 248, 255], i);
    }
    ctx.putImageData(image, 0, 0);
  }, false);
  waterNormal.repeat.set(3, 6);
  const room = paint(128, (ctx, size) => {
    const glow = ctx.createLinearGradient(0, 0, size, size);
    glow.addColorStop(0, '#ac9273'); glow.addColorStop(.6, '#d3b68a'); glow.addColorStop(1, '#534b42');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#3e3e3a'; ctx.fillRect(0, 94, size, 34);
    ctx.fillStyle = '#6e695b'; ctx.fillRect(22, 82, 56, 20);
    for (let x = 0; x < 42; x += 3) {
      ctx.fillStyle = x % 2 ? '#c4baa7cc' : '#e6d7b9a8'; ctx.fillRect(x, 0, 2, 111);
    }
    ctx.fillStyle = '#fff1c1'; ctx.fillRect(66, 18, 18, 3);
    ctx.fillStyle = '#2d3438'; ctx.fillRect(0, 0, size, 5); ctx.fillRect(0, 0, 4, size);
  });
  const leaves = paint(256, ctx => {
    for (let i = 0; i < 440; i++) {
      const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 108;
      const x = 128 + Math.cos(angle) * radius, y = 128 + Math.sin(angle) * radius * .85;
      const shade = 35 + Math.floor(random() * 65);
      ctx.fillStyle = `rgb(${Math.floor(shade * .68)},${shade + 29},${Math.floor(shade * .64)})`;
      ctx.beginPath(); ctx.ellipse(x, y, 3 + random() * 7, 1.5 + random() * 3, angle, 0, Math.PI * 2); ctx.fill();
    }
  });
  const city = paint(256, (ctx, size) => {
    ctx.fillStyle = '#81929a'; ctx.fillRect(0, 0, size, size);
    for (let y = 5; y < size; y += 18) for (let x = 6; x < size; x += 19) {
      ctx.fillStyle = random() > .28 ? '#526d7c' : '#9fabad'; ctx.fillRect(x, y, 10, 11);
    }
  });
  return { concrete, concreteBump, paving, glassNormal, waterNormal, room, leaves, city, dispose: () => textures.forEach(texture => texture.dispose()) };
}

export function createPalmFrond() {
  const vertices: number[] = [];
  const point = (t: number, side: number) => new THREE.Vector3(t * 1.5, Math.sin(t * Math.PI) * .38 - t * .32, side);
  for (let i = 1; i < 12; i++) {
    const t = i / 13, root = point(t, 0), next = point(t + .065, 0);
    const width = Math.sin(t * Math.PI) * .32;
    for (const sign of [-1, 1]) {
      const tip = point(t - .13, width * sign);
      vertices.push(...root.toArray(), ...tip.toArray(), ...next.toArray());
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
  return geometry;
}
