/* Outils partagés par tous les exercices : SVG, papier, réglages mémorisés, hasard reproductible. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const C = (window.Cahier = { exercises: {}, order: [] });

  C.$ = id => document.getElementById(id);

  C.el = function (name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  C.register = function (ex) {
    C.exercises[ex.id] = ex;
    C.order.push(ex.id);
  };

  /* ---------- Papier ---------- */
  const PAPERS = {
    letter: { w: 215.9, h: 279.4, css: "letter", label: "US Letter (8,5 × 11 po)" },
    a4: { w: 210, h: 297, css: "A4", label: "A4" },
  };

  C.paper = {
    PAPERS,
    get: key => PAPERS[key] || PAPERS.letter,
    /** Indique au moteur d'impression le format de la page active. */
    setPrintSize(key) {
      C.$("pageRule").textContent = `@page { size: ${C.paper.get(key).css}; margin: 0; }`;
    },
    /** Remplit un <select> avec les formats disponibles. */
    fillSelect(select) {
      select.innerHTML = Object.entries(PAPERS).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join("");
    },
    /**
     * Crée une page vierge et l'ajoute au conteneur.
     * opts.ruling : "seyes" | "grid" | "none" ; opts.interval (Seyès, mm) ; opts.cell (quadrillage, mm)
     */
    newPage(container, key, opts = {}) {
      const P = C.paper.get(key);
      const W = P.w, H = P.h;
      const top = opts.top ?? 14, bottom = H - 10, marginX = opts.marginX ?? 25;
      const div = document.createElement("div");
      div.className = "page";
      div.style.width = W + "mm";
      div.style.height = H + "mm";
      const svg = C.el("svg", { viewBox: `0 0 ${W} ${H}`, xmlns: NS, width: W + "mm", height: H + "mm" });
      div.appendChild(svg);

      if (opts.ruling === "seyes") {
        const iv = opts.interval || 2, big = iv * 4;
        let k = 0;
        for (let y = top; y <= bottom + 0.01; y += iv, k++) {
          const thick = k % 4 === 0;
          C.el("line", { x1: 0, x2: W, y1: y, y2: y, stroke: thick ? "#8f9fd6" : "#c3cdf0", "stroke-width": thick ? 0.3 : 0.15 }, svg);
        }
        for (let x = marginX + big; x < W; x += big) {
          C.el("line", { x1: x, x2: x, y1: top, y2: bottom, stroke: "#c3cdf0", "stroke-width": 0.15 }, svg);
        }
      } else if (opts.ruling === "grid") {
        const cell = opts.cell || 5;
        for (let y = top; y <= bottom + 0.01; y += cell) {
          C.el("line", { x1: 0, x2: W, y1: y, y2: y, stroke: "#c3cdf0", "stroke-width": 0.18 }, svg);
        }
        for (let x = marginX % cell; x < W; x += cell) {
          C.el("line", { x1: x, x2: x, y1: top, y2: bottom, stroke: "#c3cdf0", "stroke-width": 0.18 }, svg);
        }
      }
      if (opts.ruling && opts.ruling !== "none") {
        C.el("line", { x1: marginX, x2: marginX, y1: 0, y2: H, stroke: "#e8838f", "stroke-width": 0.35 }, svg);
      }
      container.appendChild(div);
      return { div, svg, W, H, top, bottom, marginX };
    },
    /** Ligne « Prénom / Date » en haut de page. */
    header(svg, x, y) {
      C.el("text", { x, y, "font-family": "Segoe UI, sans-serif", "font-size": 4, fill: "#5d6679" }, svg)
        .textContent = "Prénom : ..............................          Date : ....................";
    },
  };

  /* ---------- Réglages mémorisés ---------- */
  C.store = {
    load(key, ids, prefix) {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "{}");
        for (const id of ids) {
          if (!(id in saved)) continue;
          const e = C.$(prefix + id);
          if (!e) continue;
          if (e.type === "checkbox") e.checked = saved[id]; else e.value = saved[id];
        }
      } catch (e) { /* réglages illisibles : on garde les valeurs par défaut */ }
    },
    save(key, ids, prefix) {
      try {
        const data = {};
        for (const id of ids) {
          const e = C.$(prefix + id);
          if (e) data[id] = e.type === "checkbox" ? e.checked : e.value;
        }
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) { /* stockage indisponible */ }
    },
    get(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch (e) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) {} },
  };

  /** Relie tous les champs d'un panneau : mémorisation + rendu différé. */
  C.bindPanel = function (panel, onChange) {
    let timer;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(onChange, 150); };
    panel.querySelectorAll("input, textarea, select").forEach(e => {
      e.addEventListener("input", schedule);
      e.addEventListener("change", schedule);
    });
  };

  /* ---------- Hasard reproductible (même graine = mêmes calculs) ---------- */
  C.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- Mesure de texte ---------- */
  const ctx = document.createElement("canvas").getContext("2d");
  C.measure = function (text, family, weight = 400) {
    ctx.font = `${weight} 100px ${family.includes('"') ? family : `"${family}"`}, sans-serif`;
    return ctx.measureText(text);
  };

  /* ---------- Message court en bas de fenêtre ---------- */
  let toastTimer;
  C.toast = function (msg) {
    const t = C.$("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 4000);
  };
})();
