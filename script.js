/* ─────────────────────────────────────────────
   UTILS
───────────────────────────────────────────── */
function pad2(n) { return String(n).padStart(2, "0"); }

const prefersReduced =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ─────────────────────────────────────────────
   PARALLAX
   Each element with [data-parallax] gets a
   translateY offset proportional to scroll.
───────────────────────────────────────────── */
function setupParallax() {
  if (prefersReduced) return;

  const layers = [
    // hero layers
    { el: document.querySelector(".hero__sky"),     speed: 0.12 },
    { el: document.querySelector(".hero__gopuram"), speed: 0.18 },
    // section bgs
    ...Array.from(document.querySelectorAll(".section__bg[data-parallax]")).map(el => ({
      el,
      speed: parseFloat(el.getAttribute("data-parallax")) || 0.12,
    })),
  ].filter(l => l.el);

  let ticking = false;

  function apply() {
    const scrollY = window.scrollY;

    for (const layer of layers) {
      const parent = layer.el.closest("section, .hero");
      if (!parent) continue;
      const rect = parent.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;
      const shift = scrollY * layer.speed;
      layer.el.style.transform = `translateY(${shift.toFixed(2)}px)`;
    }
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) { window.requestAnimationFrame(apply); ticking = true; }
  }, { passive: true });

  apply();
}

/* ─────────────────────────────────────────────
   SCROLL REVEAL
───────────────────────────────────────────── */
function setupReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("revealed");
          obs.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  for (const el of els) obs.observe(el);
}


/* ─────────────────────────────────────────────
   COUNTDOWN TIMER
───────────────────────────────────────────── */
function setupCountdown() {
  const root = document.querySelector("[data-countdown]");
  if (!root) return;

  const target = new Date(root.getAttribute("data-date"));
  if (isNaN(target)) return;

  const dEl = root.querySelector("[data-days]");
  const hEl = root.querySelector("[data-hours]");
  const mEl = root.querySelector("[data-minutes]");
  const sEl = root.querySelector("[data-seconds]");

  function tick() {
    const diff = Math.max(0, target - Date.now());
    const total = Math.floor(diff / 1000);
    if (dEl) dEl.textContent = pad2(Math.floor(total / 86400));
    if (hEl) hEl.textContent = pad2(Math.floor((total % 86400) / 3600));
    if (mEl) mEl.textContent = pad2(Math.floor((total % 3600) / 60));
    if (sEl) sEl.textContent = pad2(total % 60);
  }

  tick();
  setInterval(tick, 1000);
}

/* ─────────────────────────────────────────────
   MUSIC — spinning disc toggle
───────────────────────────────────────────── */
function setupMusic() {
  const audio = document.getElementById("bgMusic");
  const btn   = document.getElementById("musicToggle");
  if (!audio || !btn) return;

  let on = true;

  function render() {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Pause music" : "Play music");
  }

  async function tryPlay() {
    try { await audio.play(); on = true; }
    catch { on = false; }
    render();
  }

  btn.addEventListener("click", async () => {
    if (audio.paused) { try { await audio.play(); on = true; } catch { on = false; } }
    else              { audio.pause(); on = false; }
    render();
  });

  tryPlay();

  // Unlock autoplay on first gesture (mobile)
  window.addEventListener("pointerdown", async () => {
    if (!on) await tryPlay();
  }, { once: true });
}

/* ─────────────────────────────────────────────
   AUTO-SCROLL — always on, user can interrupt
   by scrolling/touching, resumes after 3 s
───────────────────────────────────────────── */
function setupAutoScroll() {
  if (prefersReduced) return;

  const PX_PER_SEC = 38;
  let on = true;
  let raf = 0;
  let lastTs = 0;
  let resumeTimer = 0;

  function atBottom() {
    return window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 4;
  }

  function loop(ts) {
    if (!on) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.06, (ts - lastTs) / 1000);
    lastTs = ts;
    if (atBottom()) { on = false; return; }
    window.scrollBy(0, PX_PER_SEC * dt);
    raf = requestAnimationFrame(loop);
  }

  function pause() {
    if (!on) return;
    on = false;
    clearTimeout(resumeTimer);
    // auto-resume after 3 seconds of inactivity
    resumeTimer = setTimeout(() => {
      if (!atBottom()) {
        on = true; lastTs = 0;
        raf = requestAnimationFrame(loop);
      }
    }, 3000);
  }

  raf = requestAnimationFrame(loop);

  window.addEventListener("wheel",       pause, { passive: true });
  window.addEventListener("touchstart",  pause, { passive: true });
  window.addEventListener("keydown",     pause);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { on = false; clearTimeout(resumeTimer); }
    else if (!atBottom()) { on = true; lastTs = 0; raf = requestAnimationFrame(loop); }
  });
  window.addEventListener("beforeunload", () => cancelAnimationFrame(raf));
}

/* ─────────────────────────────────────────────
   TOPBAR SCROLL TINT
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
setupParallax();
setupReveal();
setupCountdown();
setupMusic();
setupAutoScroll();
