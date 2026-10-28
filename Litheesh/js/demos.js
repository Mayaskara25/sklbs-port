/* Small demos inside the project write-ups:
   - road graph that reroutes when you close a road (Dijkstra)
   - Git-style blob hasher (SHA-1) for the mini VCS */
(() => {
  "use strict";

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= Rerouting ================= */
  const cv = document.getElementById("route-cv");
  if (cv) {
    const ctx = cv.getContext("2d");
    const read = document.getElementById("route-read");
    const COLS = 7, ROWS = 5;
    const M_PER_UNIT = 310; // pretend scale for the readout

    // Seeded jitter so the "city" looks the same every visit.
    let seed = 27;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    const nodes = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        nodes.push({ c, r, jx: (rand() - 0.5) * 0.5, jy: (rand() - 0.5) * 0.5, x: 0, y: 0 });
      }
    }
    const id = (c, r) => r * COLS + c;
    const edges = [];
    const addEdge = (a, b) => edges.push({ a, b, closed: false, w: 0 });
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (c < COLS - 1) addEdge(id(c, r), id(c + 1, r));
        if (r < ROWS - 1 && rand() > 0.12) addEdge(id(c, r), id(c, r + 1));
        if (c < COLS - 1 && r < ROWS - 1 && rand() > 0.78) addEdge(id(c, r), id(c + 1, r + 1));
      }
    }
    const START = id(0, 2), END = id(COLS - 1, 2);

    let W = 0, H = 0, dpr = 1, baseLen = 0;
    let route = [];

    function layout() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const b = cv.getBoundingClientRect();
      W = b.width; H = b.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const px = W * 0.08, py = H * 0.1;
      const sx = (W - 2 * px) / (COLS - 1), sy = (H - 2 * py) / (ROWS - 1);
      nodes.forEach((n) => {
        const edge = n.c === 0 || n.c === COLS - 1;
        n.x = px + (n.c + (edge ? 0 : n.jx)) * sx;
        n.y = py + (n.r + n.jy) * sy;
      });
      // Weights in grid units so they don't depend on canvas size.
      edges.forEach((e) => {
        const A = nodes[e.a], B = nodes[e.b];
        e.w = Math.hypot((A.x - B.x) / sx, (A.y - B.y) / sy);
      });
    }

    function dijkstra() {
      const dist = new Array(nodes.length).fill(Infinity);
      const prev = new Array(nodes.length).fill(-1);
      const prevEdge = new Array(nodes.length).fill(-1);
      const done = new Array(nodes.length).fill(false);
      dist[START] = 0;
      const adj = nodes.map(() => []);
      edges.forEach((e, i) => {
        if (e.closed) return;
        adj[e.a].push([e.b, e.w, i]);
        adj[e.b].push([e.a, e.w, i]);
      });
      // Graph is tiny, so a linear scan beats a heap here.
      for (;;) {
        let u = -1, best = Infinity;
        for (let i = 0; i < nodes.length; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
        if (u === -1 || u === END) break;
        done[u] = true;
        for (const [v, w, ei] of adj[u]) {
          if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; prevEdge[v] = ei; }
        }
      }
      if (!isFinite(dist[END])) return { path: [], len: Infinity };
      const path = [];
      for (let v = END; v !== START; v = prev[v]) path.unshift(prevEdge[v]);
      return { path, len: dist[END] };
    }

    function solve() {
      const t0 = performance.now();
      const res = dijkstra();
      const ms = performance.now() - t0;
      route = res.path;
      const closed = edges.filter((e) => e.closed).length;
      if (!route.length) {
        read.textContent = `NO ROUTE · ${closed} closed`;
      } else {
        const m = Math.round(res.len * M_PER_UNIT);
        const extra = baseLen ? Math.round((res.len / baseLen - 1) * 100) : 0;
        const time = ms < 0.1 ? "<0.1" : ms.toFixed(1);
        read.textContent = `${(m / 1000).toFixed(2)} km · ${extra > 0 ? "+" + extra + "%" : "optimal"} · ${closed} closed · ${time} ms`;
      }
      if (reduceMotion) draw(0);
    }

    function draw(now) {
      ctx.fillStyle = "#101210";
      ctx.fillRect(0, 0, W, H);
      const onRoute = new Set(route);

      ctx.lineCap = "round";
      edges.forEach((e, i) => {
        const A = nodes[e.a], B = nodes[e.b];
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
        if (e.closed) {
          ctx.setLineDash([4, 5]); ctx.strokeStyle = "rgba(255,91,31,0.55)"; ctx.lineWidth = 2;
        } else if (onRoute.has(i)) {
          ctx.setLineDash([]); ctx.strokeStyle = "#ff5b1f"; ctx.lineWidth = 4;
        } else {
          ctx.setLineDash([]); ctx.strokeStyle = "rgba(184,245,200,0.22)"; ctx.lineWidth = 2;
        }
        ctx.stroke();
        if (e.closed) {
          const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
          ctx.setLineDash([]); ctx.strokeStyle = "#ff5b1f"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(mx - 4, my - 4); ctx.lineTo(mx + 4, my + 4);
          ctx.moveTo(mx + 4, my - 4); ctx.lineTo(mx - 4, my + 4); ctx.stroke();
        }
      });
      ctx.setLineDash([]);

      nodes.forEach((n, i) => {
        const end = i === START || i === END;
        ctx.fillStyle = end ? "#ff5b1f" : "rgba(184,245,200,0.55)";
        ctx.beginPath(); ctx.arc(n.x, n.y, end ? 6 : 2.5, 0, Math.PI * 2); ctx.fill();
      });
      ctx.font = "600 10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "#b8f5c8";
      ctx.textAlign = "left";
      ctx.fillText("A", nodes[START].x + 9, nodes[START].y - 8);
      ctx.textAlign = "right";
      ctx.fillText("B", nodes[END].x - 9, nodes[END].y - 8);

      // Traffic pulses moving along the current route.
      if (!reduceMotion && route.length) {
        const pts = [nodes[START]];
        let cur = START;
        route.forEach((ei) => { const e = edges[ei]; cur = e.a === cur ? e.b : e.a; pts.push(nodes[cur]); });
        const segs = [];
        let total = 0;
        for (let i = 1; i < pts.length; i++) {
          const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
          segs.push(l); total += l;
        }
        for (let k = 0; k < 3; k++) {
          let d = ((now * 0.08) + (k * total) / 3) % total;
          let i = 0;
          while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
          const t = d / segs[i];
          const x = pts[i].x + (pts[i + 1].x - pts[i].x) * t;
          const y = pts[i].y + (pts[i + 1].y - pts[i].y) * t;
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    function segDist(px, py, A, B) {
      const dx = B.x - A.x, dy = B.y - A.y;
      const t = Math.max(0, Math.min(1, ((px - A.x) * dx + (py - A.y) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(px - (A.x + t * dx), py - (A.y + t * dy));
    }

    cv.addEventListener("click", (ev) => {
      const b = cv.getBoundingClientRect();
      const x = ev.clientX - b.left, y = ev.clientY - b.top;
      let best = -1, bd = 16;
      edges.forEach((e, i) => {
        const d = segDist(x, y, nodes[e.a], nodes[e.b]);
        if (d < bd) { bd = d; best = i; }
      });
      if (best < 0) return;
      edges[best].closed = !edges[best].closed;
      solve();
    });

    document.getElementById("route-reset").addEventListener("click", () => {
      edges.forEach((e) => { e.closed = false; });
      solve();
    });

    let raf = 0, running = false;
    const loop = (now) => { draw(now); raf = requestAnimationFrame(loop); };
    const start = () => { if (!running && !reduceMotion) { running = true; raf = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    new ResizeObserver(() => { layout(); if (reduceMotion) draw(0); }).observe(cv);
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(cv);

    layout();
    baseLen = dijkstra().len;
    solve();
  }

  /* ================= Blob hasher ================= */
  const input = document.getElementById("blob-in");
  const output = document.getElementById("blob-out");
  if (input && output) {
    // Compact SHA-1; runs anywhere, including file:// where crypto.subtle may be missing.
    function sha1(bytes) {
      const ml = bytes.length;
      const withPad = ((ml + 9 + 63) >> 6) << 6;
      const buf = new Uint8Array(withPad);
      buf.set(bytes);
      buf[ml] = 0x80;
      const view = new DataView(buf.buffer);
      view.setUint32(withPad - 4, (ml * 8) >>> 0);
      view.setUint32(withPad - 8, Math.floor((ml * 8) / 2 ** 32));

      let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
      const w = new Uint32Array(80);
      const rotl = (x, n) => (x << n) | (x >>> (32 - n));
      for (let off = 0; off < withPad; off += 64) {
        for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
        for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
        let a = h0, b = h1, c = h2, d = h3, e = h4;
        for (let i = 0; i < 80; i++) {
          let f, k;
          if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
          else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
          else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
          else { f = b ^ c ^ d; k = 0xca62c1d6; }
          const t = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
          e = d; d = c; c = rotl(b, 30) >>> 0; b = a; a = t;
        }
        h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0;
        h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
      }
      return [h0, h1, h2, h3, h4].map((h) => h.toString(16).padStart(8, "0")).join("");
    }

    const enc = new TextEncoder();
    let prev = "";

    function blobHash(text) {
      const body = enc.encode(text);
      const head = enc.encode(`blob ${body.length}\0`);
      const all = new Uint8Array(head.length + body.length);
      all.set(head); all.set(body, head.length);
      return sha1(all);
    }

    function render() {
      const h = blobHash(input.value);
      // Highlight the hex digits that changed since the last keystroke.
      const chars = [...h].map((ch, i) =>
        prev && prev[i] !== ch ? `<span class="flip">${ch}</span>` : ch);
      output.innerHTML = `.git/objects/<b>${chars.slice(0, 2).join("")}</b>/${chars.slice(2).join("")}`;
      prev = h;
    }

    input.addEventListener("input", render);
    render();
  }
})();
