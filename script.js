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
   MUSIC — spinning disc + floating notes
───────────────────────────────────────────── */
function setupMusic() {
  const audio = document.getElementById("bgMusic");
  const btn   = document.getElementById("musicToggle");
  if (!audio || !btn) return;

  audio.autoplay = true;
  audio.playsInline = true;

  let on = false;
  let userPaused = false;
  let hasUserInteracted = false;
  let noteTimer = null;
  let retryTimer = null;
  const NOTES = ["♪", "♫", "♩", "♬"];

  /* ── render disc state ── */
  function render() {
    const needsTapToUnmute = on && audio.muted;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("data-muted-lock", needsTapToUnmute ? "true" : "false");
    btn.setAttribute("aria-label", needsTapToUnmute ? "Tap to unmute music" : (on ? "Pause music" : "Play music"));
    if (on) startNotes(); else stopNotes();
  }

  /* ── floating note spawner ── */
  function spawnNote() {
    const note = document.createElement("span");
    note.className = "music-note";
    note.textContent = NOTES[Math.floor(Math.random() * NOTES.length)];
    const nx  = (Math.random() * 40 - 20).toFixed(1) + "px";
    const nr  = (Math.random() * 30 - 15).toFixed(1) + "deg";
    const nr2 = (Math.random() * 50 - 25).toFixed(1) + "deg";
    note.style.setProperty("--nx",  nx);
    note.style.setProperty("--nr",  nr);
    note.style.setProperty("--nr2", nr2);
    note.style.fontSize = (13 + Math.random() * 8).toFixed(0) + "px";
    document.body.appendChild(note);
    note.addEventListener("animationend", () => note.remove());
  }

  function startNotes() {
    stopNotes();
    spawnNote();
    noteTimer = setInterval(spawnNote, 700);
  }
  function stopNotes() {
    clearInterval(noteTimer);
    noteTimer = null;
  }

  /* ── play/pause ── */
  async function tryPlay({ keepMuted = false } = {}) {
    try {
      audio.muted = true;
      await audio.play();
      if (!keepMuted) {
        audio.muted = false;
        audio.volume = 1;
      }
      on = true;
    } catch {
      on = false;
    }
    render();
    return on;
  }

  async function tryPlayFromGesture() {
    try {
      audio.muted = false;
      audio.volume = 1;
      await audio.play();
      on = true;
    } catch {
      on = false;
    }
    render();
    return on;
  }

  btn.addEventListener("click", async () => {
    hasUserInteracted = true;
    if (audio.paused) {
      userPaused = false;
      try { await audio.play(); on = true; } catch { on = false; }
    } else {
      userPaused = true;
      audio.pause();
      on = false;
    }
    render();
  });

  function scheduleRetries() {
    clearInterval(retryTimer);
    retryTimer = setInterval(() => {
      if (on || userPaused) {
        clearInterval(retryTimer);
        retryTimer = null;
        return;
      }
      tryPlay();
    }, 2000);
  }

  /* ── autoplay bootstrap: force muted first-play on initial load ── */
  tryPlay({ keepMuted: true }).then((ok) => {
    if (!ok) scheduleRetries();
  });
  setTimeout(() => { if (!on && !userPaused) tryPlay({ keepMuted: true }); }, 120);
  setTimeout(() => { if (!on && !userPaused) tryPlay({ keepMuted: true }); }, 600);

  const unlockEvents = ["pointerdown", "touchstart", "keydown"];
  function unlock() {
    hasUserInteracted = true;
    if (!on && !userPaused) {
      tryPlayFromGesture();
    } else if (on && audio.muted && !userPaused) {
      audio.muted = false;
      audio.volume = 1;
    }
  }
  unlockEvents.forEach((e) => {
    window.addEventListener(e, unlock, { passive: true });
  });

  window.addEventListener("load", () => { if (!on && !userPaused) tryPlay(); }, { once: true });
  window.addEventListener("pageshow", () => { if (!on && !userPaused) tryPlay(); });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !on && !userPaused) {
      if (hasUserInteracted) {
        tryPlayFromGesture();
      } else {
        tryPlay();
      }
    }
  });
  window.addEventListener("beforeunload", () => clearInterval(retryTimer), { once: true });
}

/* ─────────────────────────────────────────────
   AUTO-SCROLL — always on, user can interrupt
   by scrolling/touching, resumes after 3 s
───────────────────────────────────────────── */
function setupAutoScroll() {
  if (prefersReduced) return;

  const PX_PER_SEC = 120;
  let on = false;
  let raf = 0;
  let lastTs = 0;
  let resumeTimer = 0;
  let speedFactor = 0;
  let isTouchHolding = false;

  function atBottom() {
    return window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 4;
  }

  function stopRaf() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function start() {
    if (on || atBottom()) return;
    on = true;
    lastTs = 0;
    speedFactor = 0;
    stopRaf();
    raf = requestAnimationFrame(loop);
  }

  function loop(ts) {
    if (!on) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.06, (ts - lastTs) / 1000);
    lastTs = ts;
    if (atBottom()) {
      on = false;
      stopRaf();
      return;
    }

    if (isTouchHolding) {
      raf = requestAnimationFrame(loop);
      return;
    }

    speedFactor = Math.min(1, speedFactor + dt * 0.5);
    window.scrollBy(0, PX_PER_SEC * speedFactor * dt);
    raf = requestAnimationFrame(loop);
  }

  function pause() {
    on = false;
    stopRaf();
  }

  start();

  function pauseThenResume(ms = 700) {
    pause();
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      if (!isTouchHolding && !atBottom()) start();
    }, ms);
  }

  window.addEventListener("wheel", () => pauseThenResume(900), { passive: true });
  window.addEventListener("keydown", () => pauseThenResume(1200));

  window.addEventListener("touchstart", () => {
    isTouchHolding = true;
    pause();
  }, { passive: true });
  window.addEventListener("touchmove", () => {
    isTouchHolding = true;
    pause();
  }, { passive: true });
  window.addEventListener("touchend", () => {
    isTouchHolding = false;
    clearTimeout(resumeTimer);
    if (!atBottom()) start();
  }, { passive: true });
  window.addEventListener("touchcancel", () => {
    isTouchHolding = false;
    clearTimeout(resumeTimer);
    if (!atBottom()) start();
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      on = false;
      clearTimeout(resumeTimer);
      stopRaf();
    } else if (!atBottom()) {
      if (!isTouchHolding) start();
    }
  });
  window.addEventListener("beforeunload", () => {
    clearTimeout(resumeTimer);
    stopRaf();
  });
}

/* ─────────────────────────────────────────────
   FLOWER RAIN (HERO)
───────────────────────────────────────────── */
function setupFlowerRain() {
  if (prefersReduced) return;

  const root = document.getElementById("flowerRain");
  if (!root) return;

  const PETALS = ["✿", "❀", "❁"];
  let timer = null;

  function spawnPetal() {
    const petal = document.createElement("span");
    petal.className = "flower-petal";
    petal.textContent = PETALS[Math.floor(Math.random() * PETALS.length)];
    petal.style.setProperty("--x", `${(Math.random() * 100).toFixed(2)}%`);
    petal.style.setProperty("--drift", `${(Math.random() * 90 - 45).toFixed(1)}px`);
    petal.style.setProperty("--rot", `${(Math.random() * 500 - 250).toFixed(1)}deg`);
    petal.style.setProperty("--dur", `${(7 + Math.random() * 6).toFixed(2)}s`);
    petal.style.setProperty("--delay", `${(Math.random() * 0.8).toFixed(2)}s`);
    petal.style.fontSize = `${(12 + Math.random() * 14).toFixed(0)}px`;
    root.appendChild(petal);
    petal.addEventListener("animationend", () => petal.remove(), { once: true });
  }

  for (let i = 0; i < 12; i += 1) spawnPetal();
  timer = setInterval(spawnPetal, 520);

  window.addEventListener("beforeunload", () => clearInterval(timer), { once: true });
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
setupFlowerRain();
