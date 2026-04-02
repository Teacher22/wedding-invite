const TO_EMAIL = "you@example.com";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function setupMusic() {
  const audio = document.getElementById("bgMusic");
  const btn = document.getElementById("musicToggle");
  const text = document.getElementById("musicText");
  if (!audio || !btn) return;

  let isOn = true;

  function render() {
    btn.setAttribute("aria-pressed", isOn ? "true" : "false");
    if (text) text.textContent = isOn ? "Music: On" : "Music: Off";
  }

  async function tryPlay() {
    try {
      await audio.play();
      isOn = true;
      render();
    } catch {
      // Autoplay may be blocked; user gesture will unlock.
      isOn = false;
      render();
    }
  }

  btn.addEventListener("click", async () => {
    if (audio.paused) {
      try {
        await audio.play();
        isOn = true;
      } catch {
        isOn = false;
      }
    } else {
      audio.pause();
      isOn = false;
    }
    render();
  });

  // Best effort autoplay on load
  tryPlay();

  // One-time fallback: first user gesture attempts to start music.
  const unlock = async () => {
    if (!isOn) await tryPlay();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function startCountdown() {
  const root = document.querySelector("[data-countdown]");
  if (!root) return;

  const dateAttr = root.getAttribute("data-date");
  const target = dateAttr ? new Date(dateAttr) : null;
  if (!target || Number.isNaN(target.getTime())) return;

  const daysEl = root.querySelector("[data-days]");
  const hoursEl = root.querySelector("[data-hours]");
  const minutesEl = root.querySelector("[data-minutes]");
  const secondsEl = root.querySelector("[data-seconds]");

  function tick() {
    const now = new Date();
    const diff = Math.max(0, target.getTime() - now.getTime());

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (daysEl) daysEl.textContent = pad2(days);
    if (hoursEl) hoursEl.textContent = pad2(hours);
    if (minutesEl) minutesEl.textContent = pad2(minutes);
    if (secondsEl) secondsEl.textContent = pad2(seconds);
  }

  tick();
  window.setInterval(tick, 1000);
}

function setupDotsObserver() {
  const dots = document.querySelectorAll(".dots__dot[data-dot]");
  if (!dots.length) return;

  const byId = new Map();
  for (const dot of dots) byId.set(dot.getAttribute("data-dot"), dot);

  const sections = [
    document.querySelector(".scene--hero"),
    document.querySelector("#story"),
    document.querySelector("#countdown"),
    document.querySelector("#events"),
    document.querySelector("#rsvp"),
  ].filter(Boolean);

  const obs = new IntersectionObserver(
    (entries) => {
      let best = null;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
      }
      if (!best) return;

      const id =
        best.target.id ||
        (best.target.classList.contains("scene--hero") ? "home" : "");
      if (!id) return;

      for (const dot of dots) dot.removeAttribute("aria-current");
      const active = byId.get(id);
      if (active) active.setAttribute("aria-current", "true");
    },
    { threshold: [0.35, 0.5, 0.65] }
  );

  for (const s of sections) obs.observe(s);
}

function setupWishForm() {
  const form = document.getElementById("wishForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const message = String(fd.get("message") || "").trim();
    if (!name || !message) return;

    const subject = encodeURIComponent(`Wedding wishes from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}`);

    // GitHub Pages-friendly: no backend needed.
    window.location.href = `mailto:${encodeURIComponent(
      TO_EMAIL
    )}?subject=${subject}&body=${body}`;
  });
}

setupMusic();
startCountdown();
setupDotsObserver();
setupWishForm();

