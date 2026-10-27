import gsap from 'gsap';

/** Presentation motion stays optional and never hides content pending JavaScript. */
export function createMotion(onChange: (enabled: boolean) => void) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const button = document.querySelector<HTMLButtonElement>('#motion-toggle')!;
  let manuallyPaused = false;
  let hidden = document.hidden;
  let progressFrame = 0;
  const jobs = new Set<{ tween: gsap.core.Tween; nodes: HTMLElement[] }>();
  const enabled = () => !preference.matches && !manuallyPaused;

  function animate(nodes: HTMLElement[], duration = .8, distance = 22, stagger = .09) {
    if (!enabled() || hidden || !nodes.length) return;
    // Repeated selection must replace its transition rather than queue tweens.
    for (const job of jobs) if (job.nodes.some(node => nodes.includes(node))) {
      job.tween.kill(); gsap.set(job.nodes, { clearProps: 'transform,opacity' }); jobs.delete(job);
    }
    const job = { tween: undefined as unknown as gsap.core.Tween, nodes };
    job.tween = gsap.from(nodes, {
      y: distance, opacity: .45, duration, stagger, ease: 'power3.out',
      clearProps: 'transform,opacity', onComplete: () => jobs.delete(job),
    });
    jobs.add(job);
  }
  function stopJobs() {
    jobs.forEach(job => { job.tween.kill(); gsap.set(job.nodes, { clearProps: 'transform,opacity' }); });
    jobs.clear();
  }
  function sync() {
    root.classList.toggle('motion-paused', !enabled());
    root.dataset.motion = enabled() ? 'on' : 'off';
    button.disabled = preference.matches;
    button.setAttribute('aria-pressed', String(enabled()));
    button.textContent = preference.matches ? 'Reduced motion' : enabled() ? 'Animations on · pause' : 'Animations off · enable';
    button.title = preference.matches ? 'Your system reduced-motion setting is respected.' : 'Pause or enable decorative animations across this page.';
    if (!enabled()) stopJobs();
    onChange(enabled());
    document.dispatchEvent(new CustomEvent('nv:motionchange'));
  }
  const click = () => { manuallyPaused = !manuallyPaused; sync(); };
  button.addEventListener('click', click);
  preference.addEventListener('change', sync);
  const visibility = () => {
    hidden = document.hidden;
    root.classList.toggle('page-hidden', hidden);
    jobs.forEach(job => job.tween.paused(hidden));
  };
  document.addEventListener('visibilitychange', visibility);

  const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const node = entry.target as HTMLElement;
    animate([...node.children].filter((child): child is HTMLElement => child instanceof HTMLElement));
    reveal.unobserve(node);
  }), { threshold: .12 });
  document.querySelectorAll('.section-index,.section-heading,.vision-grid,.stats,.residence-layout,.amenity-content,.gallery-grid,.location-layout,.enquire,.footer-top').forEach(node => reveal.observe(node));
  const art = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('in-view', entry.isIntersecting)), { threshold: .15 });
  document.querySelectorAll('.amenity-art').forEach(node => art.observe(node));

  const progress = document.createElement('div');
  progress.className = 'reading-progress'; progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);
  function updateProgress() {
    progressFrame = 0;
    const available = root.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${available > 0 ? Math.min(1, Math.max(0, scrollY / available)) : 0})`;
  }
  const scroll = () => { if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress); };
  window.addEventListener('scroll', scroll, { passive: true });
  window.addEventListener('resize', scroll);
  sync(); visibility(); updateProgress();
  animate([...document.querySelectorAll<HTMLElement>('.hero-copy > *')], 1.15, 30, .12);

  return {
    enabled,
    swap(node: HTMLElement) {
      const rect = node.getBoundingClientRect();
      if (rect.width && rect.bottom > 0 && rect.top < innerHeight) animate([node], .4, 10, 0);
    },
    dispose() {
      stopJobs(); reveal.disconnect(); art.disconnect(); cancelAnimationFrame(progressFrame);
      button.removeEventListener('click', click); preference.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('scroll', scroll); window.removeEventListener('resize', scroll); progress.remove();
    },
  };
}
