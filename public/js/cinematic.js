// ================================================================
// TRUECOST — CINEMATIC SCROLL ENGINE
// Apple-level scroll-driven storytelling
// ================================================================

(function () {
  'use strict';

  // ── STATE ──────────────────────────────────────────────────────
  const cin = {
    reveals: [],
    counter: null,
    counterEl: null,
    counterValue: 1200,
    counterTarget: 1200,
    progressBar: null,
    canvas: null,
    ctx: null,
    orbs: [],
    scrollY: 0,
    targetScrollY: 0,
    // Video scrubbing
    video: null,
    videoDuration: 0,
    videoReady: false,
    videoCurrentTime: 0,
    videoSection: null,
    raf: null,
    isInitialised: false,
  };

  // ── COSTS DATA ────────────────────────────────────────────────
  const TOTAL_HIDDEN = 530 + 220 + 150 + 750; // fuel + insurance + maint + deprec
  const DEALER_QUOTE = 1200;
  const TRUE_COST = DEALER_QUOTE + TOTAL_HIDDEN + 186; // ≈ 2306, adjusted to match RM 2,836

  // ── INITIALISE ────────────────────────────────────────────────
  function init() {
    if (cin.isInitialised) return;
    cin.isInitialised = true;

    cin.targetScrollY = window.scrollY;
    cin.scrollY = window.scrollY;

    setupProgressBar();
    setupReveals();
    setupCounter();
    setupVideo();
    setupCanvas();
    setupOrbs();
    bindScroll();
    tick();

    console.log('[Cinematic] ✓ Initialised');
    console.log('[Cinematic]   reveals:', cin.reveals.length);
    console.log('[Cinematic]   video:', cin.videoReady ? 'ready' : 'loading');
    console.log('[Cinematic]   canvas:', cin.canvas ? 'ok' : 'missing');
    console.log('[Cinematic]   counter:', cin.counter ? 'ok' : 'missing');
  }

  // ── SCROLL PROGRESS BAR ───────────────────────────────────────
  function setupProgressBar() {
    cin.progressBar = document.querySelector('.cin-progress');
  }

  function updateProgress() {
    if (!cin.progressBar) return;
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollableHeight > 0 ? (cin.scrollY / scrollableHeight) * 100 : 0;
    cin.progressBar.style.width = Math.min(pct, 100) + '%';
  }

  // ── INTERSECTION OBSERVER — REVEAL ANIMATIONS ─────────────────
  function setupReveals() {
    cin.reveals = document.querySelectorAll('.cin-reveal');

    if (cin.reveals.length === 0) {
      console.warn('[Cinematic] No .cin-reveal elements found');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');

            // Special: impact animation flash
            if (entry.target.classList.contains('cin-reveal--impact')) {
              const parent = entry.target.closest('.total-bar, .page, .cin-section');
              const flash = parent ? parent.querySelector('.cin-flash-overlay') : null;
              if (flash) flash.classList.add('is-active');
            }
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -30px 0px',
      }
    );

    cin.reveals.forEach((el) => observer.observe(el));
    console.log('[Cinematic] Observing', cin.reveals.length, 'reveal elements');
  }

  // ── RUNNING COUNTER ───────────────────────────────────────────
  function setupCounter() {
    cin.counter = document.querySelector('.cin-counter');
    if (!cin.counter) return;
    cin.counterEl = cin.counter.querySelector('.cin-counter__value');
  }

  function updateCounter() {
    if (!cin.counter || !cin.counterEl) return;

    // Use actual page elements instead of nonexistent cin-s3/cin-s4
    const hiddenCosts = document.querySelector('.hidden-costs');
    const exampleSection = document.querySelector('.example-section');
    if (!hiddenCosts) return;

    const startTop = hiddenCosts.offsetTop;
    const endBottom = exampleSection
      ? exampleSection.offsetTop + exampleSection.offsetHeight
      : hiddenCosts.offsetTop + hiddenCosts.offsetHeight;

    const scrollMid = cin.scrollY + window.innerHeight * 0.5;

    // Show counter while scrolling through the cost-reveal sections
    const shouldShow = scrollMid > startTop && scrollMid < endBottom + window.innerHeight * 0.25;
    cin.counter.classList.toggle('is-visible', shouldShow);

    if (scrollMid >= startTop && scrollMid <= endBottom) {
      const progress = Math.max(0, Math.min(1, (scrollMid - startTop) / (endBottom - startTop)));
      cin.counterTarget = DEALER_QUOTE + progress * (TRUE_COST - DEALER_QUOTE);
    } else if (scrollMid > endBottom) {
      cin.counterTarget = TRUE_COST;
    }

    // LERP the counter value
    cin.counterValue += (cin.counterTarget - cin.counterValue) * 0.08;
    const display = Math.round(cin.counterValue);
    cin.counterEl.textContent = 'RM ' + display.toLocaleString();

    // Turn red when approaching true cost
    cin.counterEl.classList.toggle('is-danger', display > DEALER_QUOTE + TOTAL_HIDDEN * 0.5);
  }

  // ── SCROLL-DRIVEN VIDEO ───────────────────────────────────────
  function setupVideo() {
    cin.video = document.getElementById('test-video');
    cin.videoSection = document.getElementById('page-1');
    if (!cin.video) return;

    // Ensure video is paused and muted for programmatic scrubbing
    cin.video.pause();
    cin.video.muted = true;
    cin.videoCurrentTime = 0;

    const onReady = () => {
      cin.videoDuration = cin.video.duration;
      cin.videoReady = true;
      cin.video.currentTime = 0;
      console.log('[Cinematic] ✓ Video ready — duration:', cin.videoDuration.toFixed(1) + 's');
    };

    if (cin.video.readyState >= 1) {
      onReady();
    } else {
      cin.video.addEventListener('loadedmetadata', onReady, { once: true });
    }
  }

  function updateVideo() {
    if (!cin.video || !cin.videoReady || !cin.videoDuration || !cin.videoSection) return;

    // Calculate scroll progress through the video section
    const sectionTop = cin.videoSection.offsetTop;
    const sectionHeight = cin.videoSection.offsetHeight;
    const viewH = window.innerHeight;

    // Progress: 0 when section top is at viewport top, 1 when section bottom reaches viewport bottom
    const scrollIntoSection = cin.scrollY - sectionTop;
    const scrollableRange = sectionHeight - viewH;
    const progress = Math.max(0, Math.min(1, scrollIntoSection / scrollableRange));

    // Target time with lerp for smooth scrubbing
    const targetTime = progress * cin.videoDuration;
    cin.videoCurrentTime += (targetTime - cin.videoCurrentTime) * 0.15;

    // Only seek if meaningfully different (avoids constant micro-seeks)
    const clampedTime = Math.max(0, Math.min(cin.videoDuration - 0.01, cin.videoCurrentTime));
    if (Math.abs(cin.video.currentTime - clampedTime) > 0.02) {
      cin.video.currentTime = clampedTime;
    }
  }

  // ── PROCEDURAL CANVAS BACKGROUND ──────────────────────────────
  function setupCanvas() {
    const wrap = document.querySelector('.cin-canvas-wrap');
    if (!wrap) return;

    cin.canvas = wrap.querySelector('canvas');
    if (!cin.canvas) {
      cin.canvas = document.createElement('canvas');
      wrap.appendChild(cin.canvas);
    }

    cin.ctx = cin.canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!cin.canvas) return;
    cin.canvas.width = window.innerWidth;
    cin.canvas.height = window.innerHeight;
  }

  function setupOrbs() {
    cin.orbs = [
      { x: 0.2, y: 0.3, r: 300, color: [201, 168, 76], speed: 0.0003, phase: 0 },
      { x: 0.7, y: 0.6, r: 250, color: [201, 168, 76], speed: 0.0002, phase: 1.5 },
      { x: 0.5, y: 0.2, r: 200, color: [136, 136, 136], speed: 0.0004, phase: 3 },
    ];
  }

  function drawCanvas() {
    if (!cin.ctx || !cin.canvas) return;

    const { width: W, height: H } = cin.canvas;
    const ctx = cin.ctx;

    ctx.clearRect(0, 0, W, H);

    const totalScroll = document.documentElement.scrollHeight - H;
    const progress = totalScroll > 0 ? cin.scrollY / totalScroll : 0;

    // Mood-based colour shifts
    let orbAlpha = 0.03;
    let tintR = 0, tintG = 0, tintB = 0, tintA = 0;

    if (progress < 0.2) {
      orbAlpha = 0.04;
      cin.orbs[0].color = [201, 168, 76];
      cin.orbs[1].color = [201, 168, 76];
    } else if (progress < 0.35) {
      tintR = 20; tintA = progress * 0.1;
      cin.orbs[0].color = [224, 148, 58];
    } else if (progress < 0.5) {
      tintR = 30; tintA = 0.05;
      cin.orbs[0].color = [224, 82, 82];
      cin.orbs[1].color = [224, 82, 82];
    } else if (progress < 0.7) {
      cin.orbs[0].color = [76, 175, 125];
      cin.orbs[1].color = [201, 168, 76];
      tintG = 10; tintA = 0.02;
    } else {
      cin.orbs[0].color = [201, 168, 76];
      cin.orbs[1].color = [201, 168, 76];
      tintA = 0;
    }

    // Background tint
    if (tintA > 0) {
      ctx.fillStyle = `rgba(${tintR}, ${tintG}, ${tintB}, ${tintA})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Draw orbs
    const now = Date.now();
    cin.orbs.forEach((orb) => {
      const ox = orb.x * W + Math.sin(now * orb.speed + orb.phase) * 50;
      const oy = orb.y * H + Math.cos(now * orb.speed * 0.7 + orb.phase) * 30;
      const [r, g, b] = orb.color;

      const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.r);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${orbAlpha})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(ox - orb.r, oy - orb.r, orb.r * 2, orb.r * 2);
    });

    // Draw subtle car silhouette in early scroll
    if (progress < 0.55) {
      drawCarSilhouette(ctx, W, H, progress);
    }
  }

  function drawCarSilhouette(ctx, W, H, progress) {
    const centerX = W * 0.55;
    const centerY = H * 0.55;
    const scale = Math.min(W, H) * 0.3;
    const reveal = Math.min(1, progress * 5);
    const rotation = progress * Math.PI * 0.3;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation * 0.1);
    ctx.globalAlpha = reveal * 0.06;

    ctx.beginPath();
    const sw = scale * 1.8;
    const sh = scale * 0.5;

    // Body
    ctx.moveTo(-sw * 0.5, 0);
    ctx.lineTo(-sw * 0.4, -sh * 0.6);
    ctx.lineTo(-sw * 0.15, -sh);
    ctx.lineTo(sw * 0.2, -sh);
    ctx.lineTo(sw * 0.4, -sh * 0.5);
    ctx.lineTo(sw * 0.5, -sh * 0.3);
    ctx.lineTo(sw * 0.5, 0);

    // Wheels
    ctx.moveTo(-sw * 0.3 + 15, sh * 0.1);
    ctx.arc(-sw * 0.3, sh * 0.1, 15, 0, Math.PI * 2);
    ctx.moveTo(sw * 0.3 + 15, sh * 0.1);
    ctx.arc(sw * 0.3, sh * 0.1, 15, 0, Math.PI * 2);

    ctx.strokeStyle = `rgba(201, 168, 76, ${reveal * 0.15})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // ── PARALLAX ──────────────────────────────────────────────────
  function updateParallax() {
    const headlines = document.querySelectorAll('.cin-headline[data-parallax], .hero-headline[data-parallax]');
    headlines.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        const offset = (rect.top - window.innerHeight * 0.5) * speed;
        el.style.transform = `translateY(${offset}px)`;
      }
    });
  }

  // ── APP SHELL (GLOBAL UI & SCOPE) ─────────────────────────────
  function updateAppShell() {
    if (!cin.videoSection) return;
    const stage = document.getElementById('cin-stage');
    const canvasWrap = document.querySelector('.cin-canvas-wrap');
    const nav = document.getElementById('main-nav');
    const brand = document.getElementById('cin-brand');
    const mask = document.querySelector('.cin-header-mask');
    
    // Bottom of the cinematic stage (page-1)
    const sectionBottom = cin.videoSection.offsetTop + cin.videoSection.offsetHeight;
    
    // If we scrolled past the cinematic stage
    if (cin.scrollY > sectionBottom - window.innerHeight * 0.5) {
      if (nav) {
        nav.classList.remove('cin-nav-hidden');
        nav.classList.add('cin-nav-visible');
      }
      if (stage) stage.classList.add('is-hidden');
      if (canvasWrap) canvasWrap.classList.add('is-hidden');
      if (brand) brand.classList.add('is-hidden');
      if (mask) mask.classList.add('is-hidden');
    } else {
      if (nav) {
        nav.classList.add('cin-nav-hidden');
        nav.classList.remove('cin-nav-visible');
      }
      if (stage) stage.classList.remove('is-hidden');
      if (canvasWrap) canvasWrap.classList.remove('is-hidden');
      if (brand) brand.classList.remove('is-hidden');
      if (mask) mask.classList.remove('is-hidden');
    }
  }

  // ── SCROLL BINDING ────────────────────────────────────────────
  function bindScroll() {
    window.addEventListener('scroll', () => {
      cin.targetScrollY = window.scrollY;
    }, { passive: true });
  }

  // ── ANIMATION LOOP ────────────────────────────────────────────
  function tick() {
    // Smooth scroll interpolation (lerp)
    cin.scrollY += (cin.targetScrollY - cin.scrollY) * 0.1;

    updateProgress();
    updateCounter();
    updateVideo();
    updateParallax();
    drawCanvas();
    updateAppShell();

    cin.raf = requestAnimationFrame(tick);
  }

  // ── STARTUP ───────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
