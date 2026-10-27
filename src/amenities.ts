type Amenity = 'unwind' | 'restore' | 'connect';
type Options = { enabled: () => boolean; toggle: () => void };

/** Image loading and motion state for the cinematic amenity presentation. */
export function createAmenityVisual(options: Options) {
  const art = document.querySelector<HTMLElement>('#amenity-art')!;
  const images = [...art.querySelectorAll<HTMLImageElement>('[data-amenity-image]')];
  const status = document.querySelector<HTMLElement>('#amenity-image-status')!;
  const fallback = art.querySelector<HTMLElement>('.amenity-image-fallback')!;
  const pause = document.querySelector<HTMLButtonElement>('#amenity-motion-toggle')!;
  const number = art.querySelector<HTMLElement>('.amenity-scene-number')!;
  let request = 0;
  let disposed = false;

  async function select(key: Amenity) {
    const token = ++request;
    art.dataset.category = key;
    const index = ['unwind', 'restore', 'connect'].indexOf(key);
    number.textContent = `0${index + 1} / ${key.toUpperCase()}`;
    const image = images.find(item => item.dataset.amenityImage === key)!;
    art.dataset.imageState = 'loading'; status.textContent = 'Loading concept visual…';
    try {
      await image.decode();
      if (disposed || token !== request) return;
      fallback.hidden = true;
      images.forEach(item => {
        const active = item === image;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-hidden', String(!active));
      });
      art.dataset.imageState = 'ready'; status.textContent = '';
    } catch {
      if (disposed || token !== request) return;
      images.forEach(item => { item.classList.remove('is-active'); item.setAttribute('aria-hidden', 'true'); });
      fallback.hidden = false; art.dataset.imageState = 'error';
      status.textContent = 'The concept image could not load. Amenity details and category controls remain available.';
    }
  }
  function syncMotion() {
    const enabled = options.enabled();
    pause.setAttribute('aria-pressed', String(enabled));
    pause.disabled = matchMedia('(prefers-reduced-motion: reduce)').matches;
    pause.textContent = pause.disabled ? 'Reduced motion' : enabled ? 'Ⅱ  Pause motion' : '▷  Play motion';
    pause.title = 'Pause or enable presentation animation across this page.';
  }
  pause.addEventListener('click', options.toggle);
  document.addEventListener('nv:motionchange', syncMotion);
  syncMotion(); void select('unwind');
  return {
    select,
    dispose() { disposed = true; ++request; pause.removeEventListener('click', options.toggle); document.removeEventListener('nv:motionchange', syncMotion); },
  };
}
