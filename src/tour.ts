import gsap from 'gsap';
import { chapterAt, chapters } from './cinema';
import type { Chapter } from './cinema';

type Options = {
  allowed: () => boolean;
  open: () => void;
  close: () => void;
  shot: (chapter: Chapter) => void;
  hold: () => void;
};

export function createTour(options: Options) {
  const dialog = document.querySelector<HTMLDialogElement>('#cinema-dialog')!;
  const play = document.querySelector<HTMLButtonElement>('#cinema-play')!;
  const watch = document.querySelector<HTMLButtonElement>('#watch-film')!;
  const progress = document.querySelector<HTMLElement>('#cinema-progress')!;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-chapter]')];
  const state = { progress: 0 };
  let index = 0;
  let playing = false;
  let clock: gsap.core.Tween | undefined;
  let opener: HTMLElement | null = null;

  function pause() {
    playing = false; clock?.kill(); clock = undefined;
    if (dialog.open) options.hold();
    play.textContent = '▶  Play film'; play.setAttribute('aria-pressed', 'false');
    dialog.dataset.playing = 'false';
  }
  function choose(next: number) {
    index = chapters.indexOf(chapterAt(next));
    const chapter = chapterAt(index);
    document.querySelector('#cinema-eyebrow')!.textContent = chapter.eyebrow;
    document.querySelector('#cinema-title')!.textContent = chapter.title;
    document.querySelector('#cinema-description')!.textContent = chapter.description;
    document.querySelector('#cinema-count')!.textContent = `${index + 1} / ${chapters.length}`;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.chapter === chapter.id)));
    dialog.dataset.currentChapter = chapter.id;
    state.progress = 0; progress.style.transform = 'scaleX(0)';
    options.shot(chapter.id);
  }
  function run() {
    if (!options.allowed() || !dialog.open) return;
    playing = true; play.textContent = 'Ⅱ  Pause film'; play.setAttribute('aria-pressed', 'true');
    dialog.dataset.playing = 'true';
    clock?.kill();
    clock = gsap.to(state, {
      progress: 1, duration: 7.5, ease: 'none',
      onUpdate: () => { progress.style.transform = `scaleX(${state.progress})`; },
      onComplete: () => {
        if (index === chapters.length - 1) pause();
        else { choose(index + 1); run(); }
      },
    });
    clock.paused(document.hidden);
  }
  function move(next: number) { pause(); choose(next); }
  const launch = () => {
    opener = watch;
    dialog.showModal(); document.documentElement.classList.add('modal-open');
    options.open(); choose(0); if (options.allowed()) run();
  };
  watch.addEventListener('click', launch);
  const toggle = () => {
    if (playing) pause();
    else { choose(state.progress >= 1 ? 0 : index); run(); }
  };
  play.addEventListener('click', toggle);
  const previous = () => move(index - 1), next = () => move(index + 1);
  const previousButton = document.querySelector<HTMLButtonElement>('#cinema-prev')!;
  const nextButton = document.querySelector<HTMLButtonElement>('#cinema-next')!;
  previousButton.addEventListener('click', previous); nextButton.addEventListener('click', next);
  const closeButton = document.querySelector<HTMLButtonElement>('#cinema-close')!;
  const close = () => dialog.close(); closeButton.addEventListener('click', close);
  const chapterHandlers = buttons.map((button, chapterIndex) => {
    const handler = () => move(chapterIndex); button.addEventListener('click', handler); return handler;
  });
  const keyboard = (event: KeyboardEvent) => {
    // The canvas retains its orbit keys; chapter shortcuts apply to the film controls.
    if (event.target instanceof HTMLCanvasElement) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); previous(); }
  };
  dialog.addEventListener('keydown', keyboard);
  const closed = () => {
    pause(); options.close(); document.documentElement.classList.remove('modal-open'); opener?.focus({ preventScroll: true });
  };
  dialog.addEventListener('close', closed);
  const visibility = () => clock?.paused(document.hidden);
  document.addEventListener('visibilitychange', visibility);
  return {
    isOpen: () => dialog.open,
    pause,
    motion(enabled: boolean) { play.disabled = !enabled; play.title = enabled ? 'Play or pause the architectural film.' : 'Motion is paused. Choose a chapter for a static view.'; if (!enabled) pause(); },
    unavailable() { pause(); watch.disabled = true; if (dialog.open) dialog.close(); },
    dispose() {
      pause(); document.removeEventListener('visibilitychange', visibility);
      watch.removeEventListener('click', launch); play.removeEventListener('click', toggle);
      previousButton.removeEventListener('click', previous); nextButton.removeEventListener('click', next);
      closeButton.removeEventListener('click', close); dialog.removeEventListener('keydown', keyboard); dialog.removeEventListener('close', closed);
      buttons.forEach((button, i) => button.removeEventListener('click', chapterHandlers[i]));
    },
  };
}
