// Live previews, motion controls and the setup-step entrance.
// Download buttons are chosen by the inline script in index.html.
(() => {
  const frames = [...document.querySelectorAll('iframe[data-preview]')];
  const motionBtn = document.getElementById('motion-toggle');
  const layoutChoice = document.getElementById('layout-choice');
  const heroCaption = document.getElementById('hero-layout-caption');
  const opening = document.querySelector('.opening-preview');
  const openingPause = document.querySelector('.opening-pause');
  const openingReplay = document.querySelector('.opening-replay');
  const reducedMq = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = reducedMq.matches;
  let motionPaused = false;
  let openingPaused = false;

  function queryOf(frame) {
    return new URL(frame.dataset.src, location.href).searchParams;
  }
  function modeOf(frame) {
    return queryOf(frame).get('mode') || 'scene';
  }
  function sceneOf(frame) {
    if (frame.classList.contains('hero-watch') && layoutChoice) return layoutChoice.value;
    return queryOf(frame).get('scene') || '';
  }
  function post(frame) {
    if (frame.dataset.ready !== '1' || !frame.contentWindow) return;
    const mode = modeOf(frame);
    const paused = motionPaused || reduced || (mode === 'opening' && openingPaused);
    frame.contentWindow.postMessage({
      kind: 'tp-review-state',
      active: frame.dataset.visible === '1',
      paused: paused,
      reduced: reduced,
      scene: sceneOf(frame)
    }, '*');
  }
  function load(frame) {
    if (!frame.getAttribute('src')) frame.src = frame.dataset.src;
  }
  function syncOpeningButtons() {
    if (!openingPause) return;
    openingPause.setAttribute('aria-pressed', String(openingPaused));
    openingPause.textContent = openingPaused ? 'Resume opening' : 'Pause opening';
    if (openingReplay) openingReplay.disabled = reduced;
  }
  function applyReduced() {
    reduced = reducedMq.matches;
    document.body.dataset.reduced = reduced ? '1' : '0';
    document.documentElement.classList.toggle('has-scroll-motion', !reduced);
    syncOpeningButtons();
    frames.forEach(post);
  }

  frames.filter((frame) => frame.classList.contains('hero-watch') || frame.classList.contains('hero-note')).forEach(load);

  const seen = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const frame = entry.target;
      const mode = modeOf(frame);
      // Notes in the hero sit just inside a laptop window, so they start once
      // a good part of the paper is on screen. The opening waits until it is the focus.
      const need = mode === 'opening' ? 0.55 : mode === 'note' ? 0.4 : 0.12;
      frame.dataset.visible = entry.isIntersecting && entry.intersectionRatio >= need ? '1' : '0';
      if (entry.isIntersecting) load(frame);
      post(frame);
    });
  }, { threshold: [0, 0.12, 0.4, 0.55, 0.75, 1] });
  frames.forEach((frame) => seen.observe(frame));

  window.addEventListener('message', (event) => {
    if (!event.data || event.data.kind !== 'tp-review-ready') return;
    const frame = frames.find((item) => item.contentWindow === event.source);
    if (!frame) return;
    frame.dataset.ready = '1';
    post(frame);
  });

  if (motionBtn) {
    motionBtn.addEventListener('click', () => {
      motionPaused = !motionPaused;
      motionBtn.setAttribute('aria-pressed', String(motionPaused));
      motionBtn.textContent = motionPaused ? 'Resume motion' : 'Pause motion';
      if (motionPaused) document.body.dataset.paused = '1';
      else delete document.body.dataset.paused;
      frames.forEach(post);
    });
  }

  if (layoutChoice) {
    const options = [...layoutChoice.querySelectorAll('option')];
    layoutChoice.addEventListener('change', () => {
      const picked = layoutChoice.selectedOptions[0];
      if (heroCaption && picked) heroCaption.textContent = 'Live clock · ' + picked.textContent;
      const hero = frames.find((frame) => frame.classList.contains('hero-watch'));
      if (hero) post(hero);
    });
    const next = document.getElementById('next-layout');
    if (next) next.addEventListener('click', () => {
      const index = options.findIndex((option) => option.value === layoutChoice.value);
      layoutChoice.value = options[(index + 1) % options.length].value;
      layoutChoice.dispatchEvent(new Event('change'));
    });
  }

  if (openingPause) openingPause.addEventListener('click', () => {
    openingPaused = !openingPaused;
    syncOpeningButtons();
    if (opening) post(opening);
  });
  if (openingReplay) openingReplay.addEventListener('click', () => {
    if (reduced || !opening || !opening.contentWindow) return;
    openingPaused = false;
    syncOpeningButtons();
    post(opening);
    opening.contentWindow.postMessage({ kind: 'tp-review-replay' }, '*');
  });

  if (!reduced) {
    document.documentElement.classList.add('has-scroll-motion');
    const steps = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        steps.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    document.querySelectorAll('.desk-start li').forEach((item) => steps.observe(item));
  }
  applyReduced();
})();
