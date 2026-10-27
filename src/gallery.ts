type Frame = { src: string; title: string; label: string; description: string; position?: string };
type Collection = 'cinematic' | 'studies';

/** The generated art and actual model captures deliberately remain separate collections. */
export function createGallery(swap: (node: HTMLElement) => void) {
  const get = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const frames: Record<Collection, Frame[]> = {
    cinematic: [
      { src: '/hero-concept-v1.jpg', title: 'The arrival', label: '01 / THE ARRIVAL', description: 'An imagined blue-hour arrival. Pale terraces and warm interior light rise above a fictional tropical city.', position: '66% center' },
      { src: '/gallery-detail-v1.jpg', title: 'Material & light', label: '02 / THE DETAIL', description: 'A closer study of pale stone, reflective glass and planted balconies. An AI-assisted interpretation of the architectural language.' },
      { src: '/amenity-unwind-v1.jpg', title: 'The sky terrace', label: '03 / ABOVE IT ALL', description: 'An imagined pool terrace at sunset. The setting, facilities and outlook are illustrative, with no actual view or operational amenity represented.' },
    ],
    studies: [
      { src: '/architecture.svg', title: 'The tower', label: '01 / THE MASSING', description: 'The original procedural tower: floor slabs, glass, balconies and a landscaped podium, constructed in Three.js.' },
      { src: '/facade.svg', title: 'After dark', label: '02 / THE FACADE', description: 'A blue-hour facade study of the same interactive model, exploring the rhythm of windows and warm light.' },
      { src: '/aerial.svg', title: 'Above it all', label: '03 / THE PODIUM', description: 'An elevated study of the tower, roof and fictional landscaped grounds. The model is a design exercise, not construction documentation.' },
    ],
  };
  const disclosure: Record<Collection, string> = {
    cinematic: 'AI-assisted fictional concept art · not site photography. Imagined details may differ from the live 3D model.',
    studies: 'Original programmatic architectural studies by NV SHARP SOLUTIONS. Fictional concept visuals, not site photography.',
  };
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-gallery-collection]')];
  const cards = [...document.querySelectorAll<HTMLButtonElement>('[data-gallery]')];
  const thumbnails = [...document.querySelectorAll<HTMLButtonElement>('[data-gallery-thumb]')];
  const dialog = get<HTMLDialogElement>('#gallery-dialog');
  const image = get<HTMLImageElement>('#gallery-full');
  const status = get('#gallery-image-status');
  let collection: Collection = 'cinematic';
  let index = 0;
  let opener: HTMLElement | undefined;
  let loadToken = 0;
  let touch: { id: number; x: number; y: number } | undefined;
  const events = new AbortController();
  const options = { signal: events.signal };

  function renderCards() {
    frames[collection].forEach((frame, i) => {
      const card = cards[i];
      const picture = card.querySelector('img')!;
      picture.src = frame.src; picture.alt = `${frame.title}. Fictional architectural concept.`;
      picture.style.objectPosition = frame.position ?? 'center';
      card.querySelector('small')!.textContent = frame.label;
      card.querySelector('strong')!.textContent = frame.title;
      thumbnails[i].querySelector('img')!.src = frame.src;
      thumbnails[i].setAttribute('aria-label', `View ${frame.title}`);
      thumbnails[i].querySelector('span')!.textContent = frame.title;
    });
    get('#gallery-note').textContent = disclosure[collection];
  }
  async function renderImage() {
    const token = ++loadToken;
    const frame = frames[collection][index];
    image.hidden = true; image.src = frame.src; image.alt = `${frame.title}. Fictional architectural concept.`;
    get('#gallery-title').textContent = frame.title;
    get('#gallery-description').textContent = frame.description;
    get('#gallery-counter').textContent = `${index + 1} / ${frames[collection].length}`;
    get('#gallery-collection-label').textContent = collection === 'cinematic' ? 'THE CINEMATIC COLLECTION' : 'THE 3D STUDIES';
    get('#gallery-disclosure').textContent = disclosure[collection];
    thumbnails.forEach((button, i) => button.setAttribute('aria-pressed', String(index === i)));
    status.textContent = 'Loading architectural image…'; status.hidden = false;
    try {
      await image.decode();
      if (token !== loadToken) return;
      image.hidden = false; status.hidden = true;
      if (dialog.open) swap(image);
    } catch {
      if (token !== loadToken) return;
      status.textContent = 'This image could not load. Choose another frame or close the gallery to continue exploring.';
    }
  }
  function move(direction: number) {
    index = (index + direction + frames[collection].length) % frames[collection].length;
    void renderImage();
  }
  function select(tab: HTMLButtonElement) {
    collection = tab.dataset.galleryCollection as Collection;
    tabs.forEach(button => { button.setAttribute('aria-selected', String(button === tab)); button.tabIndex = button === tab ? 0 : -1; });
    get('#gallery-panel').setAttribute('aria-labelledby', tab.id);
    renderCards(); swap(get('.gallery-grid'));
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab), options);
    tab.addEventListener('keydown', event => {
      const target = event.key === 'ArrowRight' ? tabs[(i + 1) % tabs.length] : event.key === 'ArrowLeft' ? tabs[(i + tabs.length - 1) % tabs.length] : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : undefined;
      if (target) { event.preventDefault(); select(target); target.focus(); }
    }, options);
  });
  cards.forEach((card, i) => card.addEventListener('click', () => {
    index = i; opener = card; void renderImage(); dialog.showModal(); document.documentElement.classList.add('modal-open');
  }, options));
  thumbnails.forEach((button, i) => button.addEventListener('click', () => { index = i; void renderImage(); }, options));
  get('#gallery-prev').addEventListener('click', () => move(-1), options);
  get('#gallery-next').addEventListener('click', () => move(1), options);
  get('#gallery-close').addEventListener('click', () => dialog.close(), options);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }, options);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
  }, options);
  const stage = get('#gallery-image-stage');
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && event.isPrimary) touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, options);
  stage.addEventListener('pointerup', event => {
    if (!touch || event.pointerId !== touch.id) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
    touch = undefined;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
  }, options);
  stage.addEventListener('pointercancel', () => { touch = undefined; }, options);
  dialog.addEventListener('close', () => { ++loadToken; touch = undefined; document.documentElement.classList.remove('modal-open'); opener?.focus(); }, options);
  renderCards();
  return {
    updateStudies(images: string[]) {
      images.forEach((src, i) => { if (frames.studies[i]) frames.studies[i].src = src; });
      get('#gallery').dataset.studiesReady = 'true';
      if (collection === 'studies') { renderCards(); if (dialog.open) void renderImage(); }
    },
    dispose() { ++loadToken; events.abort(); },
  };
}
