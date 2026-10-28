/* Hero instrument: a 4-mic square array estimating the bearing of a
   sound source from time-difference-of-arrival (TDOA). The pointer is
   the source; when idle it drifts on its own. */
(() => {
  "use strict";

  const arrayCv = document.getElementById("array");
  const traceCv = document.getElementById("traces");
  if (!arrayCv || !traceCv) return;

  const ax = arrayCv.getContext("2d");
  const tx = traceCv.getContext("2d");
  const out = {
    est: document.getElementById("r-est"),
    tru: document.getElementById("r-true"),
    dt: document.getElementById("r-dt"),
    src: document.getElementById("r-src"),
  };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const C = {
    bg: "#101210",
    grid: "rgba(184,245,200,0.07)",
    ink: "#b8f5c8",
    dim: "#3c5a44",
    signal: "#ff5b1f",
  };

  // Physical model for the readout: mic spacing 6 cm, speed of sound 343 m/s.
  const SPACING_M = 0.06;
  const SOUND = 343;
  const WAVE_PX_PER_MS = 0.32; // visual wave speed
  const EMIT_EVERY = 900;      // ms between siren pulses
  const NOISE_US = 2.5;        // timing jitter added to each arrival, in µs

  let W = 0, H = 0, TW = 0, TH = 0, dpr = 1;
  let mics = [], cx = 0, cy = 0, half = 0;

  const src = { x: 0, y: 0 };
  let pointer = null;     // {x,y} when user is driving
  let lastPointer = -1e9;
  let pulses = [];        // {x,y,t0, hits:[t|null...], done}
  let lastEmit = -1e9;
  const flash = [0, 0, 0, 0];
  const bursts = [[], [], [], []];
  const traces = [[], [], [], []];
  let estAngle = null;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = arrayCv.getBoundingClientRect();
    W = r.width; H = r.height;
    arrayCv.width = Math.round(W * dpr); arrayCv.height = Math.round(H * dpr);
    ax.setTransform(dpr, 0, 0, dpr, 0, 0);

    const t = traceCv.getBoundingClientRect();
    TW = t.width; TH = t.height;
    traceCv.width = Math.round(TW * dpr); traceCv.height = Math.round(TH * dpr);
    tx.setTransform(dpr, 0, 0, dpr, 0, 0);
    traces.forEach((buf) => { buf.length = 0; });

    cx = W / 2; cy = H / 2;
    half = Math.max(18, Math.min(W, H) * 0.075);
    mics = [
      { x: cx - half, y: cy - half }, // M1 top-left
      { x: cx + half, y: cy - half }, // M2 top-right
      { x: cx + half, y: cy + half }, // M3 bottom-right
      { x: cx - half, y: cy + half }, // M4 bottom-left
    ];
    if (!pointer) autoSource(performance.now());
  }

  function autoSource(now) {
    const t = now / 1000;
    src.x = cx + Math.cos(t * 0.37) * W * 0.36;
    src.y = cy + Math.sin(t * 0.53) * H * 0.34;
  }

  const gauss = () => {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const pxToUs = (px) => (px * (SPACING_M / (2 * half)) / SOUND) * 1e6;
  const deg = (rad) => ((rad * 180 / Math.PI) + 360) % 360;

  function emit(now) {
    const p = { x: src.x, y: src.y, t0: now, hits: [null, null, null, null], arr: [] };
    // Exact arrival times (ms) from geometry; jitter is added in estimate().
    p.arr = mics.map((m) => {
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      return now + d / WAVE_PX_PER_MS;
    });
    pulses.push(p);
  }

  function estimate(p) {
    // Convert arrival delays to µs, add jitter as a real sensor would.
    const us = p.arr.map((t) => pxToUs((t - p.t0) * WAVE_PX_PER_MS) + gauss() * NOISE_US);
    // Far-field TDOA on two orthogonal pairs of pairs.
    const dx = ((us[0] + us[3]) - (us[1] + us[2])) / 2; // >0 → source to the right
    const dy = ((us[0] + us[1]) - (us[2] + us[3])) / 2; // >0 → source below
    const est = Math.atan2(-dy, dx);
    const tru = Math.atan2(-(p.y - cy), p.x - cx);
    estAngle = est;
    out.est.textContent = deg(est).toFixed(1).padStart(5, "0") + "°";
    out.tru.textContent = deg(tru).toFixed(1).padStart(5, "0") + "°";
    out.dt.textContent = `${fmtUs(dx)} / ${fmtUs(-dy)} µs`;
  }
  const fmtUs = (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(0).padStart(3, "0");

  /* ---------- Drawing ---------- */
  function drawGrid() {
    ax.fillStyle = C.bg;
    ax.fillRect(0, 0, W, H);
    ax.strokeStyle = C.grid;
    ax.lineWidth = 1;
    const step = Math.max(24, W / 16);
    ax.beginPath();
    for (let x = cx % step; x < W; x += step) { ax.moveTo(x + .5, 0); ax.lineTo(x + .5, H); }
    for (let y = cy % step; y < H; y += step) { ax.moveTo(0, y + .5); ax.lineTo(W, y + .5); }
    ax.stroke();

    // Polar rings around the array
    ax.strokeStyle = "rgba(184,245,200,0.12)";
    [2.4, 4.4, 6.6].forEach((k) => {
      ax.beginPath(); ax.arc(cx, cy, half * k, 0, Math.PI * 2); ax.stroke();
    });
    ax.fillStyle = C.dim;
    ax.font = "10px 'IBM Plex Mono', monospace";
    ax.textAlign = "center";
    [["0°", 1, 0], ["90°", 0, -1], ["180°", -1, 0], ["270°", 0, 1]].forEach(([l, ux, uy]) => {
      ax.fillText(l, cx + ux * half * 6.6 + ux * 18, cy + uy * half * 6.6 + uy * 14 + 3);
    });
  }

  function drawWaves(now) {
    const maxR = Math.hypot(W, H);
    pulses.forEach((p) => {
      const r0 = (now - p.t0) * WAVE_PX_PER_MS;
      for (let k = 0; k < 3; k++) {
        const r = r0 - k * 9;
        if (r <= 0) continue;
        const a = Math.max(0, 1 - r / (maxR * 0.7)) * (1 - k * 0.3);
        ax.strokeStyle = `rgba(255,91,31,${a * 0.75})`;
        ax.lineWidth = 1.5 - k * 0.4;
        ax.beginPath(); ax.arc(p.x, p.y, r, 0, Math.PI * 2); ax.stroke();
      }
    });
  }

  function drawBearing() {
    if (estAngle == null) return;
    const len = half * 6.6;
    const ex = cx + Math.cos(estAngle) * len;
    const ey = cy - Math.sin(estAngle) * len;
    const g = ax.createLinearGradient(cx, cy, ex, ey);
    g.addColorStop(0, "rgba(255,91,31,0.9)");
    g.addColorStop(1, "rgba(255,91,31,0)");
    ax.strokeStyle = g; ax.lineWidth = 2;
    ax.beginPath(); ax.moveTo(cx, cy); ax.lineTo(ex, ey); ax.stroke();

    // Uncertainty wedge
    ax.fillStyle = "rgba(255,91,31,0.08)";
    ax.beginPath(); ax.moveTo(cx, cy);
    ax.arc(cx, cy, len, -estAngle - 0.09, -estAngle + 0.09);
    ax.closePath(); ax.fill();
  }

  function drawMics() {
    ax.strokeStyle = "rgba(184,245,200,0.25)";
    ax.setLineDash([3, 4]);
    ax.strokeRect(cx - half, cy - half, half * 2, half * 2);
    ax.setLineDash([]);
    ax.font = "600 10px 'IBM Plex Mono', monospace";
    ax.textAlign = "center";
    mics.forEach((m, i) => {
      const f = flash[i];
      if (f > 0.01) {
        ax.fillStyle = `rgba(255,91,31,${f * 0.35})`;
        ax.beginPath(); ax.arc(m.x, m.y, 7 + f * 10, 0, Math.PI * 2); ax.fill();
      }
      ax.fillStyle = f > 0.3 ? C.signal : C.ink;
      ax.beginPath(); ax.arc(m.x, m.y, 4.5, 0, Math.PI * 2); ax.fill();
      ax.fillStyle = C.dim;
      const oy = i < 2 ? -12 : 20;
      ax.fillText("M" + (i + 1), m.x, m.y + oy);
    });
  }

  function drawSource(now) {
    const pulse = 1 + Math.sin(now / 120) * 0.15;
    ax.fillStyle = C.signal;
    ax.beginPath(); ax.arc(src.x, src.y, 5 * pulse, 0, Math.PI * 2); ax.fill();
    ax.strokeStyle = "rgba(255,91,31,0.5)";
    ax.lineWidth = 1;
    ax.beginPath(); ax.moveTo(src.x - 14, src.y); ax.lineTo(src.x - 8, src.y);
    ax.moveTo(src.x + 8, src.y); ax.lineTo(src.x + 14, src.y);
    ax.moveTo(src.x, src.y - 14); ax.lineTo(src.x, src.y - 8);
    ax.moveTo(src.x, src.y + 8); ax.lineTo(src.x, src.y + 14); ax.stroke();
  }

  /* ---------- Oscilloscope traces ---------- */
  const SAMPLE_MS = 5;
  let lastSample = 0;

  function sampleTraces(now) {
    if (!lastSample) lastSample = now;
    const max = Math.ceil(TW);
    while (lastSample < now) {
      lastSample += SAMPLE_MS;
      for (let c = 0; c < 4; c++) {
        let v = gauss() * 0.04;
        const bs = bursts[c];
        for (let b = bs.length - 1; b >= 0; b--) {
          const dt = lastSample - bs[b];
          if (dt < 0) continue;
          if (dt > 260) { bs.splice(b, 1); continue; }
          v += Math.sin(dt * 0.55) * Math.exp(-dt / 70) * 0.9;
        }
        traces[c].push(v);
        if (traces[c].length > max) traces[c].shift();
      }
    }
  }

  function drawTraces() {
    tx.fillStyle = C.bg;
    tx.fillRect(0, 0, TW, TH);
    const row = TH / 4;
    tx.font = "9px 'IBM Plex Mono', monospace";
    for (let c = 0; c < 4; c++) {
      const mid = row * c + row / 2;
      tx.strokeStyle = "rgba(184,245,200,0.08)";
      tx.beginPath(); tx.moveTo(0, mid + .5); tx.lineTo(TW, mid + .5); tx.stroke();
      const buf = traces[c];
      const off = TW - buf.length;
      tx.strokeStyle = flash[c] > 0.2 ? C.signal : C.ink;
      tx.lineWidth = 1.2;
      tx.beginPath();
      for (let i = 0; i < buf.length; i++) {
        const y = mid - Math.max(-1, Math.min(1, buf[i])) * row * 0.42;
        i ? tx.lineTo(off + i, y) : tx.moveTo(off + i, y);
      }
      tx.stroke();
      tx.fillStyle = C.dim;
      tx.fillText("CH" + (c + 1), 6, row * c + 11);
    }
  }

  /* ---------- Loop ---------- */
  function step(now) {
    if (!pointer || now - lastPointer > 2500) {
      if (pointer) { pointer = null; out.src.textContent = "AUTO"; }
      autoSource(now);
    }

    if (now - lastEmit > EMIT_EVERY) { emit(now); lastEmit = now; }

    pulses.forEach((p) => {
      p.arr.forEach((t, i) => {
        if (p.hits[i] == null && now >= t) {
          p.hits[i] = t;
          flash[i] = 1;
          bursts[i].push(t);
        }
      });
      if (!p.done && p.hits.every((h) => h != null)) { p.done = true; estimate(p); }
    });
    const maxR = Math.hypot(W, H);
    pulses = pulses.filter((p) => (now - p.t0) * WAVE_PX_PER_MS < maxR);
    for (let i = 0; i < 4; i++) flash[i] *= 0.9;

    drawGrid();
    drawBearing();
    drawWaves(now);
    drawMics();
    drawSource(now);
    sampleTraces(now);
    drawTraces();
  }

  // Reduced motion: no animation, recompute and redraw on input only.
  function staticFrame() {
    const now = performance.now();
    const p = { x: src.x, y: src.y, t0: now, hits: [], arr: [] };
    p.arr = mics.map((m) => now + Math.hypot(m.x - p.x, m.y - p.y) / WAVE_PX_PER_MS);
    estimate(p);
    drawGrid(); drawBearing(); drawMics(); drawSource(0);
    drawTraces();
  }

  let running = false, raf = 0;
  function loop(now) { step(now); raf = requestAnimationFrame(loop); }
  function start() { if (!running && !reduceMotion) { running = true; lastSample = 0; raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  /* ---------- Input ---------- */
  function setPointer(e) {
    const r = arrayCv.getBoundingClientRect();
    src.x = Math.max(0, Math.min(W, e.clientX - r.left));
    src.y = Math.max(0, Math.min(H, e.clientY - r.top));
    pointer = { x: src.x, y: src.y };
    lastPointer = performance.now();
    out.src.textContent = "YOU";
    if (reduceMotion) staticFrame();
  }
  arrayCv.addEventListener("pointermove", setPointer);
  arrayCv.addEventListener("pointerdown", (e) => { setPointer(e); arrayCv.setPointerCapture?.(e.pointerId); });

  new ResizeObserver(() => { resize(); if (reduceMotion) staticFrame(); }).observe(arrayCv);
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(arrayCv);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  resize();
  if (reduceMotion) staticFrame();
})();
